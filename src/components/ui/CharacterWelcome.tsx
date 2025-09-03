import React from 'react';
import CharacterImage from './CharacterImage';

interface CharacterWelcomeProps {
  userName?: string;
  message?: string;
  variant?: 'happy' | 'excited' | 'thinking' | 'celebrating';
}

const CharacterWelcome: React.FC<CharacterWelcomeProps> = ({
  userName,
  message,
  variant = 'happy'
}) => {
  const defaultMessage = userName 
    ? `שלום ${userName}! איך אפשר לעזור לך היום?`
    : 'ברוכים הבאים למחציות פלוס!';

  return (
    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-border/50">
      <CharacterImage variant={variant} size="md" />
      <div className="flex-1">
        <p className="text-lg font-medium text-foreground">
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
};

export default CharacterWelcome;