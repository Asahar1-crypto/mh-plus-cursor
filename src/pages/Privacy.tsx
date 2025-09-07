import React from 'react';
import { Mail } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="prose prose-lg mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            מדיניות פרטיות – מחציות פלוס
          </h1>
          <p className="text-lg text-muted-foreground">
            עודכן לאחרונה: ספטמבר 2025
          </p>
        </header>
        
        <div className="space-y-8 text-foreground leading-relaxed">
          <section className="bg-muted/30 p-6 rounded-lg">
            <p className="text-lg">
              אפליקציית מחציות פלוס ("האפליקציה") ואתר mhplus.online ("האתר") מופעלים ומנוהלים על ידי החברה/המפעיל (להלן: "החברה", "אנחנו"). 
              מסמך זה נועד להסביר למשתמשי האפליקציה והאתר ("המשתמש", "אתה") כיצד אנו אוספים, משתמשים, מאחסנים ומגנים על המידע האישי שלך.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              1. סוגי מידע שנאסף
            </h2>
            <p className="mb-4">בעת שימושך באפליקציה ובאתר אנו עשויים לאסוף ולעבד את סוגי המידע הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li><strong>פרטים אישיים:</strong> שם מלא, כתובת דוא״ל, מספר טלפון.</li>
              <li><strong>פרטים על בני משפחה:</strong> פרטי בני זוג וילדים כפי שהוזנו על ידך.</li>
              <li><strong>פרטי שימוש:</strong> סכומים, שמות רכישות והוצאות משותפות.</li>
            </ul>
            <div className="bg-green-50 border-r-4 border-green-400 p-4 mt-4 rounded">
              <p className="text-green-800"><strong>הבהרה:</strong> איננו שומרים פרטי כרטיסי אשראי או אמצעי תשלום אחרים.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              2. דרכי איסוף המידע
            </h2>
            <p className="mb-4">המידע נאסף באמצעות:</p>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li>טפסי הרשמה והתחברות באפליקציה ובאתר.</li>
              <li>חיבור באמצעות שירותי צד ג׳ (Google, Apple וכדומה).</li>
              <li>עוגיות (Cookies) וכלי ניטור אנליטיים לשיפור חוויית המשתמש.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              3. מטרות השימוש במידע
            </h2>
            <p className="mb-4">המידע האישי נאסף ומשמש לצרכים הבאים:</p>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li>ניהול הוצאות ותשלומים משותפים בין בני משפחה.</li>
              <li>מתן שירות, תמיכה ושיפור חוויית המשתמש.</li>
              <li>שליחת עדכונים, התראות ודיוורים רלוונטיים.</li>
              <li>הפקת ניתוחים סטטיסטיים לשיפור השירות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              4. שיתוף מידע עם צדדים שלישיים
            </h2>
            <p className="mb-4">אנו עושים שימוש בשירותי צד ג׳ לשם תפעול האתר והאפליקציה, לרבות:</p>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li>ספקי שירותי ענן (כגון Supabase) המאוחסנים בשרתי אירופה.</li>
              <li>ספקי אנליטיקה, דיוור ותמיכה טכנית.</li>
              <li>גורמי אכיפת חוק ורשויות, ככל שנידרש על פי דין.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              5. אבטחת מידע ושמירתו
            </h2>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li>אנו נוקטים באמצעים סבירים להגנה על המידע האישי שלך, לרבות הצפנה, בקרת גישה ואחסון מאובטח.</li>
              <li>המידע נשמר בשרתי ענן מאובטחים הממוקמים באירופה.</li>
              <li>חרף האמצעים, לא ניתן להבטיח אבטחה מוחלטת, והמשתמש מצהיר כי ידוע לו סיכון זה.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              6. זכויות המשתמש
            </h2>
            <p className="mb-4">המשתמש זכאי לפנות אלינו בבקשה:</p>
            <ul className="list-disc list-inside space-y-2 mr-6">
              <li>לעדכן מידע אישי או לתקן טעויות.</li>
              <li>לבקש את מחיקת המידע האישי שנשמר אודותיו.</li>
            </ul>
            <div className="bg-blue-50 border-r-4 border-blue-400 p-4 mt-4 rounded">
              <p className="text-blue-800"><strong>הבהרה:</strong> לא קיימת אפשרות טכנית לייצוא נתוני המערכת.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              7. שמירת מידע לתקופה
            </h2>
            <p>המידע נשמר כל עוד המשתמש פעיל באפליקציה ובאתר, אלא אם ביקש את מחיקתו.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              8. פנייה בנושאי פרטיות
            </h2>
            <p className="mb-4">לשאלות, בקשות או הערות בנוגע למדיניות פרטיות זו ניתן ליצור קשר בכתובת:</p>
            <div className="bg-card p-4 rounded-lg border border-border flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:family@mhplus.online" className="text-primary hover:underline font-medium">
                family@mhplus.online
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              9. שינויים במדיניות
            </h2>
            <p>
              אנו שומרים את הזכות לשנות ולעדכן מסמך זה מעת לעת. הגרסה המעודכנת תפורסם באתר ובאפליקציה, 
              ותיכנס לתוקף מיד עם פרסומה.
            </p>
          </section>

          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              עדכון אחרון: ספטמבר 2025 | מחציות פלוס
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;