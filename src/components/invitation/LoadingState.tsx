
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const LoadingState = () => {
  return (
    <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
      <CardContent className="pt-6">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-center mt-4">טוען את פרטי ההזמנה...</p>
      </CardContent>
    </Card>
  );
};

export default LoadingState;
