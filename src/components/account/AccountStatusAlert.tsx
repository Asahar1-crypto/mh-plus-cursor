
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Mail } from 'lucide-react';
import { Account } from '@/contexts/auth/types';

interface AccountStatusAlertProps {
  account: Account | null;
}

const AccountStatusAlert: React.FC<AccountStatusAlertProps> = ({ account }) => {
  if (!account) return null;

  // If user is participating in someone else's account
  if (account.isSharedAccount) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>אתה משתתף בחשבון של {account.ownerName || 'משתמש אחר'}</span>
        </AlertDescription>
      </Alert>
    );
  }

  // If there's a shared user in the account that the current user owns
  if (account.sharedWithId) {
    return (
      <Alert className="mb-4">
        <AlertDescription className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>{account.sharedWithName || account.sharedWithEmail} משתתף פעיל בחשבון שלך</span>
        </AlertDescription>
      </Alert>
    );
  }

  // If an invitation has been sent but not yet accepted
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
