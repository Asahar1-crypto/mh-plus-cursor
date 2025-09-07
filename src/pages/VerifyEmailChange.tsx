import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

const VerifyEmailChange: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('קישור לא תקין - חסרים פרמטרים נדרשים');
      return;
    }

    verifyEmailChange(token, email);
  }, [token, email]);

  const verifyEmailChange = async (verificationToken: string, newEmail: string) => {
    try {
      // First, verify the token in the database
      const { data: changeRequest, error: fetchError } = await supabase
        .from('email_change_requests')
        .select('*')
        .eq('token', verificationToken)
        .eq('new_email', newEmail)
        .eq('status', 'pending')
        .single();

      if (fetchError || !changeRequest) {
        console.error('Token verification failed:', fetchError);
        setStatus('error');
        setMessage('קישור לא תקין או שפג תוקפו');
        return;
      }

      // Check if token has expired
      const expiresAt = new Date(changeRequest.expires_at);
      if (expiresAt < new Date()) {
        setStatus('expired');
        setMessage('קישור פג תוקפו. אנא נסה שוב לשנות את כתובת המייל');
        return;
      }

      // Update the user's email using the admin API
      const { error: updateError } = await supabase.functions.invoke('update-user-email', {
        body: {
          userId: changeRequest.user_id,
          newEmail: changeRequest.new_email,
          token: verificationToken
        }
      });

      if (updateError) {
        console.error('Email update failed:', updateError);
        setStatus('error');
        setMessage('אירעה שגיאה בעדכון כתובת המייל. אנא נסה שוב מאוחר יותר');
        return;
      }

      // Mark the request as completed
      await supabase
        .from('email_change_requests')
        .update({ 
          status: 'completed',
          confirmed_at: new Date().toISOString()
        })
        .eq('token', verificationToken);

      setStatus('success');
      setMessage('כתובת המייל עודכנה בהצלחה!');
      toast.success('כתובת המייל עודכנה בהצלחה');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('אירעה שגיאה באימות המייל. אנא נסה שוב מאוחר יותר');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'verifying':
        return 'מאמת את שינוי המייל...';
      case 'success':
        return 'המייל עודכן בהצלחה!';
      case 'error':
        return 'שגיאה באימות המייל';
      case 'expired':
        return 'קישור פג תוקפו';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
          <CardDescription>
            {status === 'verifying' && 'אנא המתן בזמן שאנחנו מעדכנים את כתובת המייל שלך'}
            {status === 'success' && 'תועבר לדף הבית בעוד מספר שניות'}
            {(status === 'error' || status === 'expired') && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'success' && (
            <p className="text-sm text-muted-foreground mb-4">
              כתובת המייל שלך עודכנה ל: <strong>{email}</strong>
            </p>
          )}
          
          {(status === 'error' || status === 'expired') && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
              <Button 
                onClick={() => navigate('/account-settings')}
                className="w-full"
              >
                חזור להגדרות החשבון
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              עבור לדף הבית
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailChange;