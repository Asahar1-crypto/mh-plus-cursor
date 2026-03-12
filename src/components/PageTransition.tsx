import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Lightweight page transition wrapper.
 * Fades in + slides up on route change using CSS classes.
 * Respects prefers-reduced-motion.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>('idle');
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setTransitionStage('enter');
      setDisplayLocation(location);
      // Let the enter animation play, then go idle
      const timer = setTimeout(() => setTransitionStage('idle'), 300);
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div
      className={transitionStage === 'enter' ? 'animate-page-enter' : ''}
      style={{ willChange: transitionStage === 'enter' ? 'opacity, transform' : 'auto' }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
