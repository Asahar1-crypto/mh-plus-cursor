
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { PendingInvitation } from './types';

interface InvitationItemProps {
  invitation: PendingInvitation;
  isProcessing: boolean;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
}

export const InvitationItem: React.FC<InvitationItemProps> = ({
  invitation,
  isProcessing,
  onAccept,
  onDecline
}) => {
  const ownerName = invitation.accounts?.profiles?.name || 'בעל החשבון';
  const accountName = invitation.accounts?.name || 'חשבון משותף';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
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
          onClick={() => onAccept(invitation.invitation_id)}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {isProcessing ? 'מעבד...' : 'אשר'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(invitation.invitation_id)}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4" />
          דחה
        </Button>
      </div>
    </div>
  );
};
