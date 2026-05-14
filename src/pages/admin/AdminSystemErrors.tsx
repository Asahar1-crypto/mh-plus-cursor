import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

interface SystemError {
  id: string;
  created_at: string;
  function_name: string;
  error_category: string;
  error_code: string | null;
  user_message: string;
  raw_details: unknown;
  request_metadata: unknown;
  http_status: number | null;
  user_id: string | null;
  account_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; tone: 'critical' | 'warn' | 'info' }> = {
  openai_quota: { label: 'OpenAI – חרגה ממכסה', tone: 'critical' },
  openai_rate_limit: { label: 'OpenAI – עומס', tone: 'warn' },
  openai_auth: { label: 'OpenAI – אימות', tone: 'critical' },
  openai_model: { label: 'OpenAI – מודל', tone: 'critical' },
  openai_other: { label: 'OpenAI – אחר', tone: 'warn' },
  image_unreadable: { label: 'תמונה לא קריאה', tone: 'info' },
  validation: { label: 'ולידציה', tone: 'info' },
  auth_failed: { label: 'אימות משתמש', tone: 'info' },
  authz_failed: { label: 'הרשאה', tone: 'warn' },
  db_error: { label: 'מסד נתונים', tone: 'critical' },
  config_missing: { label: 'תצורה חסרה', tone: 'critical' },
  unknown: { label: 'לא ידוע', tone: 'warn' },
};

const categoryBadge = (category: string) => {
  const info = CATEGORY_LABELS[category] ?? { label: category, tone: 'info' as const };
  const className =
    info.tone === 'critical' ? 'bg-red-500 hover:bg-red-500/90'
    : info.tone === 'warn' ? 'bg-orange-500 hover:bg-orange-500/90'
    : 'bg-slate-500 hover:bg-slate-500/90';
  return <Badge className={`${className} text-white`}>{info.label}</Badge>;
};

const AdminSystemErrors: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SystemError | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<'open' | 'resolved' | 'all'>('open');

  if (!user || !profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      setRows((data ?? []) as SystemError[]);
    } catch (err: any) {
      toast({
        title: 'שגיאה',
        description: err.message ?? 'לא ניתן לטעון את יומן השגיאות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterCategory !== 'all' && r.error_category !== filterCategory) return false;
      if (filterFunction !== 'all' && r.function_name !== filterFunction) return false;
      if (filterResolved === 'open' && r.resolved_at) return false;
      if (filterResolved === 'resolved' && !r.resolved_at) return false;
      return true;
    });
  }, [rows, filterCategory, filterFunction, filterResolved]);

  const functions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.function_name))).sort(),
    [rows],
  );
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.error_category))).sort(),
    [rows],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => !r.resolved_at).length;
    const critical = rows.filter((r) => {
      const tone = CATEGORY_LABELS[r.error_category]?.tone;
      return tone === 'critical' && !r.resolved_at;
    }).length;
    const last24h = rows.filter(
      (r) => new Date(r.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    ).length;
    return { total, open, critical, last24h };
  }, [rows]);

  const openDetail = (row: SystemError) => {
    setSelected(row);
    setResolutionNote(row.resolution_note ?? '');
  };

  const markResolved = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_errors')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_note: resolutionNote || null,
        })
        .eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'סומן כטופל' });
      setSelected(null);
      await fetchErrors();
    } catch (err: any) {
      toast({
        title: 'שגיאה',
        description: err.message ?? 'לא ניתן לעדכן',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_errors')
        .update({
          resolved_at: null,
          resolved_by: null,
        })
        .eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'נפתח מחדש' });
      setSelected(null);
      await fetchErrors();
    } catch (err: any) {
      toast({
        title: 'שגיאה',
        description: err.message ?? 'לא ניתן לעדכן',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          <h1 className="text-xl sm:text-3xl font-bold">שגיאות מערכת</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          רענון
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ ב-300 אחרונות</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">פתוחות</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">קריטיות פתוחות</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ב-24 שעות</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last24h}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="w-4 h-4" />
            סינון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterResolved} onValueChange={(v) => setFilterResolved(v as typeof filterResolved)}>
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">פתוחות בלבד</SelectItem>
                <SelectItem value="resolved">טופלו</SelectItem>
                <SelectItem value="all">הכל</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]?.label ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFunction} onValueChange={setFilterFunction}>
              <SelectTrigger>
                <SelectValue placeholder="פונקציה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפונקציות</SelectItem>
                {functions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>שגיאות אחרונות ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">תאריך</TableHead>
                  <TableHead className="text-xs sm:text-sm">פונקציה</TableHead>
                  <TableHead className="text-xs sm:text-sm">קטגוריה</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">קוד</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">HTTP</TableHead>
                  <TableHead className="text-xs sm:text-sm">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(r)}
                  >
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {format(new Date(r.created_at), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">{r.function_name}</TableCell>
                    <TableCell>{categoryBadge(r.error_category)}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      {r.error_code ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{r.http_status ?? '-'}</TableCell>
                    <TableCell>
                      {r.resolved_at ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />טופל
                        </Badge>
                      ) : (
                        <Badge variant="secondary">פתוח</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>אין שגיאות תואמות לסינון</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" dir="rtl">
          {selected && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="flex items-center gap-2">
                  {categoryBadge(selected.error_category)}
                  <span className="font-mono text-sm">{selected.function_name}</span>
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm:ss')} · HTTP{' '}
                  {selected.http_status ?? '-'} · קוד: {selected.error_code ?? '—'}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto space-y-4 px-1">
                <div>
                  <div className="text-sm font-medium mb-1">הודעה שהוצגה למשתמש</div>
                  <p className="text-sm bg-muted/40 rounded-md p-3">{selected.user_message}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">פרטים גולמיים (raw_details)</div>
                  <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap" dir="ltr">
                    {JSON.stringify(selected.raw_details, null, 2)}
                  </pre>
                </div>

                {selected.request_metadata != null && (
                  <div>
                    <div className="text-sm font-medium mb-1">מטא-נתוני בקשה</div>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap" dir="ltr">
                      {JSON.stringify(selected.request_metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">משתמש</div>
                    <div className="font-mono">{selected.user_id ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">חשבון</div>
                    <div className="font-mono">{selected.account_id ?? '—'}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">הערת טיפול</label>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="מה עשית כדי לפתור / מה זה היה"
                    rows={3}
                  />
                </div>

                {selected.resolved_at && (
                  <div className="text-xs text-muted-foreground">
                    טופל ב-{format(new Date(selected.resolved_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                {selected.resolved_at ? (
                  <Button variant="outline" onClick={reopen} disabled={saving}>
                    פתח מחדש
                  </Button>
                ) : (
                  <Button onClick={markResolved} disabled={saving}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    סמן כטופל
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  סגירה
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSystemErrors;
