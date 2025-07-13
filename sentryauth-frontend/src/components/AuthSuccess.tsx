import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthCallback.css';

export function AuthSuccess() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    // Refresh auth state after successful OAuth
    const refreshAndRedirect = async () => {
      await checkAuth();
      // Small delay to let the auth state update
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    };

    refreshAndRedirect();
  }, [checkAuth]);

  return (
    <div className="auth-callback">
      <div className="callback-card success">
        <div className="callback-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#10b981"/>
            <path 
              d="M20 32l8 8 16-16" 
              stroke="white" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <h1>Authentication Successful!</h1>
        <p>You have been successfully authenticated with Sentry.</p>
        
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Redirecting you to the dashboard...</span>
        </div>
      </div>
    </div>
  );
}