import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="prose prose-lg mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-8">מדיניות פרטיות</h1>
        
        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">מבוא</h2>
            <p>
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">איסוף מידע</h2>
            <p>
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">שימוש במידע</h2>
            <p>
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">שיתוף מידע</h2>
            <p>
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">אבטחת מידע</h2>
            <p>
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">יצירת קשר</h2>
            <p>
              לשאלות נוספות אודות מדיניות הפרטיות, ניתן ליצור קשר בכתובת: info@example.com
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;