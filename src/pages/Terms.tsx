import React from 'react';
import { Mail } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="prose prose-lg mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            תנאי שימוש – מחציות פלוס
          </h1>
          <p className="text-lg text-muted-foreground">
            עודכן לאחרונה: ספטמבר 2025
          </p>
        </header>
        
        <div className="space-y-8 text-foreground leading-relaxed">
          <section className="bg-muted/30 p-6 rounded-lg">
            <p className="text-lg">
              התוכן יתווסף בקרוב...
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              1. כללי
            </h2>
            <p>התוכן יתווסף בקרוב...</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              2. השירות
            </h2>
            <p>התוכן יתווסף בקרוב...</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              3. זכויות וחובות המשתמש
            </h2>
            <p>התוכן יתווסף בקרוב...</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              4. אחריות וויתור
            </h2>
            <p>התוכן יתווסף בקרוב...</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4 border-b-2 border-primary pb-2">
              8. יצירת קשר
            </h2>
            <p className="mb-4">לשאלות, בקשות או הערות בנוגע לתנאי השימוש ניתן ליצור קשר בכתובת:</p>
            <div className="bg-card p-4 rounded-lg border border-border flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:family@mhplus.online" className="text-primary hover:underline font-medium">
                family@mhplus.online
              </a>
            </div>
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

export default Terms;