import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Edit2, Mail } from 'lucide-react';

const UserProfileCard: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleSave = async () => {
    if (!user || !name.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      
      toast({
        title: "השם עודכן בהצלחה",
        description: "השם החדש יופיע בכל רחבי המערכת",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "שגיאה בעדכון השם",
        description: "אנא נסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          פרופיל משתמש
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">כתובת מייל</Label>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-muted flex-1"
            />
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4" />
                  שנה
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>שנה כתובת מייל</DialogTitle>
                  <DialogDescription>
                    הזן כתובת מייל חדשה. תקבל אימייל אישור בשתי הכתובות.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-email">כתובת נוכחית</Label>
                    <Input
                      id="current-email"
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">כתובת חדשה</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="הזן כתובת מייל חדשה"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEmailDialogOpen(false);
                      setNewEmail('');
                    }}
                  >
                    ביטול
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('שינוי מייל ל:', newEmail);
                      // כאן נוסיף את הלוגיקה בשלב הבא
                    }}
                    disabled={!newEmail.trim() || newEmail === user.email}
                  >
                    שלח אישור
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            כתובת המייל ניתנת לשינוי אחרי אישור באימייל
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">שם לתצוגה</Label>
          {isEditing ? (
            <div className="space-y-3">
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הכנס שם לתצוגה"
                maxLength={50}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !name.trim()}
                  size="sm"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      שומר...
                    </span>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      שמור
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {profile?.name || 'לא הוגדר שם'}
              </span>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit2 className="h-4 w-4" />
                ערוך
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            השם הזה יופיע בכל רחבי המערכת במקום כתובת המייל
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;