import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Edit2 } from 'lucide-react';

const UserProfileCard: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isLoading, setIsLoading] = useState(false);

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
          <Input
            id="email"
            type="email"
            value={user.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            כתובת המייל לא ניתנת לשינוי
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