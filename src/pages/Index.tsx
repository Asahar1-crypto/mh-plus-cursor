
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TestEmailButton from '@/components/email/TestEmailButton';

const IndexPage = () => {
  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">בדיקת מערכת שליחת אימיילים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <p>לחץ על הכפתור כדי לשלוח אימייל בדיקה ל-ariel.sahar1@gmail.com</p>
            <TestEmailButton email="ariel.sahar1@gmail.com" />
          </div>
        </CardContent>
      </Card>
      
      <h1 className="text-3xl font-bold">ברוכים הבאים למחציות פלוס!</h1>
      <p className="mt-4 text-lg">האפליקציה המובילה לניהול הוצאות משותפות</p>
    </div>
  );
};

export default IndexPage;
