import React from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BudgetCard } from '@/components/account/BudgetCard';

interface BudgetModalProps {
  isAdmin?: boolean;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isAdmin = false }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md hover:shadow-lg transition-all duration-300">
          <Wallet className="h-4 w-4" />
          תקציבים
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] z-[9999] flex flex-col p-0" dir="rtl">
        <ScrollArea className="flex-1 max-h-[90vh]">
          <div className="p-4 sm:p-6">
            <BudgetCard isAdmin={isAdmin} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
