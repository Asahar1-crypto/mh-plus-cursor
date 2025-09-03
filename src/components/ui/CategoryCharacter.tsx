import React from 'react';
import CharacterImage from './CharacterImage';

interface CategoryCharacterProps {
  category: string;
  amount?: number;
  className?: string;
}

const CategoryCharacter: React.FC<CategoryCharacterProps> = ({
  category,
  amount,
  className = ''
}) => {
  // Map categories to character variants and messages
  const getCategoryData = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'מזון':
      case 'food':
        return {
          variant: 'happy' as const,
          message: 'טעים ומזין!',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'חינוך':
      case 'education':
        return {
          variant: 'thinking' as const,
          message: 'למידה חשובה!',
          bgColor: 'bg-blue-50 border-blue-200'
        };
      case 'בריאות':
      case 'health':
        return {
          variant: 'excited' as const,
          message: 'בריאות זה הכל!',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'בילויים':
      case 'entertainment':
        return {
          variant: 'celebrating' as const,
          message: 'בואו נבלה!',
          bgColor: 'bg-purple-50 border-purple-200'
        };
      default:
        return {
          variant: 'happy' as const,
          message: 'הוצאה חשובה!',
          bgColor: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const { variant, message, bgColor } = getCategoryData(category);

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${bgColor} ${className}`}>
      <CharacterImage variant={variant} size="sm" />
      <div className="flex-1">
        <h4 className="font-semibold text-foreground">{category}</h4>
        <p className="text-sm text-muted-foreground">{message}</p>
        {amount !== undefined && (
          <p className="text-lg font-bold text-primary">₪{amount.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
};

export default CategoryCharacter;