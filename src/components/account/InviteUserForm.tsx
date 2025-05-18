
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2 } from 'lucide-react';
import { Account } from '@/contexts/auth/types';

const inviteSchema = z.object({
  email: z.string().email({ message: 'אימייל לא תקין' }),
});

interface InviteUserFormProps {
  account: Account | null;
  onInvite: (email: string) => Promise<void>;
}

const InviteUserForm: React.FC<InviteUserFormProps> = ({ account, onInvite }) => {
  const [isInviting, setIsInviting] = useState(false);
  
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmitInvite = async (data: z.infer<typeof inviteSchema>) => {
    if (isInviting) return;
    
    setIsInviting(true);
    try {
      console.log('Starting invitation process for email:', data.email);
      await onInvite(data.email);
      console.log('Invitation sent successfully');
      inviteForm.reset();
    } catch (error) {
      console.error('Failed to send invitation:', error);
    } finally {
      setIsInviting(false);
    }
  };

  // Don't display the form if the account is already shared
  if (account?.isSharedAccount || account?.sharedWithEmail) {
    return null;
  }

  return (
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default InviteUserForm;
