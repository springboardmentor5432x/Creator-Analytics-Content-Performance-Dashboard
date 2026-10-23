import './CreatorDashboard.css';

import { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  CircleDollarSign,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  Play,
  Camera,
  Video,
  ArrowRight,
  ArrowUpRight,
  Menu,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import './CreatorDashboard.css';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Content Analytics', icon: BarChart3 },
  { label: 'Audience', icon: Users },
  { label: 'Revenue', icon: CircleDollarSign },
  { label: 'Settings', icon: Settings },
];

const analyticsData = [
  { day: 'Mon', views: 4200, engagement: 2800 },
  { day: 'Tue', views: 6100, engagement: 3500 },
  { day: 'Wed', views: 4900, engagement: 3200 },
  { day: 'Thu', views: 8200, engagement: 4800 },
  { day: 'Fri', views: 7100, engagement: 4300 },
  { day: 'Sat', views: 10400, engagement: 6200 },
  { day: 'Sun', views: 9200, engagement: 5700 },
];

const videos = [
  {
    title: 'A day in my life ✨',
    platform: 'Instagram',
    date: 'Oct 20, 2026',
    views: '124.8K',
    likes: '12.4K',
    engagement: '9.8%',
    icon: Camera,
  },
  {
    title: 'My morning routine',
    platform: 'YouTube',
    date: 'Oct 18, 2026',
    views: '86.2K',
    likes: '8.1K',
    engagement: '8.4%',
    icon: Play,
  },
  {
    title: 'Things nobody tells you',
    platform: 'TikTok',
    date: 'Oct 16, 2026',
    views: '205.6K',
    likes: '24.7K',
    engagement: '12.1%',
    icon: Video,
  },
];

const metrics = [
  {
    title: 'Total Followers',
    value: '128.4K',
    change: '+12.8%',
    positive: true,
    icon: Users,
    description: 'vs. last month',
  },
  {
    title: 'Total Views',
    value: '842.6K',
    change: '+18.4%',
    positive: true,
    icon: Eye,
    description: 'vs. last month',
  },
  {
    title: 'Engagement Rate',
    value: '8.76%',
    change: '+2.1%',
    positive: true,
    icon: Heart,
    description: 'vs. last month',
  },
  {
    title: 'Total Revenue',
    value: '₹84,250',
    change: '-3.2%',
    positive: false,
    icon: CircleDollarSign,
    description: 'vs. last month',
  },
];

