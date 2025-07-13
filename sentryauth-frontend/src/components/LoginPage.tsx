import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-particles"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="sentry-logo">
            <svg width="48" height="48" viewBox="0 0 256 256" fill="none">
              <path d="M128 0L256 128L128 256L0 128L128 0Z" fill="url(#sentryGradient)"/>
              <path d="M128 32L224 128L128 224L32 128L128 32Z" fill="#1c1a1f" fillOpacity="0.8"/>
              <path d="M96 96L160 96L160 128L128 128L128 160L96 160L96 96Z" fill="#ffffff"/>
              <defs>
                <linearGradient id="sentryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Sign in to Sentry</h1>
          <p>Use your Sentry account to continue to the demo application</p>
        </div>

        <div className="login-content">
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">🔐</div>
              <span>Secure OAuth 2.0 authentication</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <span>Fast and reliable login</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🛡️</div>
              <span>Enterprise-grade security</span>
            </div>
          </div>

          <button 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Continue with Sentry
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M128 0L256 128L128 256L0 128L128 0Z"/>
                </svg>
                Continue with Sentry
              </>
            )}
          </button>

          <div className="login-footer">
            <p>
              By signing in, you agree to our{' '}
              <a href="#" className="link">Terms of Service</a> and{' '}
              <a href="#" className="link">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}