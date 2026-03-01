import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Phone, CheckCircle, XCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

interface SmsLog {
  id: string;
  phone_number: string;
  code: string;
  verification_type: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  expires_at: string;
  attempts: number;
}

interface ExpenseNotification {
  id: string;
  expense_id: string;
  recipient_phone: string | null;
  recipient_user_id: string | null;
  status: string;
  sent_at: string;
  error_message: string | null;
  notification_type: string;
}

const AdminSmsLogs: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [expenseNotifs, setExpenseNotifs] = useState<ExpenseNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is super admin
  if (!user || !profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchSmsLogs();
    fetchExpenseNotifications();
  }, []);

  const fetchSmsLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSmsLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching SMS logs:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את נתוני הSMS',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseNotifications = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = yesterday.toISOString();
      const todayEnd = new Date(today);
      todayEnd.setDate(todayEnd.getDate() + 1);
      todayEnd.setMilliseconds(-1);
      const todayEndStr = todayEnd.toISOString();

      const { data, error } = await supabase
        .from('expense_notifications')
        .select('*')
        .eq('notification_type', 'sms')
        .gte('sent_at', yesterdayStart)
        .lte('sent_at', todayEndStr)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setExpenseNotifs(data || []);
    } catch (error: any) {
      console.error('Error fetching expense notifications:', error);
    }
  };

  const getStatusBadge = (log: SmsLog) => {
    if (log.verified) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />מאומת</Badge>;
    }
    if (new Date() > new Date(log.expires_at)) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />פג תוקף</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />ממתין</Badge>;
  };

  const getVerificationTypeBadge = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      registration: 'רישום',
      login: 'התחברות',
      family_registration: 'רישום משפחתי'
    };
    
    return (
      <Badge variant="outline">
        {typeLabels[type] || type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          <h1 className="text-3xl font-bold">יומני SMS</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">טוען נתונים...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
        <h1 className="text-xl sm:text-3xl font-bold">יומני SMS</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הודעות</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{smsLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מאומתים</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {smsLogs.filter(log => log.verified).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממתינים</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {smsLogs.filter(log => !log.verified && new Date() <= new Date(log.expires_at)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">פג תוקף</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {smsLogs.filter(log => !log.verified && new Date() > new Date(log.expires_at)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הודעות SMS אחרונות</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">מספר טלפון</TableHead>
                <TableHead className="text-xs sm:text-sm">קוד</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">סוג</TableHead>
                <TableHead className="text-xs sm:text-sm">סטטוס</TableHead>
                <TableHead className="text-xs sm:text-sm hidden md:table-cell">נוצר</TableHead>
                <TableHead className="text-xs sm:text-sm hidden lg:table-cell">מאומת</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">ניסיונות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{log.phone_number}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-sm sm:text-lg">
                    {log.code}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {getVerificationTypeBadge(log.verification_type)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                    {log.verified_at ? format(new Date(log.verified_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={log.attempts > 3 ? "destructive" : "secondary"}>
                      {log.attempts}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          
          {smsLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>אין הודעות SMS במערכת</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            הודעות הוצאות (אתמול והיום)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            הודעות SMS על הוצאות חדשות לאישור שנשלחו למספרי הטלפון של המאשרים
          </p>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">נשלח ב</TableHead>
                  <TableHead className="text-xs sm:text-sm">מספר טלפון</TableHead>
                  <TableHead className="text-xs sm:text-sm">סטטוס</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">הוצאה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseNotifs.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {format(new Date(n.sent_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        {n.recipient_phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {n.status === 'sent' ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />נשלח
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {n.status}
                          {n.error_message ? `: ${n.error_message}` : ''}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                      {n.expense_id.slice(0, 8)}…
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {expenseNotifs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>אין הודעות הוצאות אתמול והיום</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSmsLogs;