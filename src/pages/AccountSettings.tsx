
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import AccountStatusAlert from '@/components/account/AccountStatusAlert';
import AccountDetailsCard from '@/components/account/AccountDetailsCard';
import UsersListCard from '@/components/account/UsersListCard';
import InviteUserForm from '@/components/account/InviteUserForm';
import NotificationsCard from '@/components/account/NotificationsCard';

const AccountSettings = () => {
  const { user, account, sendInvitation, removeInvitation } = useAuth();
  
  const handleSendInvitation = async (email: string) => {
    try {
      await sendInvitation(email);
      toast.success(`הזמנה נשלחה בהצלחה ל-${email}`);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שגיאה בשליחת ההזמנה, אנא נסה שוב');
    }
  };

  const handleRemovePartner = async () => {
    try {
      await removeInvitation();
      toast.success('השותף הוסר בהצלחה מהחשבון');
    } catch (error) {
      console.error('Failed to remove partner:', error);
      toast.error('שגיאה בהסרת השותף, אנא נסה שוב');
    }
  };
  
  return (
    <div className="container mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">הגדרות חשבון</h1>
      
      <AccountStatusAlert account={account} />
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">חשבון</TabsTrigger>
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <AccountDetailsCard account={account} />
        </TabsContent>
        
        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsersListCard 
              account={account} 
              user={user}
              onRemovePartner={handleRemovePartner}
            />
            
            <InviteUserForm 
              account={account} 
              onInvite={handleSendInvitation}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
