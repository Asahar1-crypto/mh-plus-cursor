import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, TrendingUp, Users, Calendar } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import confetti from 'canvas-confetti';

export const SuccessStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#8B5CF6', '#EC4899', '#10B981'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#8B5CF6', '#EC4899', '#10B981'],
      });
    }, 50);

    // Fade in animation
    setTimeout(() => setShow(true), 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`space-y-8 transition-all duration-1000 ${
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <div className="w-32 h-32 rounded-full bg-primary/20" />
          </div>
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center animate-in zoom-in duration-700">
            <CheckCircle2 className="w-16 h-16 text-primary-foreground animate-in zoom-in duration-1000 delay-300" />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center space-y-4 animate-in slide-in-from-bottom duration-700 delay-200">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          מעולה! הכל מוכן
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          החשבון שלכם הוגדר בהצלחה ואתם מוכנים להתחיל לנהל את ההוצאות המשפחתיות
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {[
          {
            icon: Users,
            title: 'ילדים',
            description: 'נוספו למערכת',
            color: 'from-blue-500 to-cyan-500',
            delay: 'delay-[400ms]',
          },
          {
            icon: Calendar,
            title: 'מחזור חיוב',
            description: 'הוגדר בהצלחה',
            color: 'from-purple-500 to-pink-500',
            delay: 'delay-[500ms]',
          },
          {
            icon: TrendingUp,
            title: 'הוצאות קבועות',
            description: 'מוכנות לשימוש',
            color: 'from-green-500 to-emerald-500',
            delay: 'delay-[600ms]',
          },
          {
            icon: Sparkles,
            title: 'הזמנות',
            description: 'נשלחו בהצלחה',
            color: 'from-orange-500 to-red-500',
            delay: 'delay-[700ms]',
          },
        ].map((item, index) => (
          <div
            key={index}
            className={`group p-6 rounded-xl bg-gradient-to-br ${item.color} text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl animate-in fade-in slide-in-from-bottom-2 ${item.delay}`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-white/80">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div className="p-6 rounded-xl bg-muted/50 border space-y-3 animate-in fade-in duration-700 delay-[800ms]">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          מה הלאה?
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            '📝 התחילו להוסיף הוצאות יומיות',
            '📊 צפו בדוחות ובנתונים בדשבורד',
            '💰 עקבו אחר התקציב החודשי',
            '🤝 נהלו את החשבון ביחד עם בן/בת הזוג',
          ].map((text, index) => (
            <li key={index} className="flex items-start gap-2">
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center animate-in fade-in duration-700 delay-[900ms]">
        <Button
          onClick={onNext}
          size="lg"
          className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 hover:shadow-2xl px-12 py-6 text-lg"
        >
          <span className="relative z-10 flex items-center gap-2">
            בואו נתחיל!
            <Sparkles className="w-5 h-5 animate-pulse" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </Button>
      </div>
    </div>
  );
};
