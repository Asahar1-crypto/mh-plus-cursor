
import React from 'react';
import { useAuth } from '@/contexts/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Users } from 'lucide-react';

const AccountSwitcher = () => {
  const { account, userAccounts, switchAccount, isLoading } = useAuth();

  if (!userAccounts || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span className="text-sm text-muted-foreground">טוען חשבונות...</span>
      </div>
    );
  }

  const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];
  
  if (allAccounts.length <= 1) {
    // If user has only one account, just display it without selector
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{account?.name || 'חשבון ראשי'}</span>
        {account?.isSharedAccount && (
          <Badge variant="secondary" className="text-xs">
            שותף
          </Badge>
        )}
      </div>
    );
  }

  const handleAccountChange = async (accountId: string) => {
    if (accountId !== account?.id) {
      try {
        await switchAccount(accountId);
      } catch (error) {
        console.error('Failed to switch account:', error);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={account?.id || ''} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="בחר חשבון" />
        </SelectTrigger>
        <SelectContent>
          {userAccounts.ownedAccounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              <div className="flex items-center justify-between w-full">
                <span>{acc.name}</span>
                <Badge variant="default" className="mr-2 text-xs">
                  בעלים
                </Badge>
              </div>
            </SelectItem>
          ))}
          {userAccounts.sharedAccounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              <div className="flex items-center justify-between w-full">
                <span>{acc.name}</span>
                <div className="flex items-center space-x-1 mr-2">
                  <Users className="h-3 w-3" />
                  <Badge variant="secondary" className="text-xs">
                    שותף
                  </Badge>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountSwitcher;
