import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, RefreshCw, User, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface EmailChangeLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  ip_address: string | null;
}

interface EmailChangeHistoryProps {
  className?: string;
}

const EmailChangeHistory: React.FC<EmailChangeHistoryProps> = ({ className }) => {
  const { toast } = useToast();
  const [emailChangeLogs, setEmailChangeLogs] = useState<EmailChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEmailChangeHistory();
    loadUserEmails();
  }, []);

  const loadUserEmails = async () => {
    try {
      const { data: usersEmails, error } = await supabase.functions.invoke('get-user-emails');
      if (error) throw error;
      setUserEmails(usersEmails?.userEmails || {});
    } catch (error) {
      console.error('Error loading user emails:', error);
    }
  };

  const loadEmailChangeHistory = async () => {
    try {
      setLoading(true);
      
      // טוען את כל שינויי המייל מ-audit_logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'EMAIL_CHANGED_BY_ADMIN')
        .eq('table_name', 'auth.users')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEmailChangeLogs((data || []) as EmailChangeLog[]);
    } catch (error) {
      console.error('Error loading email change history:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת היסטוריית שינויי מייל',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAdminName = (adminId: string): string => {
    const adminEmail = userEmails[adminId];
    return adminEmail ? `${adminEmail.split('@')[0]}` : 'לא ידוע';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'לפני פחות משעה';
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
            טוען היסטוריה...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            היסטוריית שינויי מייל
          </CardTitle>
          <Button
            onClick={loadEmailChangeHistory}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          רשימת כל שינויי המייל שבוצעו ע"י סופר אדמינים
        </p>
      </CardHeader>
      <CardContent>
        {emailChangeLogs.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">אין שינויי מייל</h3>
            <p className="text-muted-foreground">
              עדיין לא בוצעו שינויי מייל במערכת
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך ושעה</TableHead>
                  <TableHead>סופר אדמין</TableHead>
                  <TableHead>מייל ישן</TableHead>
                  <TableHead>מייל חדש</TableHead>
                  <TableHead>משתמש מושפע</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>זמן שעבר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailChangeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary">
                          {getAdminName(log.user_id)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-red-500" />
                        {log.old_data?.email}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-green-500" />
                        {log.new_data?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.record_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || 'לא ידוע'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTimeAgo(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailChangeHistory;