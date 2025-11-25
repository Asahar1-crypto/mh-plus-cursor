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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 animate-fade-in transition-all duration-300" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-md w-full mx-auto animate-scale-in border-2 border-purple-500/20 shadow-2xl shadow-purple-500/20 bg-gradient-to-br from-background to-accent/10">
          <CardContent className="p-8 text-center space-y-6">
            {/* Success Icon with Animation */}
            <div className="relative flex justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative">
                <CheckCircle 
                  className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 animate-bounce drop-shadow-lg"
                  strokeWidth={1.5}
                />
                <Sparkles 
                  className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 text-yellow-400 animate-spin"
                />
                <Star 
                  className="absolute -bottom-2 -left-2 w-7 h-7 sm:w-8 sm:h-8 text-purple-500 animate-pulse"
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
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-base sm:text-lg shadow-lg shadow-purple-500/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/60 active:scale-95"
            >
              🎉 המשך לאפליקציה
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};