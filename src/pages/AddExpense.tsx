
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';

const AddExpense = () => {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto animate-fade-in py-4 sm:py-6 px-3 sm:px-4" dir="rtl">
      <h1 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6 text-right">הוספת הוצאה חדשה</h1>
      
      <ExpenseCard 
        title="פרטי ההוצאה"
        description="הזן את פרטי ההוצאה שברצונך להוסיף"
      >
        <ExpenseForm 
          onSubmitSuccess={() => navigate('/expenses')}
          onCancel={() => navigate('/expenses')}
        />
      </ExpenseCard>
    </div>
  );
};

export default AddExpense;
