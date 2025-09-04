import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Invitation {
  id: string;
  email: string;
  invitation_id: string;
  account_id: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accounts: {
    name: string;
    owner_id: string;
    profiles?: {
      name?: string;
    };
  };
}

export const InvitationsSection: React.FC = () => {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invitation: Invitation | null }>({
    open: false,
    invitation: null
  });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          accounts (
            name,
            owner_id,
            profiles:profiles!accounts_owner_id_fkey (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת ההזמנות',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'ההזמנה נמחקה בהצלחה',
      });

      await loadInvitations();
      setDeleteDialog({ open: false, invitation: null });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה במחיקת ההזמנה',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (invitation.accepted_at) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />התקבלה</Badge>;
    }
    
    if (expiresAt < now) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />פגה תוקף</Badge>;
    }
    
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />ממתינה</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'פג תוקף';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `עוד ${days} ימים`;
    if (hours > 0) return `עוד ${hours} שעות`;
    return 'פחות משעה';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          הזמנות במערכת
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadInvitations}
          disabled={loading}
          className="gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">טוען הזמנות...</div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">אין הזמנות במערכת</div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <strong>{invitation.email}</strong>
                      {getStatusBadge(invitation)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>משפחה: <strong>{invitation.accounts.name}</strong></div>
                      <div>בעלים: <strong>{invitation.accounts.profiles?.name || 'לא ידוע'}</strong></div>
                      <div>נשלחה: {formatDate(invitation.created_at)}</div>
                      <div>פגה תוקף: {formatDate(invitation.expires_at)}</div>
                      {!invitation.accepted_at && (
                        <div>זמן נותר: <strong>{getTimeRemaining(invitation.expires_at)}</strong></div>
                      )}
                      {invitation.accepted_at && (
                        <div>התקבלה: {formatDate(invitation.accepted_at)}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, invitation })}
                    className="text-destructive hover:text-destructive gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחק
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog 
          open={deleteDialog.open} 
          onOpenChange={(open) => setDeleteDialog({ open, invitation: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת הזמנה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק את ההזמנה עבור {deleteDialog.invitation?.email}?
                פעולה זו בלתי הפיכה.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog.invitation && deleteInvitation(deleteDialog.invitation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק הזמנה
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};