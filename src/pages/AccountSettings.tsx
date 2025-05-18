import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import AccountStatusAlert from '@/components/account/AccountStatusAlert';
import AccountDetailsCard from '@/components/account/AccountDetailsCard';
import UsersListCard from '@/components/account/UsersListCard';
import InviteUserForm from '@/components/account/InviteUserForm';
import NotificationsCard from '@/components/account/NotificationsCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const AccountSettings = () => {
  const { user, account, sendInvitation, removeInvitation } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  
  const handleSendInvitation = async (email: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setProcessError(null);
    try {
      console.log(`AccountSettings: Starting to send invitation to ${email}`);
      await sendInvitation(email);
      toast.success(`הזמנה נשלחה בהצלחה ל-${email}`);
      console.log(`AccountSettings: Invitation sent successfully to ${email}`);
    } catch (error: any) {
      console.error('AccountSettings: Failed to send invitation:', error);
      // Check if we already displayed an error in the service
      if (!error.message?.includes('already exists')) {
        setProcessError('שגיאה בשליחת ההזמנה, אנא נסה שוב');
        toast.error('שגיאה בשליחת ההזמנה, אנא נסה שוב');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePartner = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setProcessError(null);
    try {
      console.log('AccountSettings: Starting partner removal process');
      await removeInvitation();
      console.log('AccountSettings: Partner removal completed successfully');
      toast.success('השותף הוסר בהצלחה מהחשבון');
      
      // If we're in a shared account and removing ourselves, we should redirect to dashboard
      // This will be handled by the useAuthActions hook which will reload the user data
      
    } catch (error) {
      console.error('AccountSettings: Failed to remove partner:', error);
      setProcessError('שגיאה בהסרת השותף, אנא נסה שוב');
      toast.error('שגיאה בהסרת השותף, אנא נסה שוב');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">הגדרות חשבון</h1>
      
      <AccountStatusAlert account={account} />
      
      {processError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{processError}</AlertDescription>
        </Alert>
      )}
      
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
              isLoading={isProcessing}
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
