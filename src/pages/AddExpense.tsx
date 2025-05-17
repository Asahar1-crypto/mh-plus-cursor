
import React from 'react';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';

const AddExpense = () => {
  return (
    <div className="container mx-auto animate-fade-in py-6">
      <h1 className="text-3xl font-bold mb-6">הוספת הוצאה חדשה</h1>
      
      <ExpenseCard 
        title="פרטי ההוצאה"
        description="הזן את פרטי ההוצאה שברצונך להוסיף"
      >
        <ExpenseForm />
      </ExpenseCard>
    </div>
  );
};

export default AddExpense;
