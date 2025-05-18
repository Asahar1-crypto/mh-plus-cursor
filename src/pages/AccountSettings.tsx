
import React, { useState } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSendInvitation = async (email: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      console.log(`AccountSettings: Starting to send invitation to ${email}`);
      await sendInvitation(email);
      toast.success(`הזמנה נשלחה בהצלחה ל-${email}`);
      console.log(`AccountSettings: Invitation sent successfully to ${email}`);
    } catch (error: any) {
      console.error('AccountSettings: Failed to send invitation:', error);
      // Check if we already displayed an error in the service
      if (!error.message?.includes('already exists')) {
        toast.error('שגיאה בשליחת ההזמנה, אנא נסה שוב');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePartner = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      console.log('AccountSettings: Starting partner removal process');
      await removeInvitation();
      console.log('AccountSettings: Partner removal completed successfully');
      toast.success('השותף הוסר בהצלחה מהחשבון');
    } catch (error) {
      console.error('AccountSettings: Failed to remove partner:', error);
      toast.error('שגיאה בהסרת השותף, אנא נסה שוב');
    } finally {
      setIsProcessing(false);
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
