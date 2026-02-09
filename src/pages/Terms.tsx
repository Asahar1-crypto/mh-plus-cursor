import React from 'react';
import { Mail } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
      <div className="prose prose-sm sm:prose-lg mx-auto">
        <header className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            תנאי שימוש – מחציות פלוס
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            עודכן לאחרונה: ספטמבר 2025
          </p>
        </header>
        
        <div className="space-y-5 sm:space-y-6 md:space-y-8 text-foreground leading-relaxed">
          <section className="bg-muted/30 p-3 sm:p-4 md:p-6 rounded-lg">
            <p className="text-sm sm:text-base md:text-lg">
              ברוכים הבאים לאפליקציית מחציות פלוס ("האפליקציה") ולאתר mhplus.online ("האתר").
              השימוש באפליקציה ובאתר כפוף לתנאים אלה ("תנאי השימוש"). אנא קרא תנאים אלה בעיון לפני השימוש. 
              שימושך באפליקציה ובאתר מהווה את הסכמתך המלאה לכל התנאים שלהלן. אם אינך מסכים – אנא הימנע מהשימוש.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              1. הגדרות
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li><strong>"החברה" / "המפעיל"</strong> – בעלי האפליקציה והאתר.</li>
              <li><strong>"המשתמש"</strong> – כל אדם הנרשם או עושה שימוש באפליקציה או באתר.</li>
              <li><strong>"השירות"</strong> – כל שימוש באפליקציה, באתר ובתכנים הכלולים בהם.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              2. השימוש באפליקציה ובאתר
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>השירות נועד לניהול הוצאות ותשלומים משותפים בין בני משפחה, הורים נפרדים או גרושים.</li>
              <li>המשתמש מתחייב להשתמש בשירות בהתאם להוראות הדין ולא לבצע שימוש לרעה, לרבות: יצירת חשבונות מזויפים, הזנת מידע כוזב, ניסיון חדירה או פגיעה במערכת.</li>
              <li>השירות ניתן לשימוש אישי בלבד, ואינו מעניק למשתמש רישיון להעביר, להעתיק או לעשות בו שימוש מסחרי.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              3. הרשמה ופרטי משתמש
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>לשם שימוש בשירות, המשתמש נדרש למסור פרטים אישיים: שם מלא, דוא"ל, מספר טלפון ופרטי בני משפחה.</li>
              <li>המשתמש מצהיר כי הפרטים שמסר נכונים, מדויקים ומעודכנים.</li>
              <li>האחריות לשמירת סודיות פרטי ההתחברות מוטלת על המשתמש בלבד.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              4. אחריות והגבלת אחריות
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>השירות ניתן "כמות שהוא" (As-Is), ללא אחריות מכל סוג שהוא, מפורשת או משתמעת.</li>
              <li>החברה אינה אחראית לנכונות הנתונים שהוזנו על ידי המשתמשים, לחישובים או לתוצאות הנגזרות מהם.</li>
              <li>החברה לא תישא בכל אחריות לכל נזק ישיר, עקיף, כספי או אחר שייגרם כתוצאה מהשימוש בשירות.</li>
            </ul>
            <div className="bg-orange-50 border-r-4 border-orange-400 p-3 sm:p-4 mt-3 sm:mt-4 rounded">
              <p className="text-orange-800 text-sm sm:text-base"><strong>הערה חשובה:</strong> השירות מסופק ללא אחריות לנכונות הנתונים או החישובים.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              5. תוכן ומידע
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>המשתמש אחראי באופן בלעדי לכל מידע שהזין בשירות.</li>
              <li>החברה אינה בודקת את נכונות המידע שהוזן ואינה אחראית לשימוש שנעשה בו.</li>
              <li>לחברה הזכות להסיר או למחוק מידע שהוזן, לפי שיקול דעתה הבלעדי.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              6. זכויות קניין רוחני
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>כל זכויות היוצרים והקניין הרוחני באפליקציה, באתר, בעיצוב, בקוד ובתכנים שייכות לחברה בלבד.</li>
              <li>אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי כלשהו בתוכן השירות ללא אישור מראש ובכתב מהחברה.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              7. פרטיות
            </h2>
            <p className="text-sm sm:text-base">השימוש בשירות כפוף למדיניות הפרטיות של החברה, כפי שפורסמה ומעודכנת מעת לעת.</p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              8. סיום שימוש והשעיה
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>החברה רשאית לחסום או להשעות את גישתו של משתמש לשירות במקרה של הפרת תנאים אלה או שימוש לרעה.</li>
              <li>החברה רשאית להפסיק את השירות כולו או חלקו בכל עת, ללא הודעה מוקדמת.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              9. שינוי תנאים
            </h2>
            <p className="text-sm sm:text-base">
              החברה שומרת לעצמה את הזכות לשנות תנאים אלה מעת לעת. תנאי השימוש המעודכנים יפורסמו באתר ובאפליקציה 
              וייכנסו לתוקף מייד עם פרסומם.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              10. דין וסמכות שיפוט
            </h2>
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 mr-4 sm:mr-6 text-sm sm:text-base">
              <li>על תנאים אלה יחולו דיני מדינת ישראל בלבד.</li>
              <li>סמכות השיפוט הבלעדית בכל מחלוקת תהיה נתונה לבתי המשפט המוסמכים בעיר תל אביב-יפו.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-4 border-b-2 border-primary pb-2">
              11. יצירת קשר
            </h2>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">לשאלות או הבהרות ניתן לפנות אלינו בכתובת:</p>
            <div className="bg-card p-3 sm:p-4 rounded-lg border border-border flex items-center gap-2 sm:gap-3">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <a href="mailto:family@mhplus.online" className="text-primary hover:underline font-medium text-sm sm:text-base">
                family@mhplus.online
              </a>
            </div>
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

export default Terms;