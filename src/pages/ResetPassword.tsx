import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isTokenChecking, setIsTokenChecking] = useState(true);

  // Store tokens from URL (do NOT verify on load - security: no session created until user submits)
  const [urlTokens, setUrlTokens] = useState<{ token?: string; type?: string; accessToken?: string; refreshToken?: string } | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
    
    const token = searchParams.get('token') || hashParams.get('token');
    const type = searchParams.get('type') || hashParams.get('type');
    const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
    
    if (token && type === 'recovery') {
      setUrlTokens({ token, type });
      setIsValidToken(true);
    } else if (accessToken && refreshToken) {
      setUrlTokens({ accessToken, refreshToken });
      setIsValidToken(true);
    } else {
      setIsValidToken(false);
    }
    setIsTokenChecking(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    if (!urlTokens) {
      setError('הטוקן אינו תקף יותר. אנא בקש לינק חדש.');
      return;
    }

    setIsLoading(true);

    try {
      // SECURITY: Create session ONLY when user submits - minimal window for token exposure
      if (urlTokens.token && urlTokens.type === 'recovery') {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: urlTokens.token,
          type: 'recovery'
        });
        
        if (verifyError || !data.session) {
          setError('הטוקן אינו תקף יותר. אנא בקש לינק חדש.');
          setIsLoading(false);
          return;
        }
      } else if (urlTokens.accessToken && urlTokens.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: urlTokens.accessToken,
          refresh_token: urlTokens.refreshToken
        });

        if (sessionError) {
          setError('הטוקן אינו תקף יותר. אנא בקש לינק חדש.');
          setIsLoading(false);
          return;
        }
      } else {
        setError('הטוקן אינו תקף יותר. אנא בקש לינק חדש.');
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Password update error:', error);
        setError('שגיאה בעדכון הסיסמה. אנא נסה שוב.');
      } else {
        await supabase.auth.signOut();
        toast.success('הסיסמה עודכנה בהצלחה! אנא התחבר עם הסיסמה החדשה');
        setTimeout(() => navigate('/login?message=password-updated'), 2000);
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