import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Users, Calendar } from 'lucide-react';
import { OnboardingStepProps } from '../types';
import { MascotImage } from '@/components/mascot/MascotImage';

export const WelcomeStep: React.FC<OnboardingStepProps> = ({ onNext }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section — blue mascot with cyan glow halo (handoff spec) */}
      <div className="text-center space-y-4">
        <div className="relative mx-auto mb-4 inline-flex items-center justify-center animate-in zoom-in duration-500 delay-100">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 55%, rgba(0,209,255,0.35) 0%, transparent 60%)',
              transform: 'scale(2.5)',
            }}
          />
          <MascotImage
            kind="blue"
            pose="happy"
            size="xl"
            animate="idle"
            priority
            className="relative drop-shadow-2xl"
          />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-in slide-in-from-top duration-500 delay-200">
          ברוכים הבאים למערכת!
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto animate-in fade-in duration-500 delay-300">
          בואו נגדיר את החשבון שלכם בכמה שלבים פשוטים
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {[
          {
            icon: Users,
            title: 'הוספת ילדים',
            description: 'נרשום את כל הילדים במערכת',
            delay: 'delay-[400ms]',
          },
          {
            icon: Calendar,
            title: 'מחזור חיוב',
            description: 'נגדיר את תקופת החישוב החודשית',
            delay: 'delay-[500ms]',
          },
          {
            icon: TrendingUp,
            title: 'הוצאות קבועות',
            description: 'נוסיף הוצאות שחוזרות כל חודש',
            delay: 'delay-[600ms]',
          },
          {
            icon: Sparkles,
            title: 'הזמנת משתמש',
            description: 'נזמין את בן/בת הזוג למערכת',
            delay: 'delay-[700ms]',
          },
        ].map((feature, index) => (
          <div
            key={index}
            className={`group p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 ${feature.delay}`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-center animate-in fade-in duration-500 delay-[800ms]">
        <Button
          onClick={onNext}
          size="lg"
          className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 hover:shadow-xl px-8"
        >
          <span className="relative z-10 flex items-center gap-2">
            בואו נתחיל!
            <Sparkles className="w-4 h-4 animate-pulse" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground animate-in fade-in duration-500 delay-[900ms]">
        ⏱️ ייקח רק כמה דקות • 🔒 כל הנתונים מאובטחים
      </p>
    </div>
  );
};
