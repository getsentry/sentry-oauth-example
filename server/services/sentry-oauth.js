/**
 * 🎯 SENTRY OAUTH 2.0 SERVICE
 * 
 * This service handles the complete Sentry OAuth 2.0 authentication flow.
 * 
 * 🔐 What this demonstrates about Sentry Authentication:
 * 1. How to register and configure a Sentry OAuth application
 * 2. How to generate proper Sentry authorization URLs with scopes
 * 3. How to exchange authorization codes for access tokens
 * 4. How to retrieve user information from Sentry's API
 * 5. How to handle Sentry-specific OAuth quirks and multiple endpoints
 * 
 * 📚 Sentry OAuth Documentation:
 * - Authorization: https://docs.sentry.io/api/auth/#authorization
 * - Scopes: https://docs.sentry.io/api/auth/#scopes
 * - User API: https://docs.sentry.io/api/users/
 */

require('dotenv/config');
const Sentry = require('@sentry/node');

const { logger } = Sentry;

class SentryOAuthService {
  constructor() {
    this.config = {
      clientId: process.env.SENTRY_OAUTH_CLIENT_ID,
      clientSecret: process.env.SENTRY_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.SENTRY_OAUTH_REDIRECT_URI,
      baseUrl: process.env.SENTRY_BASE_URL || 'https://sentry.io',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('❌ Sentry OAuth credentials not configured! Check your .env file.');
    }

    console.log('🔧 Sentry OAuth service initialized:');
    console.log(`   - Base URL: ${this.config.baseUrl}`);
    console.log(`   - Client ID: ${this.config.clientId}`);
    console.log(`   - Redirect URI: ${this.config.redirectUri}`);
  }

  /**
   * 🔗 STEP 1: Generate Sentry Authorization URL
   * 
   * This creates the URL to redirect users to Sentry for authentication.
   * 
   * 🎯 What this demonstrates about Sentry OAuth:
   * - Sentry uses standard OAuth 2.0 authorization code flow
   * - Sentry-specific scopes: 'org:read member:read' for basic user info
   * - State parameter for CSRF protection (OAuth best practice)
   * - Sentry's authorization endpoint: /oauth/authorize/
   */
  getAuthorizationUrl(state) {
    console.log('🔗 Generating Sentry authorization URL...');
    
    // 📋 Sentry OAuth Scopes for comprehensive read access:
    // Organizations
    // - org:read: Read organization data
    
    // Projects
    // - project:read: Read project data
    
    // Teams
    // - team:read: Read team data
    
    // Members
    // - member:read: Read member data
    
    // Issues & Events
    // - event:read: Read issues and events
    
    const scope = [
      'org:read',
      'project:read',
      'team:read',
      'member:read',
      'event:read'
    ].join(' ');
    
    const params = new URLSearchParams({
      response_type: 'code',           // OAuth 2.0 authorization code flow
      client_id: this.config.clientId, // Your Sentry OAuth app client ID
      redirect_uri: this.config.redirectUri, // Where Sentry sends the user back
      scope: scope,                    // Permissions requested from Sentry
    });

    if (state) {
      params.append('state', state);   // CSRF protection parameter
    }

    const authUrl = `${this.config.baseUrl}/oauth/authorize/?${params.toString()}`;
    
    console.log('✅ Sentry authorization URL generated:');
    console.log(`   - Client ID: ${this.config.clientId}`);
    console.log(`   - Redirect URI: ${this.config.redirectUri}`);
    console.log(`   - Scopes: ${scope}`);
    console.log(`   - State: ${state ? 'Yes (CSRF protection)' : 'No'}`);

    return authUrl;
  }

