import React from 'react';
import CharacterImage from './CharacterImage';
import { Button } from './button';

interface EmptyStateCharacterProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  variant?: 'happy' | 'excited' | 'thinking' | 'celebrating';
}

const EmptyStateCharacter: React.FC<EmptyStateCharacterProps> = ({
  title,
  description,
  actionText,
  onAction,
  variant = 'thinking'
}) => {
  return (
    <div className="text-center py-12 px-6">
      <div className="flex justify-center mb-6">
        <CharacterImage variant={variant} size="lg" />
      </div>
      <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="outline" size="lg">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyStateCharacter;