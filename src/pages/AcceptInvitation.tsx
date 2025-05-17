import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InvitationDetails {
  ownerName: string;
  accountName: string;
  email: string;
}

// Define the shape of the data returned by Supabase when fetching invitation details
interface ProfileData {
  name: string;
}

interface AccountData {
  id: string;
  name: string;
  owner_id: string;
  profiles: ProfileData[];
}

interface InvitationData {
  id: string;
  email: string;
  invitation_id: string;
  accounts: AccountData;
}

const AcceptInvitation = () => {
  const { invitationId } = useParams();
  const { isAuthenticated, acceptInvitation, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  
  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      return;
    }
    
    // Fetch invitation details
    const fetchInvitationDetails = async () => {
      try {
        // First try to get from Supabase
        const { data: invitations, error } = await supabase
          .from('invitations')
          .select(`
            id,
            email,
            invitation_id,
            accounts:account_id (
              id,
              name,
              owner_id,
              profiles(name)
            )
          `)
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        if (!invitations || invitations.length === 0) {
          // Fallback to localStorage for demo purposes
          const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
          const invitation = pendingInvitations[invitationId];
          
          if (!invitation) {
            setStatus('error');
            return;
          }
          
          // Construct detail from localStorage data
          setInvitationDetails({
            ownerName: invitation.ownerName || 'בעל החשבון',
            accountName: invitation.name || 'חשבון משותף',
            email: invitation.sharedWithEmail || '',
          });
        } else {
          // Use supabase data
          const invitation = invitations[0] as InvitationData;
          const account = invitation.accounts;
          
          setInvitationDetails({
            // Access the owner's name safely from the profiles array
            ownerName: account?.profiles && account.profiles.length > 0 
              ? account.profiles[0].name 
              : 'בעל החשבון',
            accountName: account?.name || 'חשבון משותף',
            email: invitation.email || '',
          });
        }
        
        setStatus('success');
        
        // If the user is authenticated but the invitation is for a different email, show an error
        if (isAuthenticated && user && invitationDetails && user.email !== invitationDetails.email) {
          toast.error(`ההזמנה מיועדת לכתובת ${invitationDetails.email} אך אתה מחובר עם ${user.email}. יש להתנתק ולהתחבר עם החשבון המתאים.`);
          setStatus('error');
        }
        
      } catch (error) {
        console.error('Error fetching invitation:', error);
        setStatus('error');
      }
    };
    
    // Add a short delay to simulate loading
    const timer = setTimeout(() => {
      fetchInvitationDetails();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [invitationId, isAuthenticated, user]);
  
  const handleAccept = async () => {
    if (!invitationId) return;
    
    setIsProcessing(true);
    try {
      await acceptInvitation(invitationId);
      
      // Navigate to dashboard after successful acceptance
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDecline = () => {
    navigate('/');
  };
  
  // Show Login button if not authenticated
  const handleLogin = () => {
    if (invitationDetails) {
      // Store the invitation ID to redirect back after login
      sessionStorage.setItem('pendingInvitationId', invitationId || '');
      navigate('/login');
    } else {
      navigate('/login');
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      {status === 'loading' && (
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center mt-4">טוען את פרטי ההזמנה...</p>
          </CardContent>
        </Card>
      )}
      
      {status === 'error' && (
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">הזמנה לא תקפה</CardTitle>
            <CardDescription>
              ההזמנה שהתבקשת לקבל אינה קיימת או שפג תוקפה
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-2">
            <Button onClick={() => navigate('/')}>
              חזרה לדף הבית
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {status === 'success' && (
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">{"הוזמנת לחשבון משותף"}</CardTitle>
            <CardDescription>
              {"הוזמנת להצטרף לחשבון \"מחציות פלוס\" לניהול הוצאות משותפות"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium mb-2">{"פרטי ההזמנה:"}</h3>
                {invitationDetails && (
                  <>
                    <p className="text-sm"><strong>{"מזמין:"}</strong> {invitationDetails.ownerName}</p>
                    <p className="text-sm"><strong>{"חשבון:"}</strong> {invitationDetails.accountName}</p>
                    <p className="text-sm"><strong>{"הזמנה לאימייל:"}</strong> {invitationDetails.email}</p>
                    <p className="text-sm"><strong>{"תפקיד:"}</strong> {"שותף בחשבון"}</p>
                  </>
                )}
              </div>
              
              {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
                  <p>{"עליך להיות מחובר/ת כדי לקבל את ההזמנה הזו."}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/register')}>
                      {"הרשמה"}
                    </Button>
                    <Button size="sm" onClick={() => {
                      // Store the invitation ID to redirect back after login
                      sessionStorage.setItem('pendingInvitationId', invitationId || '');
                      navigate('/login');
                    }}>
                      {"התחברות"}
                    </Button>
                  </div>
                </div>
              )}
              
              {isAuthenticated && user && invitationDetails && user.email !== invitationDetails.email && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
                  <p>{"ההזמנה מיועדת לכתובת"} {invitationDetails.email} {"אך אתה מחובר עם"} {user.email}.</p>
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-300 text-red-700"
                      onClick={async () => {
                        // התנתקות מהחשבון הנוכחי
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                    >
                      {"התנתק וחזור להזמנה"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              {"דחה הזמנה"}
            </Button>
            <Button 
              onClick={async () => {
                if (!invitationId) return;
                
                setIsProcessing(true);
                try {
                  await acceptInvitation(invitationId);
                  
                  // Navigate to dashboard after successful acceptance
                  setTimeout(() => {
                    navigate('/dashboard');
                  }, 1500);
                } catch (error) {
                  console.error('Error accepting invitation:', error);
                  setStatus('error');
                } finally {
                  setIsProcessing(false);
                }
              }}
              disabled={
                !isAuthenticated || 
                isProcessing || 
                (user && invitationDetails && user.email !== invitationDetails.email)
              }
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {"מקבל הזמנה..."}
                </span>
              ) : (
                "קבל הזמנה"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default AcceptInvitation;
