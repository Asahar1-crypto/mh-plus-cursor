
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, XCircle, Loader2 } from 'lucide-react';
import { Account } from '@/contexts/auth/types';
import { User as UserType } from '@/contexts/auth/types';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UsersListCardProps {
  account: Account | null;
  user: UserType | null;
  onRemovePartner: () => Promise<void>;
  isLoading?: boolean;
}

const UsersListCard: React.FC<UsersListCardProps> = ({ account, user, onRemovePartner, isLoading }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRemovePartner = async () => {
    if (!account?.sharedWithId && !account?.sharedWithEmail) return;
    
    setIsRemoving(true);
    try {
      await onRemovePartner();
      toast.success('השותף הוסר בהצלחה');
    } catch (error) {
      console.error('Failed to remove partner:', error);
      toast.error('שגיאה בהסרת השותף, אנא נסה שוב');
    } finally {
      setIsRemoving(false);
      setShowConfirmDialog(false);
    }
  };

  if (!account || !user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>משתמשים בחשבון</CardTitle>
        <CardDescription>צפה במשתמשים שיש להם גישה לחשבון זה</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md divide-y">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              {account?.isSharedAccount ? 'משתתף' : 'בעלים'}
            </span>
          </div>
          
          {account?.isSharedAccount ? (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{account.ownerName || 'בעל החשבון'}</p>
                  <p className="text-sm text-muted-foreground">בעל החשבון</p>
                </div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">בעלים</span>
            </div>
          ) : account?.sharedWithEmail ? (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{account.sharedWithName || 'שותף בחשבון'}</p>
                  <p className="text-sm text-muted-foreground">{account.sharedWithEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {account.sharedWithId ? 'משתתף פעיל' : 'הזמנה נשלחה'}
                </span>
                
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      disabled={isRemoving || isLoading}
                    >
                      {isRemoving || isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          הסר
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                      <AlertDialogDescription>
                        פעולה זו תסיר את השותף מהחשבון ותבטל את ההזמנה שנשלחה.
                        לא ניתן לבטל פעולה זו לאחר הביצוע.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemovePartner} disabled={isRemoving || isLoading}>
                        {isRemoving || isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מסיר...
                          </>
                        ) : (
                          'אישור'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersListCard;
