
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpenseCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ 
  title, 
  description, 
  children 
}) => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
        {children}
      </CardContent>
    </Card>
  );
};
