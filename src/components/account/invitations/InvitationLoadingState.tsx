
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export const InvitationLoadingState: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          הזמנות ממתינות
        </CardTitle>
        <CardDescription>
          הזמנות שהתקבלו להצטרפות לחשבונות משותפים
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">טוען הזמנות...</p>
        </div>
      </CardContent>
    </Card>
  );
};
