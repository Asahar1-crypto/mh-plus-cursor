import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PhoneExistsAlertProps {
  phoneNumber: string;
  userName?: string;
  onBack: () => void;
}

const PhoneExistsAlert: React.FC<PhoneExistsAlertProps> = ({
  phoneNumber,
  userName,
  onBack
}) => {
  return (
    <Card className="border-border shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
          <AlertTriangle className="h-7 w-7 text-accent-foreground" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          מספר הטלפון כבר רשום
        </CardTitle>
        <CardDescription className="text-base">
          {userName ? (
            <>
              המספר <span className="font-semibold text-foreground" dir="ltr">{phoneNumber}</span> כבר רשום במערכת עבור <span className="font-semibold text-foreground">{userName}</span>
            </>
          ) : (
            <>
              המספר <span className="font-semibold text-foreground" dir="ltr">{phoneNumber}</span> כבר רשום במערכת
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            אם שכחת את הסיסמה שלך, תוכל לאפס אותה באמצעות כתובת האימייל
          </p>
        </div>
        
        <div className="space-y-3">
          <Link to="/forgot-password" className="block">
            <Button className="w-full gap-2" size="lg">
              <KeyRound className="h-4 w-4" />
              עבור לאיפוס סיסמה
            </Button>
          </Link>
          
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full">
              כבר יש לי את הסיסמה - התחברות
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            חזור להרשמה עם מספר אחר
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneExistsAlert;
