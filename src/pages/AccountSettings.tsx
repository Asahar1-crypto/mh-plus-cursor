
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { Mail, User, UserPlus, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const inviteSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
});

const AccountSettings = () => {
  const { user, account, sendInvitation, removeInvitation } = useAuth();
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmitInvite = async (data: z.infer<typeof inviteSchema>) => {
    setIsInviting(true);
    try {
      await sendInvitation(data.email);
      toast.success(`הזמנה נשלחה בהצלחה ל-${data.email}`);
      inviteForm.reset();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שגיאה בשליחת ההזמנה, אנא נסה שוב');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemovePartner = async () => {
    if (!account?.sharedWithId) return;
    
    setIsRemoving(true);
    try {
      await removeInvitation();
      toast.success('השותף הוסר בהצלחה מהחשבון');
    } catch (error) {
      console.error('Failed to remove partner:', error);
      toast.error('שגיאה בהסרת השותף, אנא נסה שוב');
    } finally {
      setIsRemoving(false);
    }
  };
  
  return (
    <div className="container mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">הגדרות חשבון</h1>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">חשבון</TabsTrigger>
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>פרטי חשבון</CardTitle>
              <CardDescription>עדכן את פרטי החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">שם החשבון</label>
                    <Input value={account?.name || ''} readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">סוג חשבון</label>
                    <Input value="חשבון משפחה" readOnly />
                  </div>
                </div>
                <div className="mt-4">
                  <Button>שמור שינויים</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">בעלים</span>
                  </div>
                  
                  {account?.sharedWithEmail ? (
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">שותף בחשבון</p>
                          <p className="text-sm text-muted-foreground">{account.sharedWithEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {account.sharedWithId ? 'משתתף פעיל' : 'הזמנה נשלחה'}
                        </span>
                        {!isRemoving ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={handleRemovePartner}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            הסר
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="border-destructive">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>הזמנת משתמש לחשבון</CardTitle>
                <CardDescription>הזמן משתמש נוסף לצפייה וניהול החשבון</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onSubmitInvite)} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>כתובת אימייל</FormLabel>
                          <FormControl>
                            <Input placeholder="דוא״ל של המשתמש" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isInviting || !!account?.sharedWithEmail}
                    >
                      {isInviting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          שולח הזמנה...
                        </span>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          שלח הזמנה
                        </>
                      )}
                    </Button>
                    
                    {account?.sharedWithEmail && (
                      <div className="p-3 bg-muted rounded-md mt-2">
                        <p className="text-sm text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>הזמנה נשלחה ל-{account.sharedWithEmail}</span>
                        </p>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות התראות</CardTitle>
              <CardDescription>קבע כיצד תקבל התראות מהמערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                בקרוב - ניהול התראות מתקדם
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
