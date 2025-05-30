
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { usePendingInvitations } from './invitations/usePendingInvitations';
import { InvitationItem } from './invitations/InvitationItem';
import { InvitationLoadingState } from './invitations/InvitationLoadingState';

const PendingInvitationsCard = () => {
  const {
    invitations,
    loading,
    processing,
    handleAcceptInvitation,
    handleDeclineInvitation
  } = usePendingInvitations();

  if (loading) {
    return <InvitationLoadingState />;
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
          invitations.map((invitation) => (
            <InvitationItem
              key={invitation.invitation_id}
              invitation={invitation}
              isProcessing={processing === invitation.invitation_id}
              onAccept={handleAcceptInvitation}
              onDecline={handleDeclineInvitation}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default PendingInvitationsCard;
