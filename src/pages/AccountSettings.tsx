
import React from 'react';
import { useAuth } from '@/contexts/auth';
import AccountDetailsCard from '@/components/account/AccountDetailsCard';
import UserAccountsCard from '@/components/account/UserAccountsCard';
import AccountStatusAlert from '@/components/account/AccountStatusAlert';
import InviteUserForm from '@/components/account/InviteUserForm';
import UsersListCard from '@/components/account/UsersListCard';
import PendingInvitationsCard from '@/components/account/PendingInvitationsCard';
import SentInvitationsCard from '@/components/account/SentInvitationsCard';
import NotificationsCard from '@/components/account/NotificationsCard';
import UserProfileCard from '@/components/account/UserProfileCard';

const AccountSettings = () => {
  const { user, account, isLoading, sendInvitation, removeInvitation } = useAuth();

  const handleInvite = async (email: string) => {
    await sendInvitation(email);
  };

  const handleRemovePartner = async () => {
    await removeInvitation();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען הגדרות חשבון...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>אנא התחבר לצפייה בהגדרות החשבון</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">הגדרות חשבון</h1>
      </div>

      <AccountStatusAlert account={account} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <UserProfileCard />
          <UserAccountsCard />
          <AccountDetailsCard account={account} />
          <PendingInvitationsCard />
        </div>
        
        <div className="space-y-6">
          <InviteUserForm account={account} onInvite={handleInvite} />
          <SentInvitationsCard account={account} />
          <UsersListCard 
            account={account} 
            user={user} 
            onRemovePartner={handleRemovePartner}
            isLoading={isLoading}
          />
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
