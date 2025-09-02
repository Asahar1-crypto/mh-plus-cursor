import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const VerifyEmail = () => {
  const { verifyEmail, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const email = location.state?.email || searchParams.get('email') || '';
  const userId = searchParams.get('user_id');
  const token = searchParams.get('token');
  
  useEffect(() => {
    // Handle different verification scenarios
    const handleVerification = async () => {
      // If user is already authenticated (came from email link), handle immediately
      if (isAuthenticated) {
        console.log("User is authenticated, processing pending invitations");
        setVerificationStatus('success');
        
        // Check if we have pending invitations from registration
        const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
        if (pendingInvitationsData) {
          console.log("Found pending invitations, redirecting to dashboard");
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else {
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
        return;
      }
      
      // If we have user_id and email, verify directly
      if (userId && email) {
        await verifyEmailDirectly(userId, email);
      } else if (token) {
        await verifyEmailWithToken(token);
      }
    };
    
    handleVerification();
  }, [token, userId, email, isAuthenticated, navigate]);
  
  const verifyEmailDirectly = async (userId: string, email: string) => {
    setIsVerifying(true);
    try {
      console.log('Attempting direct email verification for user:', userId);
      
      // Update user's email_confirmed_at directly via admin API
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Email verification successful');
      setVerificationStatus('success');
      
      // Check for pending invitations
      const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
      if (pendingInvitationsData) {
        console.log("Email verified, redirecting to dashboard to handle invitations");
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Direct email verification failed:', error);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const verifyEmailWithToken = async (token: string) => {
    setIsVerifying(true);
    try {
      let result = false;
      
      // If we have both email and token from URL params, try custom verification first
      if (email && token) {
        try {
          console.log('Attempting custom email verification with SendGrid token');
          const { error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
          });
          
          if (error) {
            console.log('Custom verification failed, trying standard verification:', error);
            // Fallback to standard verification
            result = await verifyEmail(token);
          } else {
            console.log('Custom verification successful');
            result = true;
          }
        } catch (customError) {
          console.log('Custom verification error, falling back to standard:', customError);
          result = await verifyEmail(token);
        }
      } else {
        // Standard verification
        result = await verifyEmail(token);
      }
      
      setVerificationStatus(result ? 'success' : 'error');
      
      // If verification was successful, check for pending invitations
      if (result) {
        const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
        if (pendingInvitationsData) {
          console.log("Email verified, redirecting to dashboard to handle invitations");
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          {(token || userId) ? (
            <>
              {verificationStatus === 'pending' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {verificationStatus === 'success' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              )}
              {verificationStatus === 'error' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
              )}
              <CardTitle className="text-2xl font-bold">
                {verificationStatus === 'pending' && 'מאמת את האימייל...'}
                {verificationStatus === 'success' && 'האימייל אומת בהצלחה'}
                {verificationStatus === 'error' && 'אימות האימייל נכשל'}
              </CardTitle>
              <CardDescription>
                {verificationStatus === 'pending' && 'אנא המתן בזמן שאנו מאמתים את האימייל שלך.'}
                {verificationStatus === 'success' && 'תודה על אימות האימייל. מעביר אותך למסך ההתחברות...'}
                {verificationStatus === 'error' && 'לא הצלחנו לאמת את האימייל שלך. אנא נסה שוב או צור קשר עם התמיכה.'}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-bold">בדוק את האימייל שלך</CardTitle>
              <CardDescription>
                שלחנו הוראות לאימות חשבונך אל {email || 'האימייל שסיפקת'}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!(token || userId) && (
            <div className="text-center text-muted-foreground">
              <p>לא קיבלת אימייל? בדוק את תיבת הספאם שלך או חזור למסך ההרשמה ונסה שוב.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => navigate('/login')} 
            variant="outline"
            disabled={isVerifying}
          >
            חזרה למסך ההתחברות
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;