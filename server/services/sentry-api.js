/**
 * 🎯 SENTRY API SERVICE
 * 
 * This service handles authenticated API calls to Sentry for dashboard metrics.
 * 
 * 📊 What this provides:
 * 1. Organization and project information
 * 2. Error/issue statistics
 * 3. Alert rules and notifications
 * 4. Session replay data
 * 5. Performance metrics
 */

const fetch = require('node-fetch');

class SentryAPIService {
  constructor() {
    this.baseUrl = process.env.SENTRY_BASE_URL || 'https://sentry.io';
  }

  /**
   * Make authenticated request to Sentry API
   */
  async makeRequest(endpoint, accessToken) {
    const url = `${this.baseUrl}/api/0${endpoint}`;
    
    console.log(`📡 Making Sentry API request: ${url}`);
    console.log(`🔑 Access token length: ${accessToken ? accessToken.length : 'No token'}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Sentry API error (${response.status}): ${errorText}`);
        console.error(`❌ Failed URL: ${url}`);
        
        // More specific error handling
        if (response.status === 401) {
          throw new Error(`Authentication failed - check access token and scopes`);
        } else if (response.status === 403) {
          throw new Error(`Permission denied - insufficient scopes for ${endpoint}`);
        } else if (response.status === 404) {
          throw new Error(`Resource not found - check organization slug and endpoint`);
        }
        
        throw new Error(`Sentry API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Sentry API response received for ${endpoint}:`, 
        Array.isArray(data) ? `Array with ${data.length} items` : typeof data);
      
      // Log first few items if it's an array  
      if (Array.isArray(data) && data.length > 0) {
        console.log(`📋 Sample data (first item):`, JSON.stringify(data[0], null, 2));
      } else if (Array.isArray(data) && data.length === 0) {
        console.log(`📋 Empty array returned - this might indicate no data or incorrect query parameters`);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Error making Sentry API request to ${endpoint}:`, error.message);
      console.error(`❌ Full error:`, error);
      throw error;
    }
  }

  /**
   * Get user's organizations
   */
  async getOrganizations(accessToken) {
    return this.makeRequest('/organizations/', accessToken);
  }

  /**
   * Get organization details
   */
  async getOrganization(orgSlug, accessToken) {
    return this.makeRequest(`/organizations/${orgSlug}/`, accessToken);
  }

  /**
   * Get organization projects
   */
  async getProjects(orgSlug, accessToken) {
    return this.makeRequest(`/organizations/${orgSlug}/projects/`, accessToken);
  }

  /**
   * Get organization members
   */
  async getMembers(orgSlug, accessToken) {
    return this.makeRequest(`/organizations/${orgSlug}/members/`, accessToken);
  }

  /**
   * Get organization issues with statistics
   */
  async getIssues(orgSlug, accessToken, options = {}) {
    const params = new URLSearchParams({
      statsPeriod: options.statsPeriod || '14d',
      limit: Math.min(options.limit || 100, 100), // Sentry API max is 100
      sort: options.sort || 'date',
      // Use empty query to get ALL issues, not just unresolved high/medium priority
      query: options.query !== undefined ? options.query : '',
      project: '-1' // Get issues from all projects
    });
    
    // If specific project is selected and we have a projectId, override the default
    if (options.projectId) {
      params.set('project', options.projectId);
    }
    
    console.log(`📡 Fetching issues with params:`, params.toString());
    console.log(`📡 Full URL: ${this.baseUrl}/api/0/organizations/${orgSlug}/issues/?${params.toString()}`);
    return this.makeRequest(`/organizations/${orgSlug}/issues/?${params}`, accessToken);
  }

  /**
   * Get organization metric alert rules
   */
  async getAlertRules(orgSlug, accessToken) {
    console.log(`📡 Fetching metric alert rules for organization: ${orgSlug}`);
    return this.makeRequest(`/organizations/${orgSlug}/alert-rules/`, accessToken);
  }

  /**
   * Get organization session replays
   */
  async getReplays(orgSlug, accessToken, options = {}) {
    const params = new URLSearchParams({
      statsPeriod: options.statsPeriod || '14d',
      per_page: Math.min(options.limit || 100, 100), // Use per_page instead of limit
      sort: options.sort || '-started_at'
    });
    
    // If specific project is selected, add project filter using projectSlug
    if (options.projectSlug) {
      params.set('projectSlug', options.projectSlug);
    }
    
    console.log(`📡 Fetching replays with params:`, params.toString());
    console.log(`📡 Full URL: ${this.baseUrl}/api/0/organizations/${orgSlug}/replays/?${params.toString()}`);
    
    const response = await this.makeRequest(`/organizations/${orgSlug}/replays/?${params}`, accessToken);
    
    // Handle different response structures - replays API might return object with data array
    if (response && typeof response === 'object') {
      if (Array.isArray(response)) {
        return response;
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`📡 Extracted ${response.data.length} replays from data property`);
        return response.data;
      } else if (response.results && Array.isArray(response.results)) {
        console.log(`📡 Extracted ${response.results.length} replays from results property`);
        return response.results;
      } else {
        console.log(`📡 Replays response is object but no data array found:`, Object.keys(response));
        return [];
      }
    }
    
    return response || [];
  }

  /**
   * Get project-level issue alert rules for comprehensive metrics
   */
  async getProjectAlertRules(orgSlug, projectSlug, accessToken) {
    console.log(`📡 Fetching issue alert rules for project: ${orgSlug}/${projectSlug}`);
    return this.makeRequest(`/projects/${orgSlug}/${projectSlug}/rules/`, accessToken);
  }

  /**
   * Get event statistics for organization
   */
  async getEventStats(orgSlug, accessToken, options = {}) {
    const params = new URLSearchParams({
      statsPeriod: options.statsPeriod || '14d',
      interval: options.interval || '1d',
      ...options
    });
    
    return this.makeRequest(`/organizations/${orgSlug}/events-stats/?${params}`, accessToken);
  }

  /**
   * Get comprehensive dashboard metrics for an organization
   */
  async getDashboardMetrics(orgSlug, accessToken, options = {}) {
    try {
      console.log(`📊 Fetching dashboard metrics for organization: ${orgSlug}`, options);
      
      // First, get projects to resolve project slug to ID if needed
      let projectId = null;
      let projectSlug = null;
      
      if (options.project && options.project !== 'all') {
        try {
          const projects = await this.getProjects(orgSlug, accessToken);
          const project = projects.find(p => p.slug === options.project);
          if (project) {
            projectId = project.id;
            projectSlug = project.slug;
          }
        } catch (err) {
          console.warn('Could not resolve project slug to ID:', err.message);
        }
      }
      
      const issueOptions = { 
        limit: 100, 
        statsPeriod: options.statsPeriod || '14d',
        projectId: projectId
      };
      const replayOptions = { 
        limit: 100, 
        statsPeriod: options.statsPeriod || '14d',
        projectSlug: projectSlug 
      };
      
      const [
        org,
        projects,
        members,
        issues,
        alertRules,
        replays,
        eventStats
      ] = await Promise.allSettled([
        this.getOrganization(orgSlug, accessToken),
        this.getProjects(orgSlug, accessToken),
        this.getMembers(orgSlug, accessToken),
        this.getIssues(orgSlug, accessToken, issueOptions),
        this.getAlertRules(orgSlug, accessToken),
        this.getReplays(orgSlug, accessToken, replayOptions),
        this.getEventStats(orgSlug, accessToken)
      ]);

      // Process results and handle failures gracefully
      const result = {
        organization: org.status === 'fulfilled' ? org.value : null,
        projects: projects.status === 'fulfilled' ? projects.value : [],
        members: members.status === 'fulfilled' ? members.value : [],
        issues: issues.status === 'fulfilled' ? issues.value : [],
        alertRules: alertRules.status === 'fulfilled' ? alertRules.value : [],
        replays: replays.status === 'fulfilled' ? replays.value : [],
        eventStats: eventStats.status === 'fulfilled' ? eventStats.value : null,
        
        // Calculated metrics
        metrics: {
          totalProjects: projects.status === 'fulfilled' ? projects.value.length : 0,
          totalMembers: members.status === 'fulfilled' ? members.value.length : 0,
          totalIssues: issues.status === 'fulfilled' ? issues.value.length : 0,
          totalAlertRules: alertRules.status === 'fulfilled' ? alertRules.value.length : 0,
          totalReplays: replays.status === 'fulfilled' ? replays.value.length : 0,
          
          // Issue statistics by level
          issuesByLevel: this.calculateIssuesByLevel(issues.status === 'fulfilled' ? issues.value : []),
          
          // Project statistics
          projectStats: this.calculateProjectStats(projects.status === 'fulfilled' ? projects.value : []),
          
          // Recent activity
          recentIssues: this.getRecentIssues(issues.status === 'fulfilled' ? issues.value : []),
          recentReplays: this.getRecentReplays(replays.status === 'fulfilled' ? replays.value : [])
        }
      };

      // Log detailed results for each endpoint
      const endpoints = ['organization', 'projects', 'members', 'issues', 'alertRules', 'replays', 'eventStats'];
      const results = [org, projects, members, issues, alertRules, replays, eventStats];
      
      results.forEach((result, index) => {
        const endpointName = endpoints[index];
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (Array.isArray(data)) {
            console.log(`✅ ${endpointName}: SUCCESS - ${data.length} items`);
          } else {
            console.log(`✅ ${endpointName}: SUCCESS - ${typeof data}`);
          }
        } else {
          console.error(`❌ ${endpointName}: FAILED - ${result.reason.message}`);
          console.error(`❌ ${endpointName} full error:`, result.reason);
        }
      });

      console.log('✅ Dashboard metrics compiled successfully');
      console.log(`📊 Final metrics summary:`, {
        org: result.organization?.name || 'N/A',
        orgSlug: result.organization?.slug || 'N/A', 
        projectCount: result.projects.length,
        issueCount: result.issues.length,
        replayCount: result.replays.length,
        memberCount: result.members.length,
        alertRuleCount: result.alertRules.length,
        hasEventStats: !!result.eventStats
      });
      
      // Debug the calculated metrics in detail
      console.log('🔍 DETAILED METRICS DEBUG:');
      console.log('📊 Calculated metrics object:', JSON.stringify(result.metrics, null, 2));
      console.log('📊 Issues by level:', result.metrics.issuesByLevel);
      console.log('📊 Total counts:', {
        totalProjects: result.metrics.totalProjects,
        totalMembers: result.metrics.totalMembers,
        totalIssues: result.metrics.totalIssues,
        totalAlertRules: result.metrics.totalAlertRules,
        totalReplays: result.metrics.totalReplays
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error fetching dashboard metrics:', error);
      
      // Return a fallback structure instead of throwing
      return {
        organization: null,
        projects: [],
        members: [],
        issues: [],
        alertRules: [],
        replays: [],
        eventStats: null,
        metrics: {
          totalProjects: 0,
          totalMembers: 0,
          totalIssues: 0,
          totalAlertRules: 0,
          totalReplays: 0,
          issuesByLevel: { error: 0, warning: 0, info: 0, debug: 0, fatal: 0 },
          projectStats: { platformCounts: {}, totalEvents: 0, avgEventsPerProject: 0 },
          recentIssues: [],
          recentReplays: []
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate issues by error level
   */
  calculateIssuesByLevel(issues) {
    const levels = { error: 0, warning: 0, info: 0, debug: 0, fatal: 0 };
    
    if (!Array.isArray(issues) || issues.length === 0) {
      console.log('📊 No issues data for level calculation');
      return levels;
    }
    
    try {
      issues.forEach(issue => {
        const level = issue.level || 'error';
        if (levels.hasOwnProperty(level)) {
          levels[level]++;
        } else {
          levels.error++;
        }
      });
      
      console.log('📊 Issues by level calculated:', levels);
      return levels;
    } catch (error) {
      console.error('Error calculating issues by level:', error);
      return levels;
    }
  }

  /**
   * Calculate project statistics
   */
  calculateProjectStats(projects) {
    const platformCounts = {};
    let totalEvents = 0;
    
    if (!Array.isArray(projects) || projects.length === 0) {
      console.log('📊 No projects data for stats calculation');
      return {
        platformCounts: {},
        totalEvents: 0,
        avgEventsPerProject: 0
      };
    }
    
    try {
      projects.forEach(project => {
        // Count by platform
        const platform = project.platform || 'unknown';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        
        // Sum events if available
        if (project.stats && Array.isArray(project.stats) && project.stats.length > 0) {
          totalEvents += project.stats.reduce((sum, stat) => sum + (stat[1] || 0), 0);
        }
      });
      
      const result = {
        platformCounts,
        totalEvents,
        avgEventsPerProject: projects.length > 0 ? Math.round(totalEvents / projects.length) : 0
      };
      
      console.log('📊 Project stats calculated:', result);
      return result;
    } catch (error) {
      console.error('Error calculating project stats:', error);
      return {
        platformCounts: {},
        totalEvents: 0,
        avgEventsPerProject: 0
      };
    }
  }

  /**
   * Get recent issues (last 7 days)
   */
  getRecentIssues(issues) {
    if (!Array.isArray(issues) || issues.length === 0) {
      console.log('📊 No issues data for recent calculation');
      return [];
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      return issues
        .filter(issue => issue.firstSeen && new Date(issue.firstSeen) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen))
        .slice(0, 10);
    } catch (error) {
      console.error('Error calculating recent issues:', error);
      return [];
    }
  }

  /**
   * Get recent replays (last 7 days)
   */
  getRecentReplays(replays) {
    if (!Array.isArray(replays) || replays.length === 0) {
      console.log('📊 No replays data for recent calculation');
      return [];
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      return replays
        .filter(replay => replay.startedAt && new Date(replay.startedAt) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
        .slice(0, 10);
    } catch (error) {
      console.error('Error calculating recent replays:', error);
      return [];
    }
  }
}

module.exports = { SentryAPIService };