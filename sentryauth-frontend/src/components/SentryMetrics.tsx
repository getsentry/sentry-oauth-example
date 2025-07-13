import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import './SentryMetrics.css';

interface Organization {
  slug: string;
  name: string;
  id: string;
}

interface Project {
  slug: string;
  name: string;
  id: string;
  platform?: string;
}

interface DashboardMetrics {
  organization: Organization;
  projects: any[];
  members: any[];
  issues: any[];
  alertRules: any[];
  replays: any[];
  eventStats: any;
  metrics: {
    totalProjects: number;
    totalMembers: number;
    totalIssues: number;
    totalAlertRules: number;
    totalReplays: number;
    issuesByLevel: {
      error: number;
      warning: number;
      info: number;
      debug: number;
      fatal: number;
    };
    projectStats: {
      platformCounts: Record<string, number>;
      totalEvents: number;
      avgEventsPerProject: number;
    };
    recentIssues: any[];
    recentReplays: any[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function SentryMetrics() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchProjects(selectedOrg);
      fetchMetrics(selectedOrg);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedOrg) {
      console.log('🔄 Project changed, refetching metrics for:', selectedProject);
      fetchMetrics(selectedOrg);
    }
  }, [selectedProject]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/dashboard/organizations`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const data = await response.json();
      setOrganizations(data.organizations || []);
      
      if (data.organizations && data.organizations.length > 0) {
        setSelectedOrg(data.organizations[0].slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (orgSlug: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/dashboard/${orgSlug}/projects`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchMetrics = async (orgSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${apiUrl}/api/dashboard/metrics/${orgSlug}`;
      if (selectedProject && selectedProject !== 'all') {
        url += `?project=${selectedProject}`;
      }
      
      console.log('🔄 Fetching metrics from:', url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      console.log('📊 Received metrics data:', data);
      console.log('📊 Issues data:', data.issues?.length || 0, 'items');
      console.log('📊 Replays data:', data.replays?.length || 0, 'items');
      console.log('📊 Metrics summary:', data.metrics);
      
      setMetrics(data);
    } catch (err) {
      console.error('❌ Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatIssuesForPieChart = (issuesByLevel: Record<string, number>) => {
    console.log('📊 Formatting issues by level:', issuesByLevel);
    const result = Object.entries(issuesByLevel)
      .filter(([_, count]) => count > 0)
      .map(([level, count]) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: count,
        level
      }));
    
    console.log('📊 Pie chart data:', result);
    return result;
  };

  const formatPlatformData = (platformCounts: Record<string, number>) => {
    return Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        count
      }))
      .sort((a, b) => b.count - a.count);
  };

  const formatRecentIssuesForChart = (recentIssues: any[]) => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const issuesOnDate = recentIssues.filter(issue => 
        issue.firstSeen.split('T')[0] === dateStr
      ).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        issues: issuesOnDate
      });
    }
    
    return last7Days;
  };

  if (loading && !metrics) {
    return (
      <div className="sentry-metrics">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading Sentry metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sentry-metrics">
        <div className="error-state">
          <h3>❌ Error Loading Metrics</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sentry-metrics">
      <div className="metrics-header">
        <h2>📊 Sentry Metrics Dashboard</h2>
        <div className="selectors-container">
          {organizations.length > 1 && (
            <select 
              value={selectedOrg} 
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="org-selector"
            >
              {organizations.map(org => (
                <option key={org.slug} value={org.slug}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
          
          {projects.length > 0 && (
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
              className="project-selector"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {metrics && (
        <>
          {/* Overview Cards */}
          <div className="metrics-overview">
            <div className="metric-card">
              <div className="metric-icon">📁</div>
              <div className="metric-content">
                <h3>{metrics.metrics.totalProjects}</h3>
                <p>Projects</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">🚨</div>
              <div className="metric-content">
                <h3>{metrics.metrics.totalIssues}</h3>
                <p>Issues</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">⚠️</div>
              <div className="metric-content">
                <h3>{metrics.metrics.totalAlertRules}</h3>
                <p>Alert Rules</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">🎬</div>
              <div className="metric-content">
                <h3>{metrics.metrics.totalReplays}</h3>
                <p>Session Replays</p>
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <h3>{metrics.metrics.totalMembers}</h3>
                <p>Team Members</p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Issues by Level Pie Chart */}
            <div className="chart-container">
              <h3>Issues by Severity Level</h3>
              {formatIssuesForPieChart(metrics.metrics.issuesByLevel).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatIssuesForPieChart(metrics.metrics.issuesByLevel)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {formatIssuesForPieChart(metrics.metrics.issuesByLevel).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2d3748', 
                        border: '1px solid #4a5568',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                  No issues found for the selected time period
                </div>
              )}
            </div>

            {/* Projects by Platform */}
            <div className="chart-container">
              <h3>Projects by Platform</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatPlatformData(metrics.metrics.projectStats.platformCounts)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="platform" tick={{ fill: '#e2e8f0' }} />
                  <YAxis tick={{ fill: '#e2e8f0' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2d3748', 
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }} 
                  />
                  <Bar dataKey="count" fill="#63b3ed" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Issues Trend */}
            <div className="chart-container">
              <h3>New Issues (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formatRecentIssuesForChart(metrics.metrics.recentIssues)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="date" tick={{ fill: '#e2e8f0' }} />
                  <YAxis tick={{ fill: '#e2e8f0' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2d3748', 
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }} 
                  />
                  <Area type="monotone" dataKey="issues" stroke="#68d391" fill="#68d391" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Organization Summary */}
            <div className="chart-container summary-card">
              <h3>Organization Summary</h3>
              <div className="summary-content">
                <div className="summary-row">
                  <span className="summary-label">Organization:</span>
                  <span className="summary-value">{metrics.organization?.name}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total Events:</span>
                  <span className="summary-value">{metrics.metrics.projectStats.totalEvents.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Avg Events/Project:</span>
                  <span className="summary-value">{metrics.metrics.projectStats.avgEventsPerProject.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Recent Issues:</span>
                  <span className="summary-value">{metrics.metrics.recentIssues.length}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Recent Replays:</span>
                  <span className="summary-value">{metrics.metrics.recentReplays.length}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}