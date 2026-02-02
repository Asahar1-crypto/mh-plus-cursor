import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useInvitationDetails } from '@/hooks/useInvitationDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import { Clock, Users, Smartphone, Mail } from 'lucide-react';

const FamilyInvitation = () => {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const { status, invitationDetails, errorMessage } = useInvitationDetails(invitationId);

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <LoadingState />
      </div>
    );
  }

  if (status === 'error' || !invitationDetails) {
    return (
      <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <ErrorState message={errorMessage || 'ההזמנה לא נמצאה או שפגה תוקפה'} />
        <div className="mt-6">
          <Link to="/">
            <Button variant="outline">חזרה לעמוד הבית</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate time remaining
  const expiresAt = new Date(invitationDetails.expires_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

  // Determine if invitation is phone-based or email-based
  const isPhoneInvitation = !!invitationDetails.phoneNumber;
  // Both phone and email invitations go to /family-register (FamilyPhoneRegister component)
  const registerPath = `/family-register?invitationId=${invitationId}`;

  return (
    <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">הזמנה לחשבון משפחתי</CardTitle>
          <CardDescription>
            הוזמנת להצטרף לחשבון משותף במחציות פלוס
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">שם החשבון</p>
                <p className="text-sm text-muted-foreground">{invitationDetails.accountName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">מוזמן על ידי</p>
                <p className="text-sm text-muted-foreground">{invitationDetails.ownerName}</p>
              </div>
            </div>

            {/* Show phone or email based on invitation type */}
            {isPhoneInvitation && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">מספר טלפון</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">{invitationDetails.phoneNumber}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">זמן שנותר</p>
                <p className="text-sm text-muted-foreground">
                  {hoursLeft > 0 ? `${hoursLeft} שעות` : 'ההזמנה פגה'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {hoursLeft > 0 ? (
              <Link to={registerPath} className="w-full">
                <Button className="w-full" size="lg">
                  הצטרף למשפחה
                </Button>
              </Link>
            ) : (
              <div className="text-center">
                <p className="text-destructive text-sm mb-3">ההזמנה פגה תוקף</p>
                <p className="text-muted-foreground text-xs">
                  יש לבקש הזמנה חדשה מבעל החשבון
                </p>
              </div>
            )}
            
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full">
                חזרה לעמוד הבית
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FamilyInvitation;