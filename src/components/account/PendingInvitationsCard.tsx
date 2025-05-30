
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Mail, Calendar, User } from 'lucide-react';

interface PendingInvitation {
  invitation_id: string;
  email: string;
  account_id: string;
  expires_at: string;
  accounts: {
    id: string;
    name: string;
    owner_id: string;
    profiles?: {
      name?: string;
    };
  };
}

const PendingInvitationsCard = () => {
  const { user, acceptInvitation } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPendingInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      console.log('Fetching pending invitations for:', user.email);

      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          account_id,
          expires_at,
          accounts:account_id (
            id,
            name,
            owner_id,
            profiles:owner_id (
              name
            )
          )
        `)
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', 'now()');

      if (error) {
        console.error('Error fetching invitations:', error);
        toast.error('שגיאה בטעינת ההזמנות');
        return;
      }

      console.log('Found pending invitations:', data);
      setInvitations(data || []);
    } catch (error) {
      console.error('Error in fetchPendingInvitations:', error);
      toast.error('שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, [user]);

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user || processing) return;

    try {
      setProcessing(invitationId);
      console.log('Accepting invitation:', invitationId);
      
      await acceptInvitation(invitationId);
      
      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
      
      toast.success('הצטרפת לחשבון בהצלחה!');
      
      // Refresh the list to make sure we have the latest data
      setTimeout(() => {
        fetchPendingInvitations();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'שגיאה באישור ההזמנה');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!user || processing) return;

    try {
      setProcessing(invitationId);
      console.log('Declining invitation:', invitationId);

      // Mark invitation as expired by updating expires_at to past time
      const { error } = await supabase
        .from('invitations')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('invitation_id', invitationId);

      if (error) {
        console.error('Error declining invitation:', error);
        throw new Error('שגיאה בדחיית ההזמנה');
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
      toast.success('ההזמנה נדחתה');

    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'שגיאה בדחיית ההזמנה');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            הזמנות ממתינות
          </CardTitle>
          <CardDescription>
            הזמנות שהתקבלו להצטרפות לחשבונות משותפים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">טוען הזמנות...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          הזמנות ממתינות
          {invitations.length > 0 && (
            <Badge variant="secondary" className="mr-2">
              {invitations.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          הזמנות שהתקבלו להצטרפות לחשבונות משותפים
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.length === 0 ? (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              אין הזמנות ממתינות כרגע
            </AlertDescription>
          </Alert>
        ) : (
          invitations.map((invitation) => {
            const ownerName = invitation.accounts?.profiles?.name || 'בעל החשבון';
            const accountName = invitation.accounts?.name || 'חשבון משותף';
            const isProcessing = processing === invitation.invitation_id;

            return (
              <div key={invitation.invitation_id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      הזמנה מ-{ownerName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      הוזמנת להצטרף לחשבון: <strong>{accountName}</strong>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      פוגה ב: {formatDate(invitation.expires_at)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ממתין
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvitation(invitation.invitation_id)}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isProcessing ? 'מעבד...' : 'אשר'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeclineInvitation(invitation.invitation_id)}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    דחה
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default PendingInvitationsCard;