  /**
   * 🎫 STEP 2: Exchange Authorization Code for Access Token
   * 
   * After user approves on Sentry, they're redirected back with a code.
   * We exchange this code for an access token to make API calls.
   * 
   * 🎯 What this demonstrates about Sentry OAuth:
   * - Sentry's token endpoint: /oauth/token/
   * - Standard OAuth 2.0 token exchange flow
   * - Required parameters for Sentry token exchange
   * - How Sentry responds with token and user information
   */
  async exchangeCodeForToken(code) {
    console.log('🎫 Exchanging authorization code for access token...');
    
    const tokenUrl = `${this.config.baseUrl}/oauth/token/`;
    
    // 📋 Standard OAuth 2.0 token exchange parameters
    const params = new URLSearchParams({
      grant_type: 'authorization_code',    // OAuth 2.0 grant type
      client_id: this.config.clientId,     // Your Sentry OAuth app ID
      client_secret: this.config.clientSecret, // Your Sentry OAuth app secret
      code,                                // Authorization code from Sentry
      redirect_uri: this.config.redirectUri,   // Must match the original request
    });

    try {
      console.log('📤 Sending token exchange request to Sentry...');
      console.log(`   - Token URL: ${tokenUrl}`);
      console.log(`   - Code length: ${code.length} characters`);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      console.log(`📥 Sentry token response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `❌ Sentry token exchange failed: ${response.status} ${errorText}`;
        console.error(errorMessage);
        
        // Report error to Sentry (if you're using Sentry for error tracking)
        Sentry.captureException(new Error(errorMessage), {
          tags: { 
            oauth_service: 'sentry',
            oauth_step: 'token_exchange',
            http_status: response.status.toString()
          },
          extra: {
            status: response.status,
            statusText: response.statusText,
            errorText,
            tokenUrl,
            clientId: this.config.clientId,
            redirectUri: this.config.redirectUri
          }
        });
        
        throw new Error(errorMessage);
      }

      const tokenData = await response.json();
      console.log('✅ Successfully received access token from Sentry');
      console.log(`   - Token Type: ${tokenData.token_type}`);
      console.log(`   - Scope: ${tokenData.scope}`);
      console.log(`   - Has Refresh Token: ${!!tokenData.refresh_token}`);
      console.log(`   - Token Keys: ${Object.keys(tokenData).join(', ')}`);

      return tokenData;
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Token exchange error:', error.message);
        Sentry.captureException(error, {
          tags: { 
            oauth_service: 'sentry',
            oauth_step: 'token_exchange_network'
          },
          extra: {
            tokenUrl,
            clientId: this.config.clientId,
            redirectUri: this.config.redirectUri
          }
        });
        throw error;
      }
      const networkError = new Error('Network error during token exchange');
      Sentry.captureException(networkError, {
        tags: { 
          oauth_service: 'sentry',
          oauth_step: 'token_exchange_unknown'
        }
      });
      throw networkError;
    }
  }

  /**
   * 👤 STEP 3: Get User Information from Sentry API
   * 
   * 🎯 What this demonstrates about Sentry OAuth:
   * - Multiple possible endpoints for user data in Sentry
   * - How to handle OAuth 2.0 Bearer token authentication
   * - What user information Sentry provides
   * - Resilient API calling with fallback endpoints
   */
  async getUserInfo(accessToken) {
    console.log('👤 Fetching user information from Sentry API...');
    
    // OAuth 2.0 standard user info endpoints to try
    const possibleEndpoints = [
      `${this.config.baseUrl}/oauth/userinfo`,        // Standard OAuth 2.0 userinfo endpoint
      `${this.config.baseUrl}/userinfo`,              // Alternative standard endpoint
      `${this.config.baseUrl}/oauth/userinfo/`,       // With trailing slash
      `${this.config.baseUrl}/userinfo/`,             // Alternative with trailing slash
      `${this.config.baseUrl}/api/0/user/`,           // Sentry API user endpoint
      `${this.config.baseUrl}/api/0/users/me/`,       // Sentry API current user
    ];

    let lastError = null;

    for (const userUrl of possibleEndpoints) {
      try {
        console.log(`🔍 Trying Sentry endpoint: ${userUrl}`);

        // Use standard OAuth 2.0 Bearer token authentication
        const response = await fetch(userUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        console.log(`📥 Response from ${userUrl}: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const userData = await response.json();
          
          console.log('✅ Successfully retrieved user data from Sentry:');
          console.log(`   - Endpoint: ${userUrl}`);
          console.log(`   - User ID: ${userData.id}`);
          console.log(`   - Email: ${userData.email}`);
          console.log(`   - Name: ${userData.name || 'Not provided'}`);
          console.log(`   - Username: ${userData.username || 'Not provided'}`);
          console.log(`   - Avatar: ${userData.avatar ? 'Yes' : 'No'}`);
          console.log(`   - Available Fields: ${Object.keys(userData).join(', ')}`);
          
          if (!userData.id || !userData.email) {
            console.warn(`⚠️  Invalid user data from ${userUrl}`, userData);
            lastError = new Error(`Invalid user data from ${userUrl}`);
            continue;
          }
          
          // Success! Return the normalized user data
          return {
            id: userData.id,
            email: userData.email,
            name: userData.name || userData.username || userData.email.split('@')[0],
            username: userData.username,
            avatar: userData.avatar?.avatarUrl || userData.avatar?.url || userData.avatar,
          };
        } else {
          const errorText = await response.text();
          console.warn(`⚠️  Failed endpoint ${userUrl}: ${response.status} ${response.statusText}`);
          lastError = new Error(`${response.status}: ${errorText.substring(0, 200)}`);
          continue;
        }
      } catch (endpointError) {
        const errorMessage = endpointError instanceof Error ? endpointError.message : String(endpointError);
        console.warn(`⚠️  Error trying endpoint ${userUrl}:`, errorMessage);
        lastError = endpointError instanceof Error ? endpointError : new Error(String(endpointError));
        continue;
      }
    }

