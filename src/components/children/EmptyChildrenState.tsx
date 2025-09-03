
import React from 'react';
import { User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';

interface EmptyChildrenStateProps {
  onAddClick: () => void;
}

const EmptyChildrenState: React.FC<EmptyChildrenStateProps> = ({ onAddClick }) => {
  return (
    <div className="col-span-full text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">אין ילדים עדיין</h3>
      <p className="text-muted-foreground mb-4">
        התחל להוסיף ילדים למערכת כדי לנהל את ההוצאות שלהם
      </p>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={onAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          הוסף ילד/ה ראשון/ה
        </Button>
      </DialogTrigger>
    </div>
  );
};

export default EmptyChildrenState;
