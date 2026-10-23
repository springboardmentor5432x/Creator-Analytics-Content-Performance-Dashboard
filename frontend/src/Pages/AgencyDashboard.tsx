import { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Command,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';

import './AgencyDashboard.css';

const creators = [
  {
    name: 'Maya Johnson',
    handle: '@mayajcreates',
    category: 'Lifestyle',
    followers: '248K',
    engagement: '6.8%',
    initials: 'MJ',
    color: 'peach',
    status: 'Available',
  },
  {
    name: 'Noah Williams',
    handle: '@noahvisuals',
    category: 'Technology',
    followers: '186K',
    engagement: '5.4%',
    initials: 'NW',
    color: 'blue',
    status: 'In campaign',
  },
  {
    name: 'Ava Martinez',
    handle: '@avamakes',
    category: 'Beauty',
    followers: '312K',
    engagement: '8.2%',
    initials: 'AM',
    color: 'lavender',
    status: 'Available',
  },
];

const campaigns = [
  {
    name: 'Summer Glow Collection',
    client: 'Lumina Beauty',
    progress: 78,
    budget: 18000,
    spent: 14040,
    creators: 8,
    deadline: 'Oct 29',
    color: 'violet',
  },
  {
    name: 'Everyday Tech, Elevated',
    client: 'NovaTech',
    progress: 52,
    budget: 24000,
    spent: 12480,
    creators: 12,
    deadline: 'Nov 04',
    color: 'mint',
  },
  {
    name: 'Made for Your Moments',
    client: 'Sunday Studio',
    progress: 91,
    budget: 12000,
    spent: 10920,
    creators: 5,
    deadline: 'Oct 26',
    color: 'orange',
  },
];

const activities = [
  {
    title: 'Campaign deliverable approved',
    detail: 'Summer Glow Collection · Maya Johnson',
    time: '12 minutes ago',
    type: 'success',
  },
  {
    title: 'New creator added',
    detail: 'Noah Williams joined your portfolio',
    time: '48 minutes ago',
    type: 'creator',
  },
  {
    title: 'Budget milestone reached',
    detail: 'NovaTech campaign reached 52%',
    time: '2 hours ago',
    type: 'budget',
  },
];

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Campaigns', icon: Target, badge: '8' },
  { label: 'Creators', icon: Users },
  { label: 'Clients', icon: BriefcaseBusiness },
  { label: 'Analytics', icon: Activity },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AgencyDashboard() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [notice, setNotice] = useState('');

  const filteredCreators = creators.filter((creator) =>
    `${creator.name} ${creator.handle} ${creator.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function handleCreateCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!campaignName.trim()) return;

    setNotice(
      `"${campaignName.trim()}" has been added to your draft list.`,
    );

    setCampaignName('');
    setShowCampaignForm(false);
  }

  return (
    <div className="agency-app">
      {sidebarOpen && (
        <button
          className="agency-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`agency-sidebar ${
          sidebarOpen ? 'agency-sidebar-open' : ''
        }`}
      >
        <a
          className="agency-brand"
          href="#agency-home"
          onClick={(event) => event.preventDefault()}
        >
          <span className="agency-brand-icon">
            <Command size={21} strokeWidth={2.4} />
          </span>

          <span>
            <strong>creatoriq</strong>
            <small>AGENCY STUDIO</small>
          </span>
        </a>

        <div className="agency-workspace">
          <div className="agency-workspace-avatar">S</div>

          <div className="agency-workspace-copy">
            <strong>Studio Collective</strong>
            <span>Agency workspace</span>
          </div>

          <ChevronDown size={15} />
        </div>

        <p className="agency-nav-label">WORKSPACE</p>

        <nav className="agency-nav">
          {navigation.map(({ label, icon: Icon, badge }) => (
            <button
              key={label}
              className={`agency-nav-item ${
                activeNav === label ? 'agency-nav-active' : ''
              }`}
              onClick={() => {
                setActiveNav(label);
                setSidebarOpen(false);

                setNotice(
                  label === 'Overview'
                    ? ''
                    : `${label} section selected. Detailed views can be added next.`,
                );
              }}
            >
              <Icon size={18} />
              <span>{label}</span>

              {badge && (
                <span className="agency-nav-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="agency-sidebar-spacer" />

        <div className="agency-plan-card">
          <div className="agency-plan-icon">
            <Sparkles size={17} />
          </div>

          <strong>Agency Pro</strong>

          <p>
            Your team is growing. Keep your campaigns moving.
          </p>

          <div className="agency-plan-progress">
            <span />
          </div>

          <small>68% of monthly capacity used</small>
        </div>

        <button
          className={`agency-nav-item ${
            activeNav === 'Settings' ? 'agency-nav-active' : ''
          }`}
          onClick={() => {
            setActiveNav('Settings');
            setNotice(
              'Agency settings selected. Settings controls can be added next.',
            );
          }}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="agency-profile">
          <div className="agency-profile-avatar">SC</div>

          <div className="agency-profile-copy">
            <strong>Studio Collective</strong>
            <span>Agency administrator</span>
          </div>

          <MoreHorizontal size={19} />
        </div>
      </aside>

      <main className="agency-main">
        <header className="agency-topbar">
          <div className="agency-topbar-left">
            <button
              className="agency-icon-button agency-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="agency-breadcrumb">
              <span>Workspace</span>
              <span className="agency-breadcrumb-divider">/</span>
              <strong>{activeNav}</strong>
            </div>
          </div>

          <div className="agency-topbar-actions">
            <label className="agency-search">
              <Search size={17} />

              <input
                placeholder="Search creators..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <kbd>⌘ K</kbd>
            </label>

            <button
              className="agency-icon-button agency-notification-button"
              aria-label="Notifications"
              onClick={() =>
                setNotice(
                  'You are all caught up on agency notifications.',
                )
              }
            >
              <Bell size={19} />
              <span />
            </button>

            <div className="agency-topbar-avatar">SC</div>
          </div>
        </header>

        <div className="agency-content">
          <section className="agency-welcome">
            <div>
              <div className="agency-eyebrow">
                <span className="agency-live-dot" />
                YOUR AGENCY AT A GLANCE
              </div>

              <h1>
                Make great things <span>happen.</span>
              </h1>

              <p>
                Your creators, campaigns, and client relationships—all
                in one place.
              </p>
            </div>

            <button
              className="agency-primary-button"
              onClick={() => {
                setNotice('');
                setShowCampaignForm(true);
              }}
            >
              <Plus size={18} />
              New campaign
            </button>
          </section>

          {notice && (
            <div className="agency-notice" role="status">
              <CheckCircle2 size={17} />

              <span>{notice}</span>

              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {showCampaignForm && (
            <div
              className="agency-modal-backdrop"
              onClick={() => setShowCampaignForm(false)}
            >
              <form
                className="agency-campaign-modal"
                onSubmit={handleCreateCampaign}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="agency-modal-close"
                  aria-label="Close"
                  onClick={() => setShowCampaignForm(false)}
                >
                  <X size={19} />
                </button>

                <div className="agency-modal-icon">
                  <Target size={22} />
                </div>

                <h2>Create a campaign</h2>

                <p>
                  Add a draft campaign to your workspace. You can connect
                  it to real data later.
                </p>

                <label htmlFor="agency-campaign-name">
                  Campaign name
                </label>

                <input
                  id="agency-campaign-name"
                  value={campaignName}
                  onChange={(event) =>
                    setCampaignName(event.target.value)
                  }
                  placeholder="e.g. Winter Creator Launch"
                  autoFocus
                  required
                />

                <button
                  className="agency-primary-button agency-modal-submit"
                  type="submit"
                >
                  Create draft <ArrowRight size={17} />
                </button>
              </form>
            </div>
          )}

          <section className="agency-stats-grid">
            <article className="agency-stat-card agency-stat-featured">
              <div className="agency-stat-top">
                <span>Active campaigns</span>

                <span className="agency-stat-icon agency-icon-violet">
                  <Target size={19} />
                </span>
              </div>

              <div className="agency-stat-value">08</div>

              <div className="agency-stat-foot">
                <span className="agency-trend-positive">
                  <ArrowUpRight size={15} /> 12.5%
                </span>
                <span>vs. last month</span>
              </div>

              <div
                className="agency-mini-bars"
                aria-hidden="true"
              >
                {[30, 48, 38, 62, 48, 76, 57, 88, 70, 100, 79, 91].map(
                  (height, index) => (
                    <span
                      key={index}
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
            </article>

            <article className="agency-stat-card">
              <div className="agency-stat-top">
                <span>Managed creators</span>

                <span className="agency-stat-icon agency-icon-blue">
                  <Users size={19} />
                </span>
              </div>

              <div className="agency-stat-value">24</div>

              <div className="agency-stat-foot">
                <span className="agency-trend-positive">
                  <ArrowUpRight size={15} /> 3 new
                </span>
                <span>this month</span>
              </div>
            </article>

            <article className="agency-stat-card">
              <div className="agency-stat-top">
                <span>Total campaign spend</span>

                <span className="agency-stat-icon agency-icon-mint">
                  <CircleDollarSign size={19} />
                </span>
              </div>

              <div className="agency-stat-value">$37.4k</div>

              <div className="agency-stat-foot">
                <span className="agency-trend-negative">
                  <ArrowDownRight size={15} /> 4.2%
                </span>
                <span>vs. last month</span>
              </div>
            </article>

            <article className="agency-stat-card">
              <div className="agency-stat-top">
                <span>Avg. engagement</span>

                <span className="agency-stat-icon agency-icon-orange">
                  <Activity size={19} />
                </span>
              </div>

              <div className="agency-stat-value">6.8%</div>

              <div className="agency-stat-foot">
                <span className="agency-trend-positive">
                  <ArrowUpRight size={15} /> 0.9%
                </span>
                <span>vs. last month</span>
              </div>
            </article>
          </section>

          <section className="agency-section">
            <div className="agency-section-heading">
              <div>
                <div className="agency-section-kicker">
                  KEEP THINGS MOVING
                </div>

                <h2>
                  Campaigns in progress{' '}
                  <span className="agency-count-pill">03</span>
                </h2>
              </div>

              <button
                className="agency-text-button"
                onClick={() => {
                  setActiveNav('Campaigns');
                  setNotice(
                    'Showing the campaigns overview. Campaign management is currently using demo data.',
                  );
                }}
              >
                View all campaigns <ArrowRight size={16} />
              </button>
            </div>

            <div className="agency-campaign-list">
              {campaigns.map((campaign) => (
                <article
                  className="agency-campaign-card"
                  key={campaign.name}
                >
                  <div
                    className={`agency-campaign-mark agency-mark-${campaign.color}`}
                  >
                    <Target size={20} />
                  </div>

                  <div className="agency-campaign-body">
                    <div className="agency-campaign-title-row">
                      <div>
                        <span className="agency-client-name">
                          {campaign.client}
                        </span>

                        <h3>{campaign.name}</h3>
                      </div>

                      <button
                        className="agency-icon-button agency-campaign-menu"
                        aria-label={`More options for ${campaign.name}`}
                        onClick={() =>
                          setNotice(
                            `${campaign.name}: demo campaign details selected.`,
                          )
                        }
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </div>

                    <div className="agency-campaign-meta">
                      <span>
                        <Users size={14} /> {campaign.creators} creators
                      </span>

                      <span>
                        <CalendarDays size={14} /> Due {campaign.deadline}
                      </span>
                    </div>

                    <div className="agency-progress-heading">
                      <span>Campaign progress</span>
                      <strong>{campaign.progress}%</strong>
                    </div>

                    <div className="agency-progress-track">
                      <span
                        className={`agency-progress-fill agency-fill-${campaign.color}`}
                        style={{ width: `${campaign.progress}%` }}
                      />
                    </div>

                    <div className="agency-budget-row">
                      <span>Budget used</span>

                      <strong>
                        {formatCurrency(campaign.spent)}{' '}
                        <span>/ {formatCurrency(campaign.budget)}</span>
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="agency-lower-grid">
            <section className="agency-panel agency-creators-panel">
              <div className="agency-panel-heading">
                <div>
                  <div className="agency-section-kicker">
                    YOUR NETWORK
                  </div>
                  <h2>Creator portfolio</h2>
                </div>

                <button
                  className="agency-icon-button"
                  aria-label="Filter creators"
                  onClick={() =>
                    setNotice(
                      'Use the search field above to filter creators by name or category.',
                    )
                  }
                >
                  <Filter size={17} />
                </button>
              </div>

              <div className="agency-creator-list">
                {filteredCreators.map((creator) => (
                  <article
                    className="agency-creator-row"
                    key={creator.handle}
                  >
                    <div
                      className={`agency-creator-avatar agency-avatar-${creator.color}`}
                    >
                      {creator.initials}
                      <span />
                    </div>

                    <div className="agency-creator-info">
                      <strong>{creator.name}</strong>
                      <span>{creator.handle}</span>

                      <div className="agency-creator-tags">
                        <span>{creator.category}</span>
                        <span>{creator.status}</span>
                      </div>
                    </div>

                    <div className="agency-creator-stats">
                      <strong>{creator.followers}</strong>
                      <span>followers</span>
                      <small>{creator.engagement} engagement</small>
                    </div>
                  </article>
                ))}

                {filteredCreators.length === 0 && (
                  <div className="agency-empty-state">
                    No creators match "{search}". Try another search.
                  </div>
                )}
              </div>

              <button
                className="agency-outline-button agency-full-button"
                onClick={() => {
                  setActiveNav('Creators');
                  setNotice(
                    'Creator portfolio selected. All displayed creator data is for demonstration.',
                  );
                }}
              >
                Explore creator network <ArrowRight size={16} />
              </button>
            </section>

            <section className="agency-panel agency-activity-panel">
              <div className="agency-panel-heading">
                <div>
                  <div className="agency-section-kicker">
                    THE LATEST
                  </div>
                  <h2>Recent activity</h2>
                </div>

                <button
                  className="agency-icon-button"
                  aria-label="View activity"
                  onClick={() =>
                    setNotice(
                      'You are viewing the latest demo activity for your agency.',
                    )
                  }
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>

              <div className="agency-activity-list">
                {activities.map((item, index) => (
                  <article
                    className="agency-activity-item"
                    key={item.title}
                  >
                    <div
                      className={`agency-activity-icon agency-activity-${item.type}`}
                    >
                      {item.type === 'success' && (
                        <CheckCircle2 size={17} />
                      )}

                      {item.type === 'creator' && <Users size={17} />}

                      {item.type === 'budget' && (
                        <CircleDollarSign size={17} />
                      )}
                    </div>

                    <div className="agency-activity-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>

                      <small>
                        <Clock3 size={12} /> {item.time}
                      </small>
                    </div>

                    {index === 0 && (
                      <span className="agency-activity-new" />
                    )}
                  </article>
                ))}
              </div>

              <div className="agency-activity-footer">
                <span className="agency-live-dot" />
                Activity updates are enabled
              </div>
            </section>
          </div>

          <footer className="agency-footer">
            <span>© 2026 CreatorIQ Studio</span>

            <span>
              Built for better creator partnerships <Sparkles size={13} />
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}