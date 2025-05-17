
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-primary">404</h1>
        <p className="text-2xl font-medium mb-6">הדף שחיפשת לא נמצא</p>
        <p className="text-muted-foreground mb-6">
          נראה שהגעת לדף שלא קיים או שהוסר
        </p>
        <Button onClick={() => navigate('/')}>
          חזרה לדף הבית
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
