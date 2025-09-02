import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Floating geometric shapes */}
      <div className="absolute inset-0">
        {/* Large circle */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-full blur-3xl animate-float" />
        
        {/* Medium circle */}
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-r from-primary-glow/8 to-primary/8 rounded-full blur-2xl animate-pulse-slow" />
        
        {/* Small accent circles */}
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-gradient-to-r from-primary-glow/6 to-primary/6 rounded-full blur-lg animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Gradient mesh overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-primary/2" />
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};

export default AnimatedBackground;