
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Wallet, Users, BarChart3, RefreshCw, ShieldCheck, PieChart, ArrowLeft, Heart } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';

/* Lightweight scroll-reveal: adds .is-visible when element enters viewport */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); observer.unobserve(el); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const StatCounter = ({ target, label }: { target: number; label: string }) => {
  const value = useAnimatedCounter(target, 1200);
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold text-primary">{value.toLocaleString()}+</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const featuresRef = useScrollReveal();
  const socialRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with animated gradient background */}
      <section className="relative pt-8 pb-12 sm:pt-16 sm:pb-24 md:py-32 text-center overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 right-[10%] w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-[15%] w-56 h-56 bg-secondary/15 rounded-full blur-3xl animate-float [animation-delay:2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight">
              נהל{' '}
              <span className="bg-gradient-to-l from-primary via-secondary to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x">
                הוצאות משותפות
              </span>
              <br />בקלות וביעילות
            </h1>
          </div>
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-2 animate-fade-in [animation-delay:150ms]">
            מערכת "מחציות פלוס" מאפשרת להורים לנהל הוצאות משותפות עבור ילדיהם בצורה פשוטה ושקופה
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0 animate-fade-in [animation-delay:300ms]">
            <Button size="lg" onClick={() => navigate('/register')} className="text-sm sm:text-lg h-11 sm:h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow duration-300">
              התחל להשתמש - חינם
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-sm sm:text-lg h-11 sm:h-12">
              כניסה למשתמשים קיימים
            </Button>
          </div>
          <div className="mt-4 animate-fade-in [animation-delay:400ms]">
            <Button variant="link" onClick={() => navigate('/pricing')} className="text-sm text-muted-foreground hover:text-primary">
              צפה בתוכניות ומחירים →
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section ref={socialRef} className="py-8 sm:py-12 border-y border-border/50 bg-muted/20 scroll-reveal">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 sm:gap-12 max-w-2xl mx-auto">
            <StatCounter target={1200} label="משפחות פעילות" />
            <StatCounter target={45000} label="הוצאות נוהלו" />
            <StatCounter target={98} label="אחוז שביעות רצון" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-6 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            <span>נבחרנו כפלטפורמה המומלצת לניהול הוצאות משותפות</span>
          </div>
        </div>
      </section>

      {/* Features Section - scroll triggered */}
      <section className="py-8 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-bold text-center mb-6 sm:mb-12">למה להשתמש במחציות פלוס?</h2>
          <div ref={featuresRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 scroll-reveal">
            {[
              { icon: Wallet, title: 'ניהול הוצאות פשוט', desc: 'הזנה מהירה של הוצאות, שיוך לילדים ספציפיים וסיווג לפי קטגוריות', color: 'from-cyan-500 to-blue-500' },
              { icon: Users, title: 'שיתוף ושקיפות', desc: 'שיתוף מלא בין ההורים, תיעוד כל פעולה, ושקיפות מלאה בכל ההוצאות', color: 'from-violet-500 to-purple-500' },
              { icon: BarChart3, title: 'התחשבנות פשוטה', desc: 'מעקב אחר תשלומים, חישוב חלוקת הוצאות הוגנת, דוחות התחשבנות חודשיים', color: 'from-emerald-500 to-teal-500' },
              { icon: RefreshCw, title: 'ניהול הוצאות קבועות', desc: 'הגדרת הוצאות חוזרות, תזכורות אוטומטיות, ומעקב אחר תשלומים שוטפים', color: 'from-amber-500 to-orange-500' },
              { icon: ShieldCheck, title: 'אישור הוצאות', desc: 'תהליך אישור הוצאות מובנה, מאפשר לכל הורה לאשר או לדחות הוצאות לפני התשלום', color: 'from-rose-500 to-pink-500' },
              { icon: PieChart, title: 'סטטיסטיקות וניתוחים', desc: 'גרפים ודוחות מפורטים, ניתוח מגמות הוצאות, והתראות על חריגות', color: 'from-sky-500 to-indigo-500' },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 group scroll-reveal-item"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-12 sm:py-20 bg-gradient-to-b from-background to-muted/40 scroll-reveal">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6">מוכנים להתחיל?</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
            הצטרפו כבר היום למשפחות רבות שמנהלות את ההוצאות המשותפות שלהן בצורה חכמה ויעילה
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="text-sm sm:text-lg h-11 sm:h-12 shadow-lg shadow-primary/25">
            הרשמה חינמית
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-right">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="font-bold text-white text-xs sm:text-sm">מ+</span>
                </div>
                <span className="text-lg sm:text-xl font-bold">מחציות פלוס</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">© 2026 כל הזכויות שמורות</p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <a href="/pricing" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">מחירים</a>
              <a href="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">תנאי שימוש</a>
              <a href="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">פרטיות</a>
              <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
