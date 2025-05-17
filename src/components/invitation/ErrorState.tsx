
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

const ErrorState = () => {
  const navigate = useNavigate();
  
  return (
    <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <X className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle className="text-2xl font-bold">הזמנה לא תקפה</CardTitle>
        <CardDescription>
          ההזמנה שהתבקשת לקבל אינה קיימת או שפג תוקפה
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-center pt-2">
        <Button onClick={() => navigate('/')}>
          חזרה לדף הבית
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ErrorState;
