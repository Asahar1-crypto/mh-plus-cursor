
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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