function CreatorDashboard() {
  const [activePage, setActivePage] = useState('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [showNotifications, setShowNotifications] = useState(false);

  const filteredVideos = videos.filter((video) =>
    `${video.title} ${video.platform}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="creator-dashboard">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">C</span>
          <span>Creator<span className="brand-iq">IQ</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="dashboard-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.label;

            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? 'nav-active' : ''}`}
                onClick={() => {
                  setActivePage(item.label);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {isActive && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><TrendingUp size={18} /></div>
            <strong>Creator tip</strong>
            <p>Your engagement is up this month. Keep posting consistently!</p>
          </div>

          <button className="profile-button">
            <div className="avatar">A</div>
            <div className="profile-info">
              <strong>Alex Morgan</strong>
              <span>Content Creator</span>
            </div>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <label className="dashboard-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>

            <div className="notification-wrapper">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={19} />
                <span className="notification-dot" />
              </button>

              {showNotifications && (
                <div className="notification-popover">
                  <strong>Notifications</strong>
                  <p>Your weekly performance report is ready.</p>
                  <p>Your latest video is gaining traction!</p>
                </div>
              )}
            </div>

            <div className="topbar-avatar">A</div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-section">
            <div>
              <div className="welcome-eyebrow">
                <span className="live-dot" />
                YOUR CREATOR WORKSPACE
              </div>

              <h1>
                Good morning, Alex<span>!</span>
              </h1>

              <p>Here's what's happening with your content today.</p>
            </div>

            <label className="date-select">
              <CalendarDays size={17} />
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                aria-label="Select date range"
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </section>

          {activePage === 'Overview' ? (
            <>
              <section className="metrics-grid">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;

                  return (
                    <article
                      className="metric-card"
                      key={metric.title}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="metric-card-top">
                        <span className="metric-title">{metric.title}</span>
                        <span className={`metric-icon metric-icon-${index}`}>
                          <Icon size={19} />
                        </span>
                      </div>

                      <div className="metric-value">{metric.value}</div>

                      <div className="metric-footer">
                        <span className={`metric-change ${metric.positive ? 'change-positive' : 'change-negative'}`}>
                          {metric.positive ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {metric.change}
                        </span>
                        <span>{metric.description}</span>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="analytics-grid">
                <article className="dashboard-card chart-card">
                  <div className="card-heading">
                    <div>
                      <h2>Performance overview</h2>
                      <p>Track your content performance over time.</p>
                    </div>

                    <button className="chart-menu">
                      Last 7 days <ChevronDown size={15} />
                    </button>
                  </div>

                  <div className="chart-summary">
                    <div>
                      <span className="chart-summary-label">Total views</span>
                      <strong>842,600</strong>
                    </div>
                    <span className="chart-growth">
                      <TrendingUp size={14} /> 18.4%
                    </span>
                  </div>

                  <div className="chart-legend">
                    <span><i className="legend-views" /> Views</span>
                    <span><i className="legend-engagement" /> Engagement</span>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C6FF39" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#C6FF39" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF8048" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#FF8048" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 5" stroke="#e9e6dc" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#929187', fontSize: 11 }} dy={10} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#929187', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            border: '1px solid #e9e6dc',
                            borderRadius: '10px',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="views"
                          stroke="#252620"
                          strokeWidth={2.5}
                          fill="url(#viewsGradient)"
                          animationDuration={1200}
                        />
                        <Area
                          type="monotone"
                          dataKey="engagement"
                          stroke="#FF8048"
                          strokeWidth={2}
                          fill="url(#engagementGradient)"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="dashboard-card platform-card">
                  <div className="card-heading">
                    <div>
                      <h2>Platform performance</h2>
                      <p>Your audience across platforms.</p>
                    </div>
                  </div>

                  <div className="platform-list">
                    <div className="platform-row">
                      <span className="platform-logo youtube-logo"><Play size={17} fill="currentColor" /></span>
                      <div className="platform-details">
                        <strong>YouTube</strong>
                        <span>54.2K followers</span>
                      </div>
                      <div className="platform-result">
                        <strong>+14.2%</strong>
                        <span>Growth</span>
                      </div>
                    </div>

                    <div className="platform-row">
                      <span className="platform-logo instagram-logo"><Camera size={18} /></span>
                      <div className="platform-details">
                        <strong>Instagram</strong>
                        <span>48.6K followers</span>
                      </div>
                      <div className="platform-result">
                        <strong>+9.8%</strong>
                        <span>Growth</span>
                      </div>
                    </div>

                    <div className="platform-row">
                      <span className="platform-logo tiktok-logo"><Video size={18} /></span>
                      <div className="platform-details">
                        <strong>TikTok</strong>
                        <span>25.6K followers</span>
                      </div>
                      <div className="platform-result">
                        <strong>+21.4%</strong>
                        <span>Growth</span>
                      </div>
                    </div>
                  </div>

                  <button className="view-platforms" onClick={() => setActivePage('Content Analytics')}>
                    View platform analytics <ArrowUpRight size={16} />
                  </button>
                </article>
              </section>

              <section className="dashboard-card content-card">
                <div className="card-heading content-heading">
                  <div>
                    <h2>Recent content</h2>
                    <p>See how your latest content is performing.</p>
                  </div>

                  <button
                    className="view-all-button"
                    onClick={() => setActivePage('Content Analytics')}
                  >
                    View all content <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="content-table-wrapper">
                  <table className="content-table">
                    <thead>
                      <tr>
                        <th>CONTENT</th>
                        <th>PLATFORM</th>
                        <th>VIEWS</th>
                        <th>LIKES</th>
                        <th>ENGAGEMENT</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredVideos.map((video) => {
                        const PlatformIcon = video.icon;

                        return (
                          <tr key={video.title}>
                            <td>
                              <div className="video-title-cell">
                                <div className="video-thumbnail">
                                  <Play size={15} fill="currentColor" />
                                </div>
                                <div>
                                  <strong>{video.title}</strong>
                                  <span>{video.date}</span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="platform-name">
                                <PlatformIcon size={15} />
                                {video.platform}
                              </span>
                            </td>

                            <td className="table-number">{video.views}</td>
                            <td className="table-number">{video.likes}</td>

                            <td>
                              <span className="engagement-badge">{video.engagement}</span>
                            </td>

                            <td>
                              <button
                                className="row-action"
                                aria-label={`View ${video.title}`}
                                onClick={() => setActivePage('Content Analytics')}
                              >
                                <ArrowUpRight size={17} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredVideos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="empty-search">
                            No content matches "{searchQuery}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="dashboard-card placeholder-page">
              <div className="placeholder-icon">
                {(() => {
                  const ActiveIcon =
                    navigation.find((item) => item.label === activePage)?.icon ??
                    LayoutDashboard;
                  return <ActiveIcon size={28} />;
                })()}
              </div>
              <h2>{activePage}</h2>
              <p>
                Your {activePage.toLowerCase()} workspace is ready for the next
                development step.
              </p>
              <button className="return-overview" onClick={() => setActivePage('Overview')}>
                Back to overview <ArrowRight size={16} />
              </button>
            </section>
          )}

          <footer className="dashboard-footer">
            <span>© 2026 CreatorIQ</span>
            <span>Creator intelligence, made clearer.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default CreatorDashboard;