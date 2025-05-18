
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Instead of just redirecting, add a condition to prevent potential loops
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
