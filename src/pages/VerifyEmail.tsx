
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const { verifyEmail, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const email = location.state?.email || searchParams.get('email') || '';
  const token = searchParams.get('token') || searchParams.get('access_token');
  const type = searchParams.get('type');
  
  useEffect(() => {
    // Handle different verification scenarios
    const handleVerification = async () => {
      // Handle email verification from link
      if (token && type === 'signup') {
        await verifyEmailWithToken(token);
        return;
      }
      
      // If user is already authenticated (came from email link), handle immediately
      if (isAuthenticated) {
        setVerificationStatus('success');
        
        // Check if we have pending invitations from registration
        const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
        if (pendingInvitationsData) {
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
      
      // If we have a token, verify email manually
      if (token) {
        await verifyEmailWithToken(token);
      }
    };
    
    handleVerification();
  }, [token, type, isAuthenticated, navigate]);

  const verifyEmailWithToken = async (token: string) => {
    setIsVerifying(true);
    try {
      const result = await verifyEmail(token);
      setVerificationStatus(result ? 'success' : 'error');
      
      // If verification was successful, check for pending invitations
      if (result) {
        const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
        if (pendingInvitationsData) {
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
    <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center px-4 sm:px-6">
          {token ? (
            <>
              {verificationStatus === 'pending' && (
                <div className="mx-auto mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              )}
              {verificationStatus === 'success' && (
                <div className="mx-auto mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                </div>
              )}
              {verificationStatus === 'error' && (
                <div className="mx-auto mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                </div>
              )}
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {verificationStatus === 'pending' && 'מאמת את האימייל...'}
                {verificationStatus === 'success' && 'האימייל אומת בהצלחה'}
                {verificationStatus === 'error' && 'אימות האימייל נכשל'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {verificationStatus === 'pending' && 'אנא המתן בזמן שאנו מאמתים את האימייל שלך.'}
                {verificationStatus === 'success' && 'תודה על אימות האימייל. מעביר אותך למסך ההתחברות...'}
                {verificationStatus === 'error' && 'לא הצלחנו לאמת את האימייל שלך. אנא נסה שוב או צור קשר עם התמיכה.'}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">בדוק את האימייל שלך</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                שלחנו הוראות לאימות חשבונך אל {email || 'האימייל שסיפקת'}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!token && (
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
