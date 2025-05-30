
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useExpense } from '@/contexts/ExpenseContext';
import { useAuth } from '@/contexts/AuthContext';
import ChildCard from '@/components/children/ChildCard';
import AddChildForm from '@/components/children/AddChildForm';
import EmptyChildrenState from '@/components/children/EmptyChildrenState';

const Children = () => {
  const { childrenList, isLoading } = useExpense();
  const { user, account } = useAuth();
  const [open, setOpen] = useState(false);

  console.log('Children page - current account:', account?.name, 'children count:', childrenList.length);

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתוני המשתמש...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>טוען נתונים עבור {account.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto animate-fade-in py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">ילדים - {account.name}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              הוסף ילד/ה
            </Button>
          </DialogTrigger>
          <AddChildForm open={open} setOpen={setOpen} />
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {childrenList && childrenList.length > 0 ? (
          childrenList.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <EmptyChildrenState onAddClick={() => setOpen(true)} />
            <AddChildForm open={open} setOpen={setOpen} />
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default Children;
