
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Mail } from 'lucide-react';
import { Account } from '@/contexts/auth/types';

interface AccountStatusAlertProps {
  account: Account | null;
}

const AccountStatusAlert: React.FC<AccountStatusAlertProps> = ({ account }) => {
  if (!account) return null;

  // Current user is a member (not admin) in this account
  if (account.userRole === 'member') {
    const adminName =
      account.members?.find(m => m.role === 'admin')?.user_name ||
      account.ownerName ||
      'משתמש אחר';
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>אתה משתתף בחשבון של {adminName}</span>
        </AlertDescription>
      </Alert>
    );
  }

  // Current user is admin and there's an active partner member
  const partnerMember = account.members?.find(m => m.role === 'member');
  if (partnerMember) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>{partnerMember.user_name} משתתף פעיל בחשבון שלך</span>
        </AlertDescription>
      </Alert>
    );
  }

  // Fallback: invitation sent but not yet accepted (no equivalent in members system)
  if (account.sharedWithEmail && !account.sharedWithId) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          <span>הזמנה נשלחה ל-{account.sharedWithEmail} וממתינה לאישור</span>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default AccountStatusAlert;
