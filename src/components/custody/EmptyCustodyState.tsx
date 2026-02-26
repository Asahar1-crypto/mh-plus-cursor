import React from 'react';
import { CalendarDays } from 'lucide-react';

const EmptyCustodyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full mb-6">
        <CalendarDays className="h-12 w-12 text-primary/60" />
      </div>
      <h3 className="text-xl font-semibold mb-2">עדיין אין אירועים ברשימה</h3>
      <p className="text-muted-foreground max-w-md">
        התחל בטעינת חגים או חופשות בית ספר באמצעות הכפתורים למעלה,
        ואז שבץ את ההורים לכל אירוע.
      </p>
    </div>
  );
};

export default EmptyCustodyState;
