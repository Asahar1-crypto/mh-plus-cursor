
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, User, UserPlus } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
});

const AccountSettings = () => {
  const { user, account, sendInvitation } = useAuth();
  const [isInviting, setIsInviting] = useState(false);
  
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
      inviteForm.reset();
    } finally {
      setIsInviting(false);
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
                  
                  {account?.sharedWithId ? (
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">משתמש משותף</p>
                          <p className="text-sm text-muted-foreground">user@example.com</p>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">משתתף</span>
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
                    
                    <Button type="submit" className="w-full" disabled={isInviting || !!account?.sharedWithId}>
                      {isInviting ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                          שולח הזמנה...
                        </span>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          שלח הזמנה
                        </>
                      )}
                    </Button>
                    
                    {account?.sharedWithId && (
                      <p className="text-sm text-muted-foreground text-center">
                        כבר יש משתמש נוסף בחשבון זה
                      </p>
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
