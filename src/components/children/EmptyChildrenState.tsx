
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import CharacterImage from '@/components/ui/CharacterImage';

interface EmptyChildrenStateProps {
  onAddClick: () => void;
}

const EmptyChildrenState: React.FC<EmptyChildrenStateProps> = ({ onAddClick }) => {
  return (
    <div className="col-span-full text-center py-12">
      <div className="flex justify-center mb-4">
        <CharacterImage variant="thinking" size="lg" />
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
