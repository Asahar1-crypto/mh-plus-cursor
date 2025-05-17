
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const NotificationsCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות התראות</CardTitle>
        <CardDescription>קבע כיצד תקבל התראות מהמערכת</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          בקרוב - ניהול התראות מתקדם
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationsCard;