    // If we get here, all endpoints failed
    const finalError = lastError || new Error('All Sentry user endpoints failed');
    console.error('❌ All Sentry user endpoints failed:', finalError.message);
    console.error('📋 Tried endpoints:', possibleEndpoints);
    
    Sentry.captureException(finalError, {
      tags: { 
        oauth_service: 'sentry',
        oauth_step: 'user_info_all_failed'
      },
      extra: { 
        triedEndpoints: possibleEndpoints,
        lastError: lastError?.message,
        accessTokenLength: accessToken.length
      }
    });
    
    throw finalError;
  }

  /**
   * 🎯 COMPLETE OAUTH FLOW: Combines token exchange + user info retrieval
   * 
   * This is the main method that handles the complete Sentry OAuth flow
   */
  async completeOAuthFlow(code) {
    console.log('🎯 Starting complete Sentry OAuth flow...');
    
    // Step 1: Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(code);
    
    // Check if user info is included in token response (some providers do this)
    if (tokenResponse.user || tokenResponse.user_info || tokenResponse.profile) {
      const userInfo = tokenResponse.user || tokenResponse.user_info || tokenResponse.profile;
      
      console.log('✅ Found user info in Sentry token response (bonus!)');
      console.log('📋 User info fields:', Object.keys(userInfo));
      
      if (userInfo.id && userInfo.email) {
        return {
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name || userInfo.username || userInfo.email.split('@')[0],
            username: userInfo.username,
            avatar: userInfo.avatar,
          },
          accessToken: tokenResponse.access_token,
        };
      }
    }
    
    // Step 2: Fall back to fetching user info from API
    console.log('📡 User info not in token response, fetching from Sentry API...');
    const user = await this.getUserInfo(tokenResponse.access_token);
    
    console.log('🎉 Sentry OAuth flow completed successfully!');
    
    return {
      user,
      accessToken: tokenResponse.access_token,
    };
  }
}

// Export singleton instance
const sentryOAuthService = new SentryOAuthService();
module.exports = { sentryOAuthService };