
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Account } from '@/contexts/auth/types';

interface NotificationsCardProps {
  account?: Account | null;
}

const NotificationsCard: React.FC<NotificationsCardProps> = ({ account }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות התראות</CardTitle>
        <CardDescription>קבע כיצד תקבל התראות מהמערכת</CardDescription>
      </CardHeader>
      <CardContent>
        {account?.isSharedAccount ? (
          <p className="text-muted-foreground mb-4">
            אתה משתתף בחשבון משותף. התראות על פעילויות בחשבון יישלחו לבעל החשבון ואליך.
          </p>
        ) : account?.sharedWithId ? (
          <p className="text-muted-foreground mb-4">
            החשבון משותף עם {account.sharedWithName || account.sharedWithEmail}. התראות יישלחו לשניכם.
          </p>
        ) : (
          <p className="text-muted-foreground mb-4">
            בקרוב - ניהול התראות מתקדם
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsCard;
