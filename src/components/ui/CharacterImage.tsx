import React from 'react';
import characterPlaceholder from '/public/lovable-uploads/dc4b6d32-5c74-44a1-8d9c-b07947f361d7.png';

interface CharacterImageProps {
  variant?: 'happy' | 'excited' | 'thinking' | 'celebrating';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const CharacterImage: React.FC<CharacterImageProps> = ({
  variant = 'happy',
  size = 'md',
  className = '',
  alt = 'דמות חברותית'
}) => {
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
    xl: 'h-48 w-48'
  };

  // For now, using the available character image as placeholder
  // Later these can be replaced with different character variations
  const characterImages = {
    happy: characterPlaceholder,
    excited: characterPlaceholder,
    thinking: characterPlaceholder,
    celebrating: characterPlaceholder
  };

  return (
    <img
      src={characterImages[variant]}
      alt={alt}
      className={`${sizeClasses[size]} object-contain animate-bounce-subtle ${className}`}
    />
  );
};

export default CharacterImage;