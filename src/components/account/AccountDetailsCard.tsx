
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Account } from '@/contexts/auth/types';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';

interface AccountDetailsCardProps {
  account: Account | null;
}

const AccountDetailsCard: React.FC<AccountDetailsCardProps> = ({ account }) => {
  const { updateAccountName } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(account?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!account) return null;

  const isAdmin = account.userRole === 'admin';

  const handleEdit = () => {
    setEditedName(account.name || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedName(account.name || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast.error('שם החשבון לא יכול להיות רק');
      return;
    }

    if (editedName === account.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateAccountName(editedName.trim());
      setIsEditing(false);
      toast.success('שם החשבון עודכן בהצלחה');
    } catch (error) {
      toast.error('שגיאה בעדכון שם החשבון');
      console.error('Error updating account name:', error);
    } finally {
      setIsUpdating(false);
    }
  };

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
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Input 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="הכנס שם חשבון"
                      disabled={isUpdating}
                    />
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isUpdating}
                      className="px-3"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isUpdating}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input value={account.name || ''} readOnly />
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEdit}
                        className="px-3"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              {isAdmin && !isEditing && (
                <p className="text-xs text-muted-foreground">
                  כאדמין, אתה יכול לערוך את שם החשבון
                </p>
              )}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountDetailsCard;
