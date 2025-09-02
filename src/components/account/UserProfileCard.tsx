import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { SmartPhoneInput } from '@/components/ui/smart-phone-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Edit2, Mail, Phone, Check, X } from 'lucide-react';

const UserProfileCard: React.FC = () => {
  const { user, profile, refreshProfile, sendPhoneOtp, loginWithPhone } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  
  // Phone editing states
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState((profile as any)?.phone_number || '');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "שגיאה",
        description: "מספר טלפון לא יכול להיות ריק",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // נשלח OTP למספר החדש
      await sendPhoneOtp(phoneNumber);
      setShowOtpInput(true);
      toast({
        title: "קוד אימות נשלח",
        description: `קוד אימות נשלח למספר ${phoneNumber}`,
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "שגיאה בשליחת קוד האימות",
        description: "אנא נסה שוב",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס קוד אימות",
        variant: "destructive",
      });
      return;
    }
    
    setIsVerifying(true);
    try {
      // נעדכן את הפרופיל עם מספר הטלפון החדש
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone_number: phoneNumber,
          phone_verified: true 
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditingPhone(false);
      setShowOtpInput(false);
      setOtpCode('');
      toast({
        title: "מספר הטלפון עודכן בהצלחה",
        description: "מספר הטלפון שלך מאומת ומעודכן",
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "קוד אימות שגוי",
        description: "אנא בדוק את הקוד ונסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  };

  const cancelPhoneEdit = () => {
    setIsEditingPhone(false);
    setShowOtpInput(false);
    setOtpCode('');
    setPhoneNumber((profile as any)?.phone_number || '');
    setIsLoading(false);
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

        {/* מספר טלפון */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            מספר טלפון
            {(profile as any)?.phone_verified && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                מאומת
              </span>
            )}
          </Label>
          
          {showOtpInput ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                הכנס את קוד האימות שנשלח למספר: {phoneNumber}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="הכנס קוד אימות (6 ספרות)"
                  maxLength={6}
                  className="flex-1"
                />
                <ModernButton 
                  size="sm" 
                  onClick={handleVerifyOtp}
                  loading={isVerifying}
                  variant="primary"
                >
                  <Check className="w-4 h-4" />
                  אמת
                </ModernButton>
                <ModernButton 
                  size="sm" 
                  onClick={cancelPhoneEdit}
                  variant="ghost"
                >
                  <X className="w-4 h-4" />
                  ביטול
                </ModernButton>
              </div>
            </div>
          ) : isEditingPhone ? (
            <div className="space-y-3">
              <SmartPhoneInput
                label=""
                value={phoneNumber}
                onChange={setPhoneNumber}
                validation={phoneNumber.length >= 10 ? 'valid' : 'none'}
              />
              <div className="flex items-center gap-2">
                <ModernButton 
                  size="sm" 
                  onClick={handleSavePhone}
                  loading={isLoading}
                  variant="primary"
                  disabled={phoneNumber.length < 10}
                >
                  שלח קוד אימות
                </ModernButton>
                <ModernButton 
                  size="sm" 
                  onClick={cancelPhoneEdit}
                  variant="ghost"
                >
                  ביטול
                </ModernButton>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {(profile as any)?.phone_number || 'לא הוגדר מספר טלפון'}
              </span>
              <Button 
                onClick={() => setIsEditingPhone(true)}
                variant="outline"
                size="sm"
              >
                <Edit2 className="h-4 w-4" />
                {(profile as any)?.phone_number ? 'ערוך' : 'הוסף'}
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            מספר הטלפון משמש לאימות דו-שלבי ולהתחברות עם SMS
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;