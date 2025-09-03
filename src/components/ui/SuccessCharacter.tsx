import React from 'react';
import CharacterImage from './CharacterImage';

interface SuccessCharacterProps {
  title: string;
  message: string;
  variant?: 'happy' | 'excited' | 'thinking' | 'celebrating';
}

const SuccessCharacter: React.FC<SuccessCharacterProps> = ({
  title,
  message,
  variant = 'celebrating'
}) => {
  return (
    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
      <div className="flex justify-center mb-4">
        <CharacterImage variant={variant} size="md" />
      </div>
      <h3 className="text-lg font-semibold text-green-800 mb-2">{title}</h3>
      <p className="text-green-700">{message}</p>
    </div>
  );
};

export default SuccessCharacter;