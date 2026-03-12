
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Wallet, Users, BarChart3, RefreshCw, ShieldCheck, PieChart } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-8 pb-12 sm:pt-16 sm:pb-24 md:py-32 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight">
            נהל <span className="text-primary">הוצאות משותפות</span><br />בקלות וביעילות
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
            מערכת "מחציות פלוס" מאפשרת להורים לנהל הוצאות משותפות עבור ילדיהם בצורה פשוטה ושקופה
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button size="lg" onClick={() => navigate('/register')} className="text-sm sm:text-lg h-11 sm:h-12">
              התחל להשתמש - חינם
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-sm sm:text-lg h-11 sm:h-12">
              כניסה למשתמשים קיימים
            </Button>
          </div>
          <div className="mt-4">
            <Button variant="link" onClick={() => navigate('/pricing')} className="text-sm text-muted-foreground hover:text-primary">
              צפה בתוכניות ומחירים →
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-8 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-3xl font-bold text-center mb-6 sm:mb-12">למה להשתמש במחציות פלוס?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[
              { icon: Wallet, title: 'ניהול הוצאות פשוט', desc: 'הזנה מהירה של הוצאות, שיוך לילדים ספציפיים וסיווג לפי קטגוריות', color: 'from-cyan-500 to-blue-500' },
              { icon: Users, title: 'שיתוף ושקיפות', desc: 'שיתוף מלא בין ההורים, תיעוד כל פעולה, ושקיפות מלאה בכל ההוצאות', color: 'from-violet-500 to-purple-500' },
              { icon: BarChart3, title: 'התחשבנות פשוטה', desc: 'מעקב אחר תשלומים, חישוב חלוקת הוצאות הוגנת, דוחות התחשבנות חודשיים', color: 'from-emerald-500 to-teal-500' },
              { icon: RefreshCw, title: 'ניהול הוצאות קבועות', desc: 'הגדרת הוצאות חוזרות, תזכורות אוטומטיות, ומעקב אחר תשלומים שוטפים', color: 'from-amber-500 to-orange-500' },
              { icon: ShieldCheck, title: 'אישור הוצאות', desc: 'תהליך אישור הוצאות מובנה, מאפשר לכל הורה לאשר או לדחות הוצאות לפני התשלום', color: 'from-rose-500 to-pink-500' },
              { icon: PieChart, title: 'סטטיסטיקות וניתוחים', desc: 'גרפים ודוחות מפורטים, ניתוח מגמות הוצאות, והתראות על חריגות', color: 'from-sky-500 to-indigo-500' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
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
      <section className="py-12 sm:py-20 bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6">מוכנים להתחיל?</h2>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
            הצטרפו כבר היום למשפחות רבות שמנהלות את ההוצאות המשותפות שלהן בצורה חכמה ויעילה
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="text-sm sm:text-lg h-11 sm:h-12">
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
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-brand-500 flex items-center justify-center">
                  <span className="font-bold text-white text-xs sm:text-sm">מ+</span>
                </div>
                <span className="text-lg sm:text-xl font-bold">מחציות פלוס</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">© 2026 כל הזכויות שמורות</p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <a href="/pricing" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">מחירים</a>
              <a href="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">תנאי שימוש</a>
              <a href="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">פרטיות</a>
              <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
