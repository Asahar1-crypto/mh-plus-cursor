
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Account } from '@/contexts/auth/types';
import { NotificationSettings } from '@/components/notifications';

interface NotificationsCardProps {
  account?: Account | null;
}

const NotificationsCard: React.FC<NotificationsCardProps> = ({ account }) => {
  return (
    <div className="space-y-4">
      {account?.isSharedAccount && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-sm">
              אתה משתתף בחשבון משותף. התראות על פעילויות בחשבון יישלחו לבעל החשבון ואליך.
            </p>
          </CardContent>
        </Card>
      )}

      <NotificationSettings />
    </div>
  );
};

export default NotificationsCard;
