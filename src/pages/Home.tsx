
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-16 pb-24 md:py-32 text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          {/* Characters decorating the hero - positioned better */}
          <div className="hidden xl:block">
            <img 
              src="/lovable-uploads/e9bf6f60-cc06-4718-96eb-f82128689408.png" 
              alt="דמות כחולה" 
              className="absolute top-32 left-10 w-32 h-32 animate-float opacity-80"
            />
            <img 
              src="/lovable-uploads/16c3e8be-95e7-4147-9c81-dc24247fa58c.png" 
              alt="דמות כתומה" 
              className="absolute top-40 right-10 w-28 h-28 animate-pulse-slow opacity-80"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4">
            נהל <span className="text-primary">הוצאות משותפות</span><br />בקלות וביעילות
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            מערכת "מחציות פלוס" מאפשרת להורים לנהל הוצאות משותפות עבור ילדיהם בצורה פשוטה ושקופה
          </p>
          
          {/* Central character group - better sized */}
          <div className="flex justify-center mb-8 relative">
            <img 
              src="/lovable-uploads/74997e51-710c-4192-a927-7698afbc6d49.png" 
              alt="משפחת הארנקים" 
              className="w-72 md:w-80 lg:w-96 h-auto hover-scale drop-shadow-lg"
            />
            {/* Small floating characters around the main group */}
            <img 
              src="/lovable-uploads/2ce97581-2c68-491a-9df0-47c4edbaddc4.png" 
              alt="דמות ירוקה" 
              className="absolute -bottom-4 -left-8 w-20 h-20 animate-float opacity-90" 
              style={{ animationDelay: '1s' }}
            />
            <img 
              src="/lovable-uploads/d2d49bed-0cde-460a-8acc-c1f45e11f633.png" 
              alt="דמות אדומה" 
              className="absolute -bottom-4 -right-8 w-18 h-18 animate-pulse-slow opacity-90" 
              style={{ animationDelay: '0.5s' }}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/register')} className="text-lg">
              התחל להשתמש - חינם
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-lg">
              כניסה למשתמשים קיימים
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">למה להשתמש במחציות פלוס?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ניהול הוצאות פשוט</h3>
              <p className="text-muted-foreground">
                הזנה מהירה של הוצאות, שיוך לילדים ספציפיים וסיווג לפי קטגוריות
              </p>
              {/* Small character positioned better */}
              <img 
                src="/lovable-uploads/e9bf6f60-cc06-4718-96eb-f82128689408.png" 
                alt="דמות כחולה" 
                className="absolute -top-2 -right-2 w-12 h-12 opacity-60 group-hover:opacity-100 group-hover:animate-bounce transition-all"
              />
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">שיתוף ושקיפות</h3>
              <p className="text-muted-foreground">
                שיתוף מלא בין ההורים, תיעוד כל פעולה, ושקיפות מלאה בכל ההוצאות
              </p>
              <img 
                src="/lovable-uploads/16c3e8be-95e7-4147-9c81-dc24247fa58c.png" 
                alt="דמות כתומה" 
                className="absolute -top-2 -right-2 w-12 h-12 opacity-60 group-hover:opacity-100 group-hover:animate-bounce transition-all"
              />
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">התחשבנות פשוטה</h3>
              <p className="text-muted-foreground">
                מעקב אחר תשלומים, חישוב חלוקת הוצאות הוגנת, דוחות התחשבנות חודשיים
              </p>
              <img 
                src="/lovable-uploads/2ce97581-2c68-491a-9df0-47c4edbaddc4.png" 
                alt="דמות ירוקה" 
                className="absolute -top-2 -right-2 w-12 h-12 opacity-60 group-hover:opacity-100 group-hover:animate-bounce transition-all"
              />
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ניהול הוצאות קבועות</h3>
              <p className="text-muted-foreground">
                הגדרת הוצאות חוזרות, תזכורות אוטומטיות, ומעקב אחר תשלומים שוטפים
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">אישור הוצאות</h3>
              <p className="text-muted-foreground">
                תהליך אישור הוצאות מובנה, מאפשר לכל הורה לאשר או לדחות הוצאות לפני התשלום
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">סטטיסטיקות וניתוחים</h3>
              <p className="text-muted-foreground">
                גרפים ודוחות מפורטים, ניתוח מגמות הוצאות, והתראות על חריגות
              </p>
              <img 
                src="/lovable-uploads/d2d49bed-0cde-460a-8acc-c1f45e11f633.png" 
                alt="דמות אדומה" 
                className="absolute -top-2 -right-2 w-12 h-12 opacity-60 group-hover:opacity-100 group-hover:animate-bounce transition-all"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">מוכנים להתחיל?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            הצטרפו כבר היום למשפחות רבות שמנהלות את ההוצאות המשותפות שלהן בצורה חכמה ויעילה
          </p>
          <Button size="lg" onClick={() => navigate('/register')} className="text-lg">
            הרשמה חינמית
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center">
                  <span className="font-bold text-white">מ+</span>
                </div>
                <span className="text-xl font-bold">מחציות פלוס</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">© 2025 כל הזכויות שמורות</p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">תנאי שימוש</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">פרטיות</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">צור קשר</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
