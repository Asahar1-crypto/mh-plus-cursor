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
    console.log('🚀 ResetPassword component starting...');
    const checkToken = async () => {
      console.log('🔍 ResetPassword component mounted');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Search params string:', window.location.search);
      console.log('🔍 Hash:', window.location.hash);
      console.log('🔍 Pathname:', window.location.pathname);
      
      // Parse both search and hash parameters
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      console.log('🔍 Search params object:', Object.fromEntries(searchParams));
      console.log('🔍 Hash params object:', Object.fromEntries(hashParams));
      
      // Check for tokens in both locations
      const token = searchParams.get('token') || hashParams.get('token');
      const type = searchParams.get('type') || hashParams.get('type');
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
      
      console.log('🔍 Found tokens:', { token, type, accessToken, refreshToken });
      
      // If no tokens found, maybe we're coming from the Supabase redirect URL
      // and need to handle the current session differently
      if (!token && !accessToken) {
        console.log('🔍 No tokens found in URL, checking current session...');
        
        // Check if we have a current session (user might be redirected from Supabase auth)
        const { data: session } = await supabase.auth.getSession();
        console.log('🔍 Current session:', session);
        
        if (session?.session) {
          console.log('🔍 Found existing session - checking if it\'s for password recovery');
          // We have a session, assume it's valid for password reset
          setIsValidToken(true);
          setIsTokenChecking(false);
          return;
        } else {
          console.log('❌ No session found and no tokens in URL');
          setIsValidToken(false);
          setIsTokenChecking(false);
          return;
        }
      }
      
      // Handle new-style reset tokens (token + type=recovery)
      if (token && type === 'recovery') {
        console.log('🔍 Found recovery token - validating without creating session...');
        
        // SECURITY FIX: Only verify the token is valid, don't create session yet
        // The session will be created only when user actually updates password
        try {
          // Check if token is valid by attempting to verify it
          // But we'll immediately sign out to prevent unauthorized access
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Recovery token verification error:', error);
            toast.error(`שגיאה באימות הטוקן: ${error.message}`);
            setIsValidToken(false);
          } else if (data.session) {
            console.log('🔒 SECURITY: Token valid but immediately signing out to prevent unauthorized access');
            
            // Sign out immediately to prevent unauthorized access
            await supabase.auth.signOut();
            
            // Token is valid - allow password reset
            console.log('Token verified - ready for password reset');
            setIsValidToken(true);
          } else {
            console.log('Token verified but no session created');
            setIsValidToken(false);
          }
        } catch (err) {
          console.error('Error verifying recovery token:', err);
          toast.error('שגיאה באימות הטוקן');
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
      // First, verify we have a valid session to update the password
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // If no session, we need to verify the token again to create a temporary session
        const token = searchParams.get('token');
        if (token) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (verifyError || !data.session) {
            setError('הטוקן אינו תקף יותר. אנא בקש לינק חדש.');
            return;
          }
        }
      }
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        setError('שגיאה בעדכון הסיסמה. אנא נסה שוב.');
      } else {
        console.log('🔒 SECURITY: Password updated successfully - signing out for security');
        
        // SECURITY: Sign out the user after password update
        await supabase.auth.signOut();
        
        toast.success('הסיסמה עודכנה בהצלחה! אנא התחבר עם הסיסמה החדשה');
        
        // Redirect to login with success message
        setTimeout(() => {
          navigate('/login?message=password-updated');
        }, 2000);
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
      <div className="min-h-screen flex items-center justify-center bg-background px-3 sm:px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">בודק תוקף הלינק...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-3 sm:px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">לינק לא תקף</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
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
    <div className="min-h-screen flex items-center justify-center bg-background px-3 sm:px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-success" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">עדכון סיסמה</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
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