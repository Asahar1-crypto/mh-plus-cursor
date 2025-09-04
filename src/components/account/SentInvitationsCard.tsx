import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, X, Loader2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Account } from '@/contexts/auth/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SentInvitation {
  id: string;
  invitation_id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface SentInvitationsCardProps {
  account: Account | null;
}

const SentInvitationsCard: React.FC<SentInvitationsCardProps> = ({ account }) => {
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserRole = async () => {
    if (!account?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', account.id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Failed to check user role:', error);
    }
  };

  const loadSentInvitations = async () => {
    if (!account?.id) return;

    try {
      setLoading(true);
      console.log('Loading sent invitations for account:', account.id);
      
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sent invitations:', error);
        toast.error('שגיאה בטעינת הזמנות שנשלחו');
        return;
      }

      console.log('Loaded sent invitations:', data);
      setSentInvitations(data || []);
    } catch (error) {
      console.error('Failed to load sent invitations:', error);
      toast.error('שגיאה בטעינת הזמנות שנשלחו');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!account?.id) return;

    try {
      setDeleting(invitationId);
      console.log('Deleting invitation:', invitationId);

      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('invitation_id', invitationId)
        .eq('account_id', account.id);

      if (error) {
        console.error('Error deleting invitation:', error);
        toast.error('שגיאה במחיקת ההזמנה');
        return;
      }

      toast.success(`ההזמנה ל-${email} נמחקה בהצלחה`);
      
      // רענון רשימת ההזמנות
      await loadSentInvitations();
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      toast.error('שגיאה במחיקת ההזמנה');
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    checkUserRole();
    loadSentInvitations();
  }, [account?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getInvitationStatus = (invitation: SentInvitation) => {
    if (invitation.accepted_at) {
      return { text: 'התקבלה', color: 'text-green-600', icon: '✓' };
    }
    if (isExpired(invitation.expires_at)) {
      return { text: 'פגה תוקף', color: 'text-red-600', icon: '⚠' };
    }
    return { text: 'ממתינה', color: 'text-yellow-600', icon: '⏳' };
  };

  if (!account || !isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          הזמנות שנשלחו
        </CardTitle>
        <CardDescription>
          הזמנות שנשלחו למשתתפים להצטרפות לחשבון
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">טוען הזמנות...</span>
          </div>
        ) : sentInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>לא נשלחו הזמנות עדיין</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sentInvitations.map((invitation) => {
              const status = getInvitationStatus(invitation);
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{invitation.email}</span>
                      <span className={`text-sm ${status.color} flex items-center gap-1`}>
                        <span>{status.icon}</span>
                        {status.text}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      נשלחה: {formatDate(invitation.created_at)}
                    </div>
                    {!invitation.accepted_at && !isExpired(invitation.expires_at) && (
                      <div className="text-sm text-muted-foreground">
                        תפוג: {formatDate(invitation.expires_at)}
                      </div>
                    )}
                  </div>
                  
                  {!invitation.accepted_at && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting === invitation.invitation_id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleting === invitation.invitation_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>מחיקת הזמנה</AlertDialogTitle>
                          <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את ההזמנה ל-{invitation.email}?
                            פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteInvitation(invitation.invitation_id, invitation.email)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            מחק הזמנה
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentInvitationsCard;