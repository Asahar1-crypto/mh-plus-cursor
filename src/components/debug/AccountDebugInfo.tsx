
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface AccountInfo {
  id: string;
  name: string;
  owner_id: string;
  shared_with_id?: string;
  shared_with_email?: string;
  invitation_id?: string;
  owner_email?: string;
  shared_user_email?: string;
}

interface InvitationInfo {
  invitation_id: string;
  email: string;
  account_id: string;
  accepted_at?: string;
  expires_at: string;
  account_name?: string;
}

const AccountDebugInfo: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const fetchDebugInfo = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all accounts related to this user
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          owner_id,
          shared_with_id,
          shared_with_email,
          invitation_id
        `)
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id},shared_with_email.eq.${user.email}`);

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
      } else {
        // Enrich accounts with user emails
        const enrichedAccounts = await Promise.all(
          (accountsData || []).map(async (account) => {
            const enriched: AccountInfo = { ...account };
            
            // Get owner email
            if (account.owner_id) {
              const { data: ownerData } = await supabase.auth.admin.getUserById(account.owner_id);
              enriched.owner_email = ownerData.user?.email;
            }
            
            // Get shared user email if shared_with_id exists
            if (account.shared_with_id) {
              const { data: sharedUserData } = await supabase.auth.admin.getUserById(account.shared_with_id);
              enriched.shared_user_email = sharedUserData.user?.email;
            }
            
            return enriched;
          })
        );
        
        setAccounts(enrichedAccounts);
      }

      // Get all invitations related to this user
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          account_id,
          accepted_at,
          expires_at,
          accounts:account_id (
            name
          )
        `)
        .eq('email', user.email);

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
      } else {
        const enrichedInvitations = (invitationsData || []).map(invitation => ({
          ...invitation,
          account_name: invitation.accounts?.name
        }));
        setInvitations(enrichedInvitations);
      }
    } catch (error) {
      console.error('Error in fetchDebugInfo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && user) {
      fetchDebugInfo();
    }
  }, [isVisible, user]);

  if (!user) return null;

  return (
    <div className="p-4 border-t border-gray-200">
      <Button 
        onClick={() => setIsVisible(!isVisible)}
        variant="outline"
        size="sm"
        className="mb-4"
      >
        {isVisible ? 'הסתר מידע דיבוג' : 'הצג מידע דיבוג חשבונות'}
      </Button>

      {isVisible && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>מידע דיבוג - חשבונות</CardTitle>
              <CardDescription>
                משתמש נוכחי: {user.email} (ID: {user.id})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchDebugInfo} disabled={loading} className="mb-4">
                {loading ? 'טוען...' : 'רענן מידע'}
              </Button>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">חשבונות ({accounts.length}):</h3>
                  {accounts.length === 0 ? (
                    <p className="text-gray-500">לא נמצאו חשבונות</p>
                  ) : (
                    accounts.map((account) => (
                      <div key={account.id} className="bg-gray-50 p-3 rounded mb-2">
                        <p><strong>שם:</strong> {account.name}</p>
                        <p><strong>ID:</strong> {account.id}</p>
                        <p><strong>בעלים:</strong> {account.owner_email || account.owner_id}</p>
                        {account.shared_with_email && (
                          <p><strong>משותף עם (email):</strong> {account.shared_with_email}</p>
                        )}
                        {account.shared_with_id && (
                          <p><strong>משותף עם (ID):</strong> {account.shared_user_email || account.shared_with_id}</p>
                        )}
                        {account.invitation_id && (
                          <p><strong>ID הזמנה:</strong> {account.invitation_id}</p>
                        )}
                        <p><strong>סטטוס:</strong> {account.owner_id === user.id ? 'בעלים' : 'משותף'}</p>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">הזמנות ({invitations.length}):</h3>
                  {invitations.length === 0 ? (
                    <p className="text-gray-500">לא נמצאו הזמנות</p>
                  ) : (
                    invitations.map((invitation) => (
                      <div key={invitation.invitation_id} className="bg-blue-50 p-3 rounded mb-2">
                        <p><strong>ID הזמנה:</strong> {invitation.invitation_id}</p>
                        <p><strong>אימייל:</strong> {invitation.email}</p>
                        <p><strong>חשבון:</strong> {invitation.account_name || invitation.account_id}</p>
                        <p><strong>התקבלה:</strong> {invitation.accepted_at ? new Date(invitation.accepted_at).toLocaleString('he-IL') : 'לא'}</p>
                        <p><strong>פוגה:</strong> {new Date(invitation.expires_at).toLocaleString('he-IL')}</p>
                        <p><strong>סטטוס:</strong> {invitation.accepted_at ? 'התקבלה' : 'ממתינה'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AccountDebugInfo;
