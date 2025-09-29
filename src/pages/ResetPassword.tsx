import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isTokenChecking, setIsTokenChecking] = useState(true);

  // Check token validity on component mount
  useEffect(() => {
    const checkToken = async () => {
      console.log('🔍 ResetPassword component mounted');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Search params string:', window.location.search);
      console.log('🔍 Hash:', window.location.hash);
      console.log('🔍 User agent:', navigator.userAgent);
      console.log('🔍 Referrer:', document.referrer);
      
      // Check for new-style tokens (from Supabase built-in reset)
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      
      // Check for old-style tokens (from custom edge function)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      console.log('🔍 Reset password URL params:', { token, type, accessToken, refreshToken });
      
      // Handle new-style reset tokens (token + type=recovery)
      if (token && type === 'recovery') {
        console.log('🔍 Found recovery token, checking session instead of verifying token...');
        try {
          // Instead of verifying the token, just check if we have an active session
          // The token was likely already consumed by the auth redirect
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session check error:', sessionError);
            toast.error(`שגיאה בבדיקת session: ${sessionError.message}`);
            setIsValidToken(false);
          } else if (sessionData.session) {
            console.log('Found active session, allowing password reset');
            toast.success('מוכן לעדכון סיסמה');
            setIsValidToken(true);
          } else {
            console.log('No active session found');
            toast.error('לא נמצא session פעיל');
            setIsValidToken(false);
          }
        } catch (err) {
          console.error('Error checking session:', err);
          toast.error('שגיאה בבדיקת הסשן');
          setIsValidToken(false);
        } finally {
          setIsTokenChecking(false);
        }
        return;
      }
      
      // Handle old-style tokens (access_token + refresh_token)
      if (accessToken && refreshToken) {
        try {
          console.log('Using old-style access/refresh tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Token validation error:', error);
            setIsValidToken(false);
          } else if (data.session) {
            setIsValidToken(true);
          } else {
            setIsValidToken(false);
          }
        } catch (err) {
          console.error('Error checking token:', err);
          setIsValidToken(false);
        } finally {
          setIsTokenChecking(false);
        }
        return;
      }
      
      // No valid tokens found
      console.log('No valid reset tokens found in URL');
      setIsValidToken(false);
      setIsTokenChecking(false);
    };

    checkToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password) {
      setError('אנא הזן סיסמה חדשה');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        setError('שגיאה בעדכון הסיסמה. אנא נסה שוב.');
      } else {
        toast.success('הסיסמה עודכנה בהצלחה!');
        // Wait a moment then redirect
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('שגיאה לא צפויה. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking token
  if (isTokenChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">בודק תוקף הלינק...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">לינק לא תקף</CardTitle>
            <CardDescription>
              לינק איפוס הסיסמה אינו תקף או שפג תוקפו
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                ייתכן שהלינק פג תוקף או שכבר שימש. אנא בקש לינק חדש לאיפוס סיסמה.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col space-y-2">
              <Button asChild>
                <Link to="/forgot-password">בקש לינק חדש לאיפוס סיסמה</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login">חזור לדף התחברות</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          <CardTitle className="text-2xl font-bold">עדכון סיסמה</CardTitle>
          <CardDescription>
            הזן סיסמה חדשה לחשבון שלך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה חדשה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה חדשה"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">אישור סיסמה</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הזן שוב את הסיסמה החדשה"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מעדכן סיסמה...
                </>
              ) : (
                'עדכן סיסמה'
              )}
            </Button>

            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm text-muted-foreground hover:text-primary"
              >
                חזור לדף התחברות
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;