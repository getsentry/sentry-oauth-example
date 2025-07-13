/**
 * 🎯 SENTRY AUTHENTICATION DEMO - SIMPLE IN-MEMORY STORAGE
 * 
 * This is a simplified in-memory user store to demonstrate Sentry OAuth flow.
 * In production, you would use a real database (PostgreSQL, MySQL, etc.)
 * 
 * 📝 What this demonstrates for Sentry Authentication:
 * - How to store user data received from Sentry OAuth
 * - What user information Sentry provides via OAuth
 * - How to map Sentry users to your application users
 */

class SimpleUserStore {
  constructor() {
    // In-memory storage for demo purposes
    this.users = new Map();
    this.usersBySentryId = new Map();
    this.usersByEmail = new Map();
    this.nextId = 1;

    console.log('📚 Simple User Store initialized (in-memory for demo)');
  }

  /**
   * 🔍 Find user by Sentry ID (most important for OAuth)
   * This is how we link OAuth responses back to stored users
   */
  findUserBySentryId(sentryId) {
    return Promise.resolve(this.usersBySentryId.get(sentryId) || null);
  }

  /**
   * 🔍 Find user by email (alternative lookup)
   */
  findUserByEmail(email) {
    return Promise.resolve(this.usersByEmail.get(email) || null);
  }

  /**
   * 🔍 Find user by internal ID (for session management)
   */
  findUserById(id) {
    return Promise.resolve(this.users.get(id) || null);
  }

  /**
   * ✨ Create new user from Sentry OAuth data
   * 
   * 📋 Sentry provides these user fields via OAuth:
   * - id: Unique Sentry user identifier
   * - email: User's email address
   * - name: Display name
   * - username: Sentry username
   * - avatar: Avatar URL (optional)
   */
  createUser(sentryUser, accessToken) {
    const user = {
      id: this.nextId++,
      sentry_id: sentryUser.id,
      email: sentryUser.email,
      name: sentryUser.name,
      username: sentryUser.username,
      avatar_url: sentryUser.avatar?.avatarUrl || sentryUser.avatar,
      access_token: accessToken, // Store for potential API calls
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in all our indexes
    this.users.set(user.id, user);
    this.usersBySentryId.set(user.sentry_id, user);
    this.usersByEmail.set(user.email, user);

    console.log(`👤 Created new user from Sentry OAuth:`, {
      id: user.id,
      sentry_id: user.sentry_id,
      email: user.email,
      name: user.name
    });

    return Promise.resolve(user);
  }

  /**
   * 🔄 Update existing user with fresh Sentry data
   * Called on each login to keep user info current
   */
  updateUser(sentryUser, accessToken) {
    const existingUser = this.usersBySentryId.get(sentryUser.id);
    if (!existingUser) {
      throw new Error('User not found for update');
    }

    // Update with fresh data from Sentry
    const updatedUser = {
      ...existingUser,
      email: sentryUser.email,
      name: sentryUser.name,
      username: sentryUser.username,
      avatar_url: sentryUser.avatar?.avatarUrl || sentryUser.avatar,
      access_token: accessToken,
      updated_at: new Date().toISOString()
    };

    // Update all indexes
    this.users.set(updatedUser.id, updatedUser);
    this.usersBySentryId.set(updatedUser.sentry_id, updatedUser);
    
    // Handle email changes
    if (existingUser.email !== updatedUser.email) {
      this.usersByEmail.delete(existingUser.email);
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }

    console.log(`🔄 Updated user from Sentry OAuth:`, {
      id: updatedUser.id,
      sentry_id: updatedUser.sentry_id,
      email: updatedUser.email,
      name: updatedUser.name
    });

    return Promise.resolve(updatedUser);
  }

  /**
   * 📊 Get stats about stored users (for demo purposes)
   */
  getStats() {
    return {
      totalUsers: this.users.size,
      users: Array.from(this.users.values()).map(user => ({
        id: user.id,
        sentry_id: user.sentry_id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }))
    };
  }
}

// Export singleton instance
module.exports = new SimpleUserStore();