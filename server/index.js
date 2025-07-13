/**
 * 🎯 SENTRY OAUTH AUTHENTICATION DEMO SERVER
 * 
 * This Express.js server demonstrates how to implement Sentry OAuth 2.0 authentication.
 * 
 * 🔐 Key Sentry Authentication Features Demonstrated:
 * 1. OAuth 2.0 authorization flow with Sentry
 * 2. Secure state parameter validation
 * 3. Token exchange with Sentry's OAuth endpoint
 * 4. User information retrieval from Sentry API
 * 5. Session management for authenticated users
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const { sentryOAuthService } = require('./services/sentry-oauth.js');
const { SentryAPIService } = require('./services/sentry-api.js');
const database = require('./database');

const sentryAPI = new SentryAPIService();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('\n🚀 Starting Sentry OAuth Demo Server...');
console.log('📝 This server demonstrates Sentry OAuth 2.0 authentication flow\n');

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 🍪 Session configuration for Sentry OAuth
// In production, use a persistent session store (Redis, database, etc.)
app.use(session({
  secret: process.env.SESSION_SECRET || 'sentry-demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// 🔒 Authentication middleware - checks if user has valid session
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

console.log('🛠️  Setting up Sentry OAuth routes...\n');

// 📋 SENTRY OAUTH ROUTES 

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sentry OAuth Demo Server is running',
    timestamp: new Date().toISOString() 
  });
});

// 👤 Get current authenticated user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await database.findUserById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    console.log(`📊 User info requested for Sentry ID: ${user.sentry_id}`);
    
    // Return user without sensitive data (access token)
    const { access_token, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🚀 Step 1: Initiate Sentry OAuth login
app.get('/api/auth/login', (req, res) => {
  try {
    console.log('\n🔐 STARTING SENTRY OAUTH FLOW');
    console.log('Step 1: Generating authorization URL...');
    
    // Generate secure state parameter to prevent CSRF attacks
    const state = uuidv4();
    req.session.oauthState = state;
    
    // Get Sentry authorization URL
    const authUrl = sentryOAuthService.getAuthorizationUrl(state);
    
    console.log('✅ Authorization URL generated');
    console.log('🔗 Redirecting user to Sentry for authentication\n');
    
    res.json({ authUrl });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// 🔄 Step 2: Handle OAuth callback from Sentry
app.get('/api/auth/callback', async (req, res) => {
  try {
    console.log('\n🔄 SENTRY OAUTH CALLBACK RECEIVED');
    console.log('Step 2: Processing Sentry OAuth response...');
    
    const { code, state } = req.query;

    // 🛡️ Verify state parameter (CSRF protection)
    if (!state || state !== req.session.oauthState) {
      console.log('❌ Invalid state parameter - possible CSRF attack');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    console.log('✅ State parameter verified');

    // Clear the state from session
    delete req.session.oauthState;

    if (!code) {
      console.log('❌ No authorization code received from Sentry');
      return res.status(400).json({ error: 'Authorization code not provided' });
    }
    console.log('✅ Authorization code received from Sentry');

    // 🎫 Step 3: Exchange code for access token + get user info
    console.log('Step 3: Exchanging code for token and fetching user data...');
    const { user: sentryUser, accessToken } = await sentryOAuthService.completeOAuthFlow(code);
    
    console.log('✅ Successfully retrieved user data from Sentry:');
    console.log(`   - Sentry ID: ${sentryUser.id}`);
    console.log(`   - Email: ${sentryUser.email}`);
    console.log(`   - Name: ${sentryUser.name}`);

    // 👤 Step 4: Create or update user in our system
    let user = await database.findUserBySentryId(sentryUser.id);

    if (user) {
      console.log('🔄 Updating existing user with fresh Sentry data');
      user = await database.updateUser(sentryUser, accessToken);
    } else {
      console.log('👤 Creating new user from Sentry OAuth data');
      user = await database.createUser(sentryUser, accessToken);
    }

    // 🍪 Step 5: Create user session
    req.session.userId = user.id;
    req.session.sentryId = sentryUser.id;
    console.log('✅ User session created');

    console.log('🎉 SENTRY OAUTH FLOW COMPLETED SUCCESSFULLY\n');

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/success`);

  } catch (error) {
    console.error('❌ SENTRY OAUTH CALLBACK ERROR:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

// 🚪 Logout and destroy session
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 User logging out, destroying session');
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    console.log('✅ User session destroyed');
    res.json({ message: 'Logged out successfully' });
  });
});

// 🔒 Example protected route
app.get('/api/protected', requireAuth, (req, res) => {
  console.log(`🔒 Protected route accessed by user: ${req.session.userId}`);
  res.json({ 
    message: 'This is a protected route - you are authenticated with Sentry!',
    userId: req.session.userId,
    sentryId: req.session.sentryId,
    timestamp: new Date().toISOString()
  });
});

// 📊 Get user's Sentry organizations
app.get('/api/dashboard/organizations', requireAuth, async (req, res) => {
  try {
    const user = await database.findUserById(req.session.userId);
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    console.log(`📊 Fetching organizations for user: ${user.sentry_id}`);
    const organizations = await sentryAPI.getOrganizations(user.access_token);
    
    res.json({ organizations });
  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// 📊 Get comprehensive dashboard metrics for a specific organization
app.get('/api/dashboard/metrics/:orgSlug', requireAuth, async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const { project } = req.query;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    console.log(`📊 Fetching dashboard metrics for organization: ${orgSlug}`, { project });
    console.log(`🔑 Access token length: ${user.access_token.length}`);
    
    const options = project ? { project } : {};
    const metrics = await sentryAPI.getDashboardMetrics(orgSlug, user.access_token, options);
    
    console.log(`✅ Successfully fetched metrics for ${orgSlug}`);
    res.json(metrics);
  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics', 
      details: error.message,
      orgSlug 
    });
  }
});

// 📊 Get specific data types for an organization
app.get('/api/dashboard/:orgSlug/projects', requireAuth, async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    const projects = await sentryAPI.getProjects(orgSlug, user.access_token);
    res.json({ projects });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/dashboard/:orgSlug/issues', requireAuth, async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    const options = {
      statsPeriod: req.query.statsPeriod || '14d',
      limit: Math.min(parseInt(req.query.limit) || 100, 100)
    };

    const issues = await sentryAPI.getIssues(orgSlug, user.access_token, options);
    res.json({ issues });
  } catch (error) {
    console.error('❌ Error fetching issues:', error);
    res.status(500).json({ error: 'Failed to fetch issues', details: error.message });
  }
});

app.get('/api/dashboard/:orgSlug/alert-rules', requireAuth, async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    const alertRules = await sentryAPI.getAlertRules(orgSlug, user.access_token);
    res.json({ alertRules });
  } catch (error) {
    console.error('❌ Error fetching alert rules:', error);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

app.get('/api/dashboard/:orgSlug/replays', requireAuth, async (req, res) => {
  try {
    const { orgSlug } = req.params;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    const options = {
      statsPeriod: req.query.statsPeriod || '14d',
      limit: req.query.limit || '100'
    };

    const replays = await sentryAPI.getReplays(orgSlug, user.access_token, options);
    res.json({ replays });
  } catch (error) {
    console.error('❌ Error fetching replays:', error);
    res.status(500).json({ error: 'Failed to fetch replays' });
  }
});

// 🔍 Debug endpoint to test individual API calls
app.get('/api/debug/:orgSlug/:endpoint', requireAuth, async (req, res) => {
  try {
    const { orgSlug, endpoint } = req.params;
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    console.log(`🔍 Debug endpoint called: ${endpoint} for org: ${orgSlug}`);
    console.log(`🔑 Using access token: ${user.access_token.substring(0, 10)}...`);
    
    let result;
    switch (endpoint) {
      case 'issues':
        result = await sentryAPI.getIssues(orgSlug, user.access_token, { limit: 10 });
        break;
      case 'replays':
        result = await sentryAPI.getReplays(orgSlug, user.access_token, { limit: 10 });
        break;
      case 'projects':
        result = await sentryAPI.getProjects(orgSlug, user.access_token);
        break;
      case 'members':
        result = await sentryAPI.getMembers(orgSlug, user.access_token);
        break;
      case 'alert-rules':
        result = await sentryAPI.getAlertRules(orgSlug, user.access_token);
        break;
      case 'org':
        result = await sentryAPI.getOrganization(orgSlug, user.access_token);
        break;
      default:
        return res.status(400).json({ error: 'Invalid endpoint. Use: issues, replays, projects, members, alert-rules, org' });
    }
    
    res.json({ 
      endpoint, 
      orgSlug,
      count: Array.isArray(result) ? result.length : 'N/A',
      data: result 
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 🔍 Test basic organizations endpoint to verify API access
app.get('/api/test/organizations', requireAuth, async (req, res) => {
  try {
    const user = await database.findUserById(req.session.userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'No Sentry access token found' });
    }

    console.log(`🧪 Testing basic organizations API access`);
    console.log(`🔑 Access token length: ${user.access_token.length}`);
    
    const organizations = await sentryAPI.getOrganizations(user.access_token);
    
    res.json({ 
      success: true,
      count: organizations.length,
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug
      }))
    });
  } catch (error) {
    console.error('❌ Organizations test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message, 
      details: error.stack 
    });
  }
});

// 📊 Demo route: Show user storage stats
app.get('/api/demo/stats', (req, res) => {
  const stats = database.getStats();
  console.log('📊 User storage stats requested');
  res.json({
    message: 'Sentry OAuth Demo - User Storage Stats',
    ...stats
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SENTRY OAUTH DEMO SERVER READY!');
  console.log('='.repeat(60));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔐 Sentry OAuth Client ID: ${process.env.SENTRY_OAUTH_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   - GET  /health                           (Health check)');
  console.log('   - GET  /api/auth/login                   (Start OAuth flow)');
  console.log('   - GET  /api/auth/callback                (OAuth callback)');
  console.log('   - GET  /api/auth/me                      (Get current user)');
  console.log('   - POST /api/auth/logout                  (Logout)');
  console.log('   - GET  /api/protected                    (Protected route example)');
  console.log('   - GET  /api/dashboard/organizations      (Get user\'s Sentry orgs)');
  console.log('   - GET  /api/dashboard/metrics/:orgSlug   (Get org dashboard metrics)');
  console.log('   - GET  /api/dashboard/:orgSlug/projects  (Get org projects)');
  console.log('   - GET  /api/dashboard/:orgSlug/issues    (Get org issues)');
  console.log('   - GET  /api/dashboard/:orgSlug/alert-rules (Get org alert rules)');
  console.log('   - GET  /api/dashboard/:orgSlug/replays   (Get org replays)');
  console.log('   - GET  /api/demo/stats                   (User storage stats)');
  console.log('');
  console.log('🚀 Ready to demonstrate Sentry OAuth authentication!');
  console.log('='.repeat(60) + '\n');
});