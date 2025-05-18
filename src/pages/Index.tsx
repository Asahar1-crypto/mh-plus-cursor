
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  React.useEffect(() => {
    // Only redirect from "/index" to "/" to prevent loops
    // Don't redirect if we're already at the root
    if (location.pathname === '/index') {
      console.log("Redirecting from /index to /");
      navigate('/', { replace: true });
    } else {
      console.log("Current path:", location.pathname);
    }
  }, [navigate, location.pathname]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
    </div>
  );
};

export default Index;
