import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, Star } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  showConfetti?: boolean;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  showConfetti = true
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full mx-auto animate-scale-in border-0 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            {/* Success Icon with Animation */}
            <div className="relative flex justify-center">
              <div className="relative">
                <CheckCircle 
                  className="w-20 h-20 text-green-500 animate-bounce"
                  strokeWidth={1.5}
                />
                <Sparkles 
                  className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-spin"
                />
                <Star 
                  className="absolute -bottom-2 -left-2 w-8 h-8 text-purple-500 animate-pulse"
                />
              </div>
            </div>

            {/* Title with Gradient */}
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {title}
            </h2>

            {/* Message */}
            <p className="text-muted-foreground text-lg leading-relaxed">
              {message}
            </p>

            {/* Decorative Elements */}
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            {/* Action Button */}
            <Button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-lg shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              🎉 המשך לאפליקציה
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};