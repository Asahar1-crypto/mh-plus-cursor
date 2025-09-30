import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const ChangePasswordCard: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          שינוי סיסמה
        </CardTitle>
        <CardDescription>
          עדכן את הסיסמה שלך לסיסמה חדשה ומאובטחת
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* סיסמה נוכחית */}
        <div className="space-y-2">
          <Label htmlFor="current-password">סיסמה נוכחית</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="הכנס את הסיסמה הנוכחית"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* סיסמה חדשה */}
        <div className="space-y-2">
          <Label htmlFor="new-password">סיסמה חדשה</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="הכנס סיסמה חדשה (מינימום 6 תווים)"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* אינדיקטור חוזק סיסמה */}
          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                <div className={`h-1 flex-1 rounded ${newPassword.length >= 6 ? 'bg-yellow-500' : 'bg-muted'}`} />
                <div className={`h-1 flex-1 rounded ${newPassword.length >= 8 && /[A-Z]/.test(newPassword) ? 'bg-orange-500' : 'bg-muted'}`} />
                <div className={`h-1 flex-1 rounded ${newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-muted'}`} />
              </div>
              <p className="text-xs text-muted-foreground">
                {newPassword.length < 6 && 'סיסמה חלשה - הוסף לפחות 6 תווים'}
                {newPassword.length >= 6 && newPassword.length < 8 && 'סיסמה בינונית - הוסף אות גדולה'}
                {newPassword.length >= 8 && /[A-Z]/.test(newPassword) && !/[0-9]/.test(newPassword) && 'סיסמה טובה - הוסף מספרים'}
                {newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && 'סיסמה חזקה!'}
              </p>
            </div>
          )}
        </div>

        {/* אימות סיסמה */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password">אימות סיסמה חדשה</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הכנס שוב את הסיסמה החדשה"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-xs text-destructive">
              הסיסמאות אינן תואמות
            </p>
          )}
        </div>

        {/* כפתור עדכון */}
        <Button
          className="w-full"
          disabled={
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            newPassword !== confirmPassword ||
            newPassword.length < 6
          }
        >
          עדכן סיסמה
        </Button>

        <p className="text-xs text-muted-foreground">
          לאחר שינוי הסיסמה, תידרש להתחבר מחדש עם הסיסמה החדשה
        </p>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
