import { useAuth } from '../contexts/AuthContext';
import './AuthCallback.css';

export function AuthError() {
  const { login } = useAuth();

  const handleRetry = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Retry login error:', error);
    }
  };

  // Get error message from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const errorMessage = urlParams.get('message') || 'An unknown error occurred during authentication.';

  return (
    <div className="auth-callback">
      <div className="callback-card error">
        <div className="callback-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#ef4444"/>
            <path 
              d="M20 20l24 24M44 20L20 44" 
              stroke="white" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <h1>Authentication Failed</h1>
        <p>We encountered an issue while trying to authenticate you with Sentry.</p>
        
        <div className="error-details">
          <h3>Error Details:</h3>
          <code>{errorMessage}</code>
        </div>
        
        <div className="callback-actions">
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
          <button onClick={() => window.location.href = '/'} className="home-button">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}