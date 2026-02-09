import React from 'react';
import { Mail } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
      <div className="prose prose-sm sm:prose-lg mx-auto">
        <header className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            מדיניות פרטיות – מחציות פלוס
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            עודכן לאחרונה: ספטמבר 2025
          </p>
        </header>
        
        <div className="space-y-5 sm:space-y-6 md:space-y-8 text-foreground leading-relaxed">
          <section className="bg-muted/30 p-3 sm:p-4 md:p-6 rounded-lg">
            <p className="text-sm sm:text-base md:text-lg">
              אפליקציית מחציות פלוס ("האפליקציה") ואתר mhplus.online ("האתר") מופעלים ומנוהלים על ידי החברה/המפעיל (להלן: "החברה", "אנחנו"). 
              מסמך זה נועד להסביר למשתמשי האפליקציה והאתר ("המשתמש", "אתה") כיצד אנו אוספים, משתמשים, מאחסנים ומגנים על המידע האישי שלך.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              1. סוגי מידע שנאסף
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">בעת שימושך באפליקציה ובאתר אנו עשויים לאסוף ולעבד את סוגי המידע הבאים:</p>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li><strong>פרטים אישיים:</strong> שם מלא, כתובת דוא״ל, מספר טלפון.</li>
              <li><strong>פרטים על בני משפחה:</strong> פרטי בני זוג וילדים כפי שהוזנו על ידך.</li>
              <li><strong>פרטי שימוש:</strong> סכומים, שמות רכישות והוצאות משותפות.</li>
            </ul>
            <div className="bg-green-50 border-r-4 border-green-400 p-3 sm:p-4 mt-3 sm:mt-4 rounded">
              <p className="text-green-800 text-sm sm:text-base"><strong>הבהרה:</strong> איננו שומרים פרטי כרטיסי אשראי או אמצעי תשלום אחרים.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              2. דרכי איסוף המידע
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">המידע נאסף באמצעות:</p>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>טפסי הרשמה והתחברות באפליקציה ובאתר.</li>
              <li>חיבור באמצעות שירותי צד ג׳ (Google, Apple וכדומה).</li>
              <li>עוגיות (Cookies) וכלי ניטור אנליטיים לשיפור חוויית המשתמש.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              3. מטרות השימוש במידע
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">המידע האישי נאסף ומשמש לצרכים הבאים:</p>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>ניהול הוצאות ותשלומים משותפים בין בני משפחה.</li>
              <li>מתן שירות, תמיכה ושיפור חוויית המשתמש.</li>
              <li>שליחת עדכונים, התראות ודיוורים רלוונטיים.</li>
              <li>הפקת ניתוחים סטטיסטיים לשיפור השירות.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              4. שיתוף מידע עם צדדים שלישיים
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">אנו עושים שימוש בשירותי צד ג׳ לשם תפעול האתר והאפליקציה, לרבות:</p>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>ספקי שירותי ענן (כגון Supabase) המאוחסנים בשרתי אירופה.</li>
              <li>ספקי אנליטיקה, דיוור ותמיכה טכנית.</li>
              <li>גורמי אכיפת חוק ורשויות, ככל שנידרש על פי דין.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              5. אבטחת מידע ושמירתו
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>אנו נוקטים באמצעים סבירים להגנה על המידע האישי שלך, לרבות הצפנה, בקרת גישה ואחסון מאובטח.</li>
              <li>המידע נשמר בשרתי ענן מאובטחים הממוקמים באירופה.</li>
              <li>חרף האמצעים, לא ניתן להבטיח אבטחה מוחלטת, והמשתמש מצהיר כי ידוע לו סיכון זה.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              6. זכויות המשתמש
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">המשתמש זכאי לפנות אלינו בבקשה:</p>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>לעדכן מידע אישי או לתקן טעויות.</li>
              <li>לבקש את מחיקת המידע האישי שנשמר אודותיו.</li>
            </ul>
            <div className="bg-blue-50 border-r-4 border-blue-400 p-3 sm:p-4 mt-3 sm:mt-4 rounded">
              <p className="text-blue-800 text-sm sm:text-base"><strong>הבהרה:</strong> לא קיימת אפשרות טכנית לייצוא נתוני המערכת.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              7. שמירת מידע לתקופה
            </h2>
            <p className="text-sm sm:text-base">המידע נשמר כל עוד המשתמש פעיל באפליקציה ובאתר, אלא אם ביקש את מחיקתו.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              8. פנייה בנושאי פרטיות
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">לשאלות, בקשות או הערות בנוגע למדיניות פרטיות זו ניתן ליצור קשר בכתובת:</p>
            <div className="bg-card p-3 sm:p-4 rounded-lg border border-border flex items-center gap-2 sm:gap-3">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <a href="mailto:family@mhplus.online" className="text-primary hover:underline font-medium text-sm sm:text-base">
                family@mhplus.online
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              9. שינויים במדיניות
            </h2>
            <p className="text-sm sm:text-base">
              אנו שומרים את הזכות לשנות ולעדכן מסמך זה מעת לעת. הגרסה המעודכנת תפורסם באתר ובאפליקציה, 
              ותיכנס לתוקף מיד עם פרסומה.
            </p>
          </section>

          <div className="mt-8 sm:mt-12 md:mt-16 pt-4 sm:pt-6 md:pt-8 border-t border-border text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              עדכון אחרון: ספטמבר 2025 | מחציות פלוס
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;