
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Account } from '@/contexts/auth/types';

interface AccountDetailsCardProps {
  account: Account | null;
}

const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({ account }) => {
  if (!account) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>פרטי חשבון</CardTitle>
        <CardDescription>עדכן את פרטי החשבון שלך</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">שם החשבון</label>
              <Input value={account.name || ''} readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">סוג חשבון</label>
              <Input 
                value={account.isSharedAccount ? 'חשבון משותף (משתתף)' : account.sharedWithId ? 'חשבון משותף (בעלים)' : 'חשבון משפחה'} 
                readOnly 
              />
            </div>
          </div>
          {account.isSharedAccount && (
            <div className="mt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">בעל החשבון</label>
                <Input value={account.ownerName || 'לא ידוע'} readOnly />
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button>שמור שינויים</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountDetailsCard;
