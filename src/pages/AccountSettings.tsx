
import React from 'react';
import { useAuth } from '@/contexts/auth';
import AccountDetailsCard from '@/components/account/AccountDetailsCard';
import UserAccountsCard from '@/components/account/UserAccountsCard';
import AccountStatusAlert from '@/components/account/AccountStatusAlert';
import InviteUserForm from '@/components/account/InviteUserForm';
import UsersListCard from '@/components/account/UsersListCard';
import PendingInvitationsCard from '@/components/account/PendingInvitationsCard';
import SentInvitationsCard from '@/components/account/SentInvitationsCard';
import UserProfileCard from '@/components/account/UserProfileCard';
import ChangePasswordCard from '@/components/account/ChangePasswordCard';
import BillingCycleCard from '@/components/account/BillingCycleCard';
import AvatarSetCard from '@/components/account/AvatarSetCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, Settings, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AccountSettings = () => {
  const { user, account, isLoading, sendInvitation, removeInvitation } = useAuth();

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', account?.id, user?.id],
    queryFn: async () => {
      if (!account?.id || !user?.id) return false;
      
      const { data, error } = await supabase.rpc('is_account_admin', {
        account_uuid: account.id,
        user_uuid: user.id
      });

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data || false;
    },
    enabled: !!account?.id && !!user?.id
  });

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 animate-fade-in">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="relative z-10 container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            הגדרות חשבון
          </h1>
        </div>

        {/* Account Status Banner */}
        <div className="animate-fade-in [animation-delay:200ms]">
          <AccountStatusAlert account={account} />
        </div>

        {/* Tabs Navigation */}
        <div className="animate-fade-in [animation-delay:400ms]">
          <Tabs defaultValue="profile" dir="rtl" className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-1.5 shadow-sm">
              <TabsTrigger 
                value="profile" 
                className="flex-1 min-w-[100px] gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                <User className="h-4 w-4" />
                <span>פרופיל אישי</span>
              </TabsTrigger>
              <TabsTrigger 
                value="account" 
                className="flex-1 min-w-[100px] gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                <Settings className="h-4 w-4" />
                <span>הגדרות חשבון</span>
              </TabsTrigger>
              <TabsTrigger 
                value="family" 
                className="flex-1 min-w-[100px] gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                <Users className="h-4 w-4" />
                <span>חברי משפחה</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Profile */}
            <TabsContent value="profile" className="mt-4 sm:mt-6">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
                <UserProfileCard />
                <ChangePasswordCard />
              </div>
            </TabsContent>

            {/* Tab 2: Account Settings */}
            <TabsContent value="account" className="mt-4 sm:mt-6">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
                <AccountDetailsCard account={account} />
                <BillingCycleCard 
                  accountId={account?.id}
                  currentBillingDay={account?.billing_cycle_start_day}
                  isAdmin={isAdmin || false}
                />
                <AvatarSetCard
                  accountId={account?.id}
                  currentAvatarSet={account?.avatar_set}
                  isAdmin={isAdmin || false}
                />
                <UserAccountsCard />
              </div>
            </TabsContent>

            {/* Tab 3: Family Members */}
            <TabsContent value="family" className="mt-4 sm:mt-6">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
                <PendingInvitationsCard />
                <UsersListCard 
                  account={account} 
                  user={user} 
                  onRemovePartner={handleRemovePartner}
                  isLoading={isLoading}
                />
                <InviteUserForm account={account} onInvite={handleInvite} />
                <SentInvitationsCard account={account} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
