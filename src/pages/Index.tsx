
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Make sure we're only redirecting if we're actually on the /index route
    // and not on the root route
    if (window.location.pathname === '/index') {
      navigate('/');
    }
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
    </div>
  );
};

export default Index;
