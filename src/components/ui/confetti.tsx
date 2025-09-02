import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  size: number;
  speedX: number;
  speedY: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'triangle';
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  '#FFD700', // זהב
  '#FF6B6B', // אדום
  '#4ECDC4', // טורקיז
  '#45B7D1', // כחול
  '#96CEB4', // ירוק
  '#FECA57', // כתום
  '#FF9FF3', // ורוד
  '#54A0FF', // כחול בהיר
];

export const Confetti: React.FC<ConfettiProps> = ({
  active,
  duration = 3000,
  particleCount = 50,
  onComplete
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      // יצירת חלקיקי קונפטי
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 3 + 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle'
      }));
      
      setPieces(newPieces);

      // הסרת הקונפטי אחרי זמן מוגדר
      const timer = setTimeout(() => {
        setIsVisible(false);
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration, particleCount, onComplete]);

  useEffect(() => {
    if (!isVisible || pieces.length === 0) return;

    const animationFrame = requestAnimationFrame(function animate() {
      setPieces(prevPieces => 
        prevPieces.map(piece => ({
          ...piece,
          x: piece.x + piece.speedX,
          y: piece.y + piece.speedY,
          rotation: piece.rotation + piece.rotationSpeed,
          speedY: piece.speedY + 0.1, // כוח משיכה
        })).filter(piece => piece.y < window.innerHeight + 50)
      );

      if (isVisible) {
        requestAnimationFrame(animate);
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, pieces.length]);

  if (!isVisible) return null;

  const getShapeStyle = (piece: ConfettiPiece) => {
    const baseStyle = {
      position: 'absolute' as const,
      left: `${piece.x}px`,
      top: `${piece.y}px`,
      width: `${piece.size}px`,
      height: `${piece.size}px`,
      backgroundColor: piece.color,
      transform: `rotate(${piece.rotation}deg)`,
      transition: 'none',
      pointerEvents: 'none' as const,
    };

    switch (piece.shape) {
      case 'circle':
        return { ...baseStyle, borderRadius: '50%' };
      case 'triangle':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          width: 0,
          height: 0,
          borderLeft: `${piece.size / 2}px solid transparent`,
          borderRight: `${piece.size / 2}px solid transparent`,
          borderBottom: `${piece.size}px solid ${piece.color}`,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{ overflow: 'hidden' }}
    >
      {pieces.map(piece => (
        <div
          key={piece.id}
          style={getShapeStyle(piece)}
          className="animate-pulse"
        />
      ))}
    </div>
  );
};

// Hook להשתמש בקונפטי
export const useConfetti = () => {
  const [isActive, setIsActive] = useState(false);

  const fire = () => {
    setIsActive(true);
  };

  const stop = () => {
    setIsActive(false);
  };

  return {
    isActive,
    fire,
    stop,
    ConfettiComponent: (props: Omit<ConfettiProps, 'active'>) => (
      <Confetti {...props} active={isActive} onComplete={stop} />
    )
  };
};