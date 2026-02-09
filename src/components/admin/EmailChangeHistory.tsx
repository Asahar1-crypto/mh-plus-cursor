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
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center text-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
            טוען היסטוריה...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            היסטוריית שינויי מייל
          </CardTitle>
          <Button
            onClick={loadEmailChangeHistory}
            variant="outline"
            size="sm"
            className="gap-1 sm:gap-2 shrink-0"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">רענן</span>
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          רשימת כל שינויי המייל שבוצעו ע"י סופר אדמינים
        </p>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 md:p-6 sm:pt-0 md:pt-0">
        {emailChangeLogs.length === 0 ? (
          <div className="text-center py-8 px-3">
            <History className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">אין שינויי מייל</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              עדיין לא בוצעו שינויי מייל במערכת
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">תאריך ושעה</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">סופר אדמין</TableHead>
                  <TableHead className="text-xs sm:text-sm">מייל ישן</TableHead>
                  <TableHead className="text-xs sm:text-sm">מייל חדש</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">משתמש מושפע</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden xl:table-cell">IP</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">זמן שעבר</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailChangeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground hidden sm:block" />
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {getAdminName(log.user_id)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-none">{log.old_data?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-none">{log.new_data?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                        {log.record_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground hidden xl:table-cell">
                      {log.ip_address || 'לא ידוע'}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
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