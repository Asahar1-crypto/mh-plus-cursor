
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Crown } from 'lucide-react';
import AccountSwitcher from './AccountSwitcher';

const UserAccountsCard = () => {
  const { userAccounts, account, switchAccount, isLoading } = useAuth();

  if (isLoading || !userAccounts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            החשבונות שלי
          </CardTitle>
          <CardDescription>
            נתוני החשבונות טוענים...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allAccounts = [...userAccounts.ownedAccounts, ...userAccounts.sharedAccounts];

  const handleSwitchToAccount = async (accountId: string) => {
    if (accountId !== account?.id) {
      try {
        await switchAccount(accountId);
      } catch (error) {
        console.error('Failed to switch account:', error);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          החשבונות שלי
        </CardTitle>
        <CardDescription>
          כל החשבונות שאתה משוייך אליהם - בעלים או שותף
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allAccounts.length > 1 && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">החלפת חשבון פעיל:</h4>
            <AccountSwitcher />
          </div>
        )}
        
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            חשבונות בבעלותך ({userAccounts.ownedAccounts.length})
          </h4>
          {userAccounts.ownedAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין חשבונות בבעלותך</p>
          ) : (
            userAccounts.ownedAccounts.map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  acc.id === account?.id ? 'bg-primary/5 border-primary' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {acc.sharedWithEmail ? `שותף: ${acc.sharedWithEmail}` : 'ללא שותפים'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default">בעלים</Badge>
                  {acc.id === account?.id && (
                    <Badge variant="outline">פעיל</Badge>
                  )}
                  {acc.id !== account?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchToAccount(acc.id)}
                    >
                      עבור
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            חשבונות משותפים ({userAccounts.sharedAccounts.length})
          </h4>
          {userAccounts.sharedAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין חשבונות משותפים</p>
          ) : (
            userAccounts.sharedAccounts.map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  acc.id === account?.id ? 'bg-primary/5 border-primary' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      בעלים: {acc.ownerName || 'לא ידוע'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">שותף</Badge>
                  {acc.id === account?.id && (
                    <Badge variant="outline">פעיל</Badge>
                  )}
                  {acc.id !== account?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchToAccount(acc.id)}
                    >
                      עבור
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserAccountsCard;
