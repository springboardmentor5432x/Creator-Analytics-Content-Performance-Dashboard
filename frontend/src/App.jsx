

import { useEffect, useState } from 'react'

import {

  ResponsiveContainer,

  LineChart,

  Line,

  XAxis,

  YAxis,

  CartesianGrid,

  Tooltip,

  PieChart,

  Pie,

  Cell,

} from 'recharts'

import './App.css'



const API_URL = 'http://127.0.0.1:8000'




function getDashboardStats(data) {
  const stats = data?.stats ?? {}

  const demoStats = [
    {
      label: 'Total Followers',
      value: '125,400',
      icon: '👥',
    },
    {
      label: 'Total Views',
      value: '1,200,000',
      icon: '▶️',
    },
    {
      label: 'Engagement Rate',
      value: '7.8%',
      icon: '❤️',
    },
    {
      label: 'Recorded Revenue',
      value: '₹12,450',
      icon: '₹',
    },
  ]

  return demoStats.map((demo, index) => {
    const actualValues = [
      stats.total_followers,
      stats.total_views,
      stats.engagement_rate,
      stats.recorded_revenue,
    ]

    const actual = actualValues[index]

    return {
      ...demo,
      value:
  actual !== null &&
  actual !== undefined &&
  Number(actual) > 0
    ? index === 2
      ? `${Number(actual).toFixed(1)}%`
      : index === 3
        ? `₹${Number(actual).toLocaleString('en-IN')}`
        : Number(actual).toLocaleString('en-IN')
    : demo.value,
    }
  })
}

 const platformLogos = {
    Instagram: 'https://cdn.simpleicons.org/instagram/E4405F',
    YouTube: 'https://cdn.simpleicons.org/youtube/FF0000',
    Facebook: 'https://cdn.simpleicons.org/facebook/1877F2',
    TikTok: 'https://cdn.simpleicons.org/tiktok/FFFFFF',
    LinkedIn: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    X: 'https://cdn.simpleicons.org/x/FFFFFF',
    Twitch: 'https://cdn.simpleicons.org/twitch/9146FF',
    Pinterest: 'https://cdn.simpleicons.org/pinterest/BD081C',
    Snapchat: 'https://cdn.simpleicons.org/snapchat/FFFC00',
    Reddit: 'https://cdn.simpleicons.org/reddit/FF4500',
  }

function App() {

  const [page, setPage] = useState('login')

  const [loading, setLoading] = useState(false)

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('error')

  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [currentUser, setCurrentUser] = useState(null)

  const [dashboardData, setDashboardData] = useState(null)

  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [dashboardError, setDashboardError] = useState('')

  const [activeSection, setActiveSection] = useState('Overview')

  const [dashboardSearch, setDashboardSearch] = useState('')

  const [dateRange, setDateRange] = useState('Last 30 days')
  const [showPlatformPicker, setShowPlatformPicker] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')



  const [loginData, setLoginData] = useState({

    email: '',

    password: '',

  })



  const [signupData, setSignupData] = useState({

    name: '',

    email: '',

    password: '',

    role: 'creator',

  })



  function changePage(nextPage) {

    setPage(nextPage)

    setMessage('')

    setShowLoginPassword(false)

    setShowSignupPassword(false)

  }



  function updateLogin(event) {

    setLoginData({

      ...loginData,

      [event.target.name]: event.target.value,

    })

  }



  function updateSignup(event) {

    setSignupData({

      ...signupData,

      [event.target.name]: event.target.value,

    })

  }



  async function handleSignup(event) {

    event.preventDefault()

    setLoading(true)

    setMessage('')



    try {

      const response = await fetch(`${API_URL}/api/auth/register`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(signupData),

      })



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          typeof data.detail === 'string'

            ? data.detail

            : 'Registration failed.'

        )

      }



      setMessageType('success')

      setMessage('Account created successfully! You can now sign in.')

      setSignupData({

        name: '',

        email: '',

        password: '',

        role: 'creator',

      })

      setShowSignupPassword(false)

    } catch (error) {

      setMessageType('error')

      setMessage(

        error.message === 'Failed to fetch'

          ? 'Cannot connect to CreatorIQ API. Check that the backend is running.'

          : error.message

      )

    } finally {

      setLoading(false)

    }

  }



  async function handleLogin(event) {

    event.preventDefault()

    setLoading(true)

    setMessage('')



    try {

      const response = await fetch(`${API_URL}/api/auth/login`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(loginData),

      })



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          typeof data.detail === 'string'

            ? data.detail

            : 'Login failed.'

        )

      }



      setCurrentUser({

        ...data.user,

        accessToken: data.access_token,

      })

      setLoginData({ email: '', password: '' })

      setMessage('')

      setPage('dashboard')

    } catch (error) {

      setMessageType('error')

      setMessage(

        error.message === 'Failed to fetch'

          ? 'Cannot connect to CreatorIQ API. Check that the backend is running.'

          : error.message

      )

    } finally {

      setLoading(false)

    }

  }



  function logout() {

    setCurrentUser(null)

    setMessage('')

    setPage('login')

  }





  // Fetch dashboard data for the authenticated user.

  useEffect(() => {

    if (page !== 'dashboard' || !currentUser?.accessToken) {

      return

    }



    let cancelled = false



    async function loadDashboard() {

      setDashboardLoading(true)

      setDashboardError('')



      try {

        const response = await fetch(`${API_URL}/api/dashboard`, {

          method: 'GET',

          headers: {

            Authorization: `Bearer ${currentUser.accessToken}`,

          },

        })



        const data = await response.json()



        if (!response.ok) {

          throw new Error(

            typeof data.detail === 'string'

              ? data.detail

              : 'Could not load dashboard data.'

          )

        }



        if (!cancelled) {

          setDashboardData(data)

        }

      } catch (error) {

        if (!cancelled) {

          setDashboardError(

            error.message === 'Failed to fetch'

              ? 'Cannot connect to the dashboard API. Check that the backend is running.'

              : error.message

          )

        }

      } finally {

        if (!cancelled) {

          setDashboardLoading(false)

        }

      }

    }



    loadDashboard()



    return () => {

      cancelled = true

    }

  }, [page, currentUser])





  // Role-specific workspaces for agency, marketing team and admin.
  if (page === 'dashboard' && currentUser && ['agency', 'marketing_team', 'admin'].includes(String(currentUser.role ?? '').toLowerCase())) {
    const role = String(currentUser.role).toLowerCase()
    const roleConfig = {
      agency: {
        title: 'Agency Dashboard', eyebrow: 'AGENCY WORKSPACE',
        subtitle: 'Manage creators, compare performance and coordinate campaigns.',
        nav: ['Overview', 'Creators', 'Campaigns', 'Analytics', 'Content Library', 'Reports', 'Team Members', 'Settings'],
        cards: [
          ['Total Creators', '12', 'Sample agency-managed creators'],
          ['Total Followers', '2.4M', 'Sample combined creator followers'],
          ['Total Views', '18.7M', 'Sample combined creator views'],
          ['Active Campaigns', '5', 'Sample active campaigns'],
          ['Total Revenue', '₹3,48,600', 'Sample agency revenue'],
        ],
      },
      marketing_team: {
        title: 'Marketing Team Dashboard', eyebrow: 'MARKETING WORKSPACE',
        subtitle: 'Plan content, monitor campaign results and review audience engagement.',
        nav: ['Overview', 'Campaigns', 'Content Calendar', 'Content Performance', 'Audience Insights', 'Reports', 'Team Tasks', 'Settings'],
        cards: [
          ['Active Campaigns', '12', 'Sample active campaigns'],
          ['Content Published', '86', 'Sample published posts'],
          ['Total Views', '845,600', 'Sample campaign views'],
          ['Engagement Rate', '7.8%', 'Sample audience engagement'],
          ['Recorded Revenue', '₹4,85,000', 'Sample campaign revenue'],
        ],
      },
      admin: {
        title: 'Admin Dashboard', eyebrow: 'ADMINISTRATION',
        subtitle: 'Review platform health, user access and workspace activity.',
        nav: ['Overview', 'User Management', 'Roles & Permissions', 'Platform Activity', 'Reports', 'Notifications', 'System Settings'],
        cards: [
          ['Registered Users', '248', 'Demo workspace users'],
          ['Creators', '156', 'Demo creator accounts'],
          ['Agencies', '32', 'Demo agency accounts'],
          ['Marketing Teams', '60', 'Demo marketing teams'],
          ['Total Revenue', '₹12,45,800', 'Sample revenue for presentation'],
          ['System Status', 'Operational', 'Demo system status'],
        ],
      },
    }
    const config = roleConfig[role]
    if (!config) return <div className="dashboard-page"><p>Unsupported account role: {role || 'missing role'}</p><button onClick={() => setPage('login')}>Back to Login</button></div>

    const roleNav = config.nav
    const selected = roleNav.includes(activeSection) ? activeSection : 'Overview'
    const demoSections = {
      agency: {
        Creators: { title: 'Creator Roster', description: 'Illustrative creator records for the agency workspace.', headers: ['Creator', 'Primary Platform', 'Followers', 'Engagement', 'Status'], rows: [['Aarav Sharma', 'YouTube', '48,200', '8.6%', 'Active'], ['Maya Reddy', 'Instagram', '32,800', '9.2%', 'Active'], ['Ishaan Kumar', 'TikTok', '28,400', '7.8%', 'Active'], ['Ananya Rao', 'Facebook', '16,000', '6.4%', 'Review']] },
        Campaigns: { title: 'Campaign Tracker', description: 'Sample campaign pipeline — not live client data.', headers: ['Campaign', 'Brand', 'Creators', 'Budget', 'Status'], rows: [['Festive Launch', 'StyleHouse', '12', '₹2,50,000', 'Active'], ['Tech Week', 'GadgetHub', '8', '₹1,80,000', 'Active'], ['Summer Stories', 'FreshLiving', '10', '₹1,25,000', 'Planning'], ['Creator Spotlight', 'GlowCare', '6', '₹95,000', 'Completed']] },
        Analytics: { title: 'Agency Performance', description: 'Sample cross-platform performance indicators.', headers: ['Platform', 'Followers', 'Views', 'Engagement'], rows: [['YouTube', '48,200', '485,000', '8.6%'], ['Instagram', '32,800', '328,000', '9.2%'], ['TikTok', '28,400', '284,000', '7.8%'], ['Facebook', '16,000', '103,000', '6.4%']] },
        'Content Library': { title: 'Content Library', description: 'Example content available for campaign planning.', headers: ['Content', 'Platform', 'Type', 'Views', 'Review'], rows: [['How-to video', 'YouTube', 'Video', '48,500', 'Approved'], ['Behind the scenes', 'Instagram', 'Reel', '32,800', 'Approved'], ['Trending challenge', 'TikTok', 'Video', '28,400', 'In review'], ['Product story', 'Facebook', 'Post', '16,200', 'Draft']] },
        Reports: { title: 'Agency Reports', description: 'Illustrative reports for presentation only.', headers: ['Report', 'Updated', 'Format', 'Status'], rows: [['Creator Performance Summary', '18 Oct 2026', 'PDF', 'Ready'], ['Campaign Results', '16 Oct 2026', 'CSV', 'Ready'], ['Revenue Summary', '12 Oct 2026', 'PDF', 'Ready']] },
        'Team Members': { title: 'Agency Team', description: 'Sample workspace members and responsibilities.', headers: ['Member', 'Responsibility', 'Assigned Campaigns', 'Status'], rows: [['Priya Nair', 'Campaign Manager', '3', 'Active'], ['Rahul Verma', 'Creator Relations', '5', 'Active'], ['Sara Khan', 'Analytics', '4', 'Active']] },
        Settings: { title: 'Workspace Settings', description: 'Demo settings preview. Changes are not saved to a backend.', headers: ['Setting', 'Current value', 'Status'], rows: [['Workspace name', 'CreatorIQ Agency', 'Configured'], ['Default reporting range', 'Last 30 days', 'Configured'], ['Email notifications', 'Enabled', 'Demo']] },
      },
      marketing_team: {
        Campaigns: { title: 'Campaign Tracker', description: 'Illustrative marketing campaign data.', headers: ['Campaign', 'Channel', 'Views', 'Engagement', 'Status'], rows: [['Festive Launch', 'Instagram', '185,400', '8.4%', 'Active'], ['Tech Week', 'YouTube', '240,600', '7.6%', 'Active'], ['Summer Stories', 'TikTok', '126,800', '9.1%', 'Planning'], ['Creator Spotlight', 'Facebook', '92,800', '6.2%', 'Completed']] },
        'Content Calendar': { title: 'Content Calendar', description: 'Sample publishing schedule — dates are illustrative.', headers: ['Date', 'Content', 'Platform', 'Owner', 'Status'], rows: [['20 Oct 2026', 'Product teaser', 'Instagram', 'Priya', 'Scheduled'], ['21 Oct 2026', 'Creator interview', 'YouTube', 'Rahul', 'In review'], ['22 Oct 2026', 'Behind the scenes', 'TikTok', 'Maya', 'Draft'], ['24 Oct 2026', 'Campaign recap', 'Facebook', 'Sara', 'Scheduled']] },
        'Content Performance': { title: 'Content Performance', description: 'Sample content metrics, not connected-platform analytics.', headers: ['Content', 'Platform', 'Views', 'Likes', 'Engagement'], rows: [['Product teaser', 'Instagram', '85,400', '7,200', '8.4%'], ['Creator interview', 'YouTube', '120,600', '9,100', '7.6%'], ['Behind the scenes', 'TikTok', '66,800', '6,400', '9.1%']] },
        'Audience Insights': { title: 'Audience Insights', description: 'Illustrative audience profile for campaign planning.', headers: ['Audience segment', 'Share', 'Suggested focus'], rows: [['Age 18–24', '35%', 'Short-form video'], ['Age 25–34', '40%', 'Product education'], ['Age 35–44', '18%', 'Trust and reviews'], ['India', '65%', 'Regional campaigns'], ['United States', '20%', 'Creator collaborations']] },
        Reports: { title: 'Marketing Reports', description: 'Demo reports; export actions are not connected.', headers: ['Report', 'Date', 'Format', 'Status'], rows: [['Campaign Performance', '18 Oct 2026', 'PDF', 'Ready'], ['Content Engagement', '15 Oct 2026', 'CSV', 'Ready'], ['Audience Insights', '12 Oct 2026', 'PDF', 'Ready']] },
        'Team Tasks': { title: 'Team Tasks', description: 'Sample task board for the marketing team.', headers: ['Task', 'Owner', 'Due date', 'Priority', 'Status'], rows: [['Approve product teaser', 'Priya', '20 Oct', 'High', 'In progress'], ['Review creator script', 'Rahul', '21 Oct', 'Medium', 'Pending'], ['Prepare weekly report', 'Sara', '22 Oct', 'Medium', 'In progress']] },
        Settings: { title: 'Marketing Settings', description: 'Demo preferences preview; not saved to a backend.', headers: ['Setting', 'Value', 'Status'], rows: [['Default date range', 'Last 30 days', 'Configured'], ['Campaign alerts', 'Enabled', 'Demo'], ['Weekly report', 'Monday', 'Demo']] },
      },
      admin: {
        'User Management': { title: 'User Management', description: 'Sample users for UI demonstration. This does not change real accounts.', headers: ['Name', 'Role', 'Email', 'Status'], rows: [['Aarav Sharma', 'Creator', 'aarav.demo@example.com', 'Active'], ['Priya Nair', 'Agency', 'priya.demo@example.com', 'Active'], ['Rahul Verma', 'Marketing Team', 'rahul.demo@example.com', 'Active'], ['Admin User', 'Admin', 'admin.demo@example.com', 'Active']] },
        'Roles & Permissions': { title: 'Roles & Permissions', description: 'Role capability overview; no permission changes are applied.', headers: ['Role', 'Dashboard access', 'Manage users', 'Manage campaigns'], rows: [['Creator', 'Creator workspace', 'No', 'No'], ['Agency', 'Agency workspace', 'No', 'Yes'], ['Marketing Team', 'Marketing workspace', 'No', 'Yes'], ['Admin', 'All workspaces', 'Yes', 'Yes']] },
        'Platform Activity': { title: 'Platform Activity', description: 'Illustrative audit activity — not live system logs.', headers: ['Activity', 'Actor', 'Time', 'Result'], rows: [['Creator account registered', 'Demo user', 'Today', 'Success'], ['Campaign report generated', 'Agency demo', 'Today', 'Success'], ['Role access reviewed', 'Admin demo', 'Yesterday', 'Success'], ['Analytics refresh completed', 'System demo', 'Yesterday', 'Success']] },
        Reports: { title: 'Admin Reports', description: 'Sample operational reports.', headers: ['Report', 'Date', 'Format', 'Status'], rows: [['User Activity Summary', '18 Oct 2026', 'CSV', 'Ready'], ['Platform Health Summary', '17 Oct 2026', 'PDF', 'Ready'], ['Workspace Overview', '15 Oct 2026', 'PDF', 'Ready']] },
        Notifications: { title: 'Admin Notifications', description: 'Illustrative system notices.', headers: ['Notification', 'Time', 'Priority', 'Status'], rows: [['Scheduled maintenance review', 'Today', 'Medium', 'Open'], ['New demo account registered', 'Today', 'Low', 'Reviewed'], ['Weekly report generated', 'Yesterday', 'Low', 'Complete']] },
        'System Settings': { title: 'System Settings', description: 'Read-only demo settings. These values are not applied to the server.', headers: ['Setting', 'Value', 'Status'], rows: [['API service', 'FastAPI', 'Configured'], ['Database', 'PostgreSQL', 'Configured'], ['Authentication', 'JWT', 'Configured'], ['Social OAuth', 'Not configured', 'Pending']] },
      },
    }
    const overviewRows = role === 'agency'
      ? [['YouTube', '48,200', '485,000', '8.6%'], ['Instagram', '32,800', '328,000', '9.2%'], ['TikTok', '28,400', '284,000', '7.8%'], ['Facebook', '16,000', '103,000', '6.4%']]
      : role === 'marketing_team'
        ? [['Festive Launch', 'Instagram', '185,400', '8.4%'], ['Tech Week', 'YouTube', '240,600', '7.6%'], ['Summer Stories', 'TikTok', '126,800', '9.1%']]
        : [['Creator accounts', '156', 'Active', 'Demo'], ['Agency accounts', '32', 'Active', 'Demo'], ['Marketing teams', '60', 'Active', 'Demo']]
    const roleSearch = dashboardSearch.trim().toLowerCase()
    const sectionData = demoSections[role][selected]
    const visibleRows = sectionData?.rows.filter((row) => !roleSearch || row.some((cell) => String(cell).toLowerCase().includes(roleSearch))) ?? []
    const renderPlatformCell = (cell) => {
      if (typeof cell !== 'string') return cell
      const names = cell.split(/\s*[·,/]\s*/).map((name) => name.trim())
      const isPlatformList = names.length > 1 || names.some((name) => Boolean(platformLogos[name]))
      if (!isPlatformList) return cell
      return <span className="social-platform-chips">{names.map((name) => platformLogos[name] ? <span className="social-platform-chip" key={name} title={name}><img src={platformLogos[name]} alt=""/><span>{name}</span></span> : <span key={name}>{name}</span>)}</span>
    }
    const roleTable = (headers, rows) => <div className="posts-table-wrap"><table className="posts-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cellIndex === 1 || platformLogos[cell] || (typeof cell === 'string' && /Instagram|YouTube|TikTok|Facebook|LinkedIn|Twitch|Pinterest|Snapchat|Reddit/.test(cell)) ? renderPlatformCell(cell) : cell}</td>)}</tr>)}</tbody></table></div>

    return (
      <div className="dashboard-page role-dashboard">
        <aside className="dashboard-sidebar role-sidebar">
          <div className="brand-logo"><div className="logo-mark">CI</div><span>CreatorIQ</span></div>
          <p className="sidebar-caption">{config.eyebrow}</p>
          <nav aria-label={`${config.title} navigation`}>
            {roleNav.map((item, index) => <button key={item} type="button" className={`sidebar-link ${selected === item ? 'active' : ''}`} onClick={() => setActiveSection(item)}><span aria-hidden="true">{['▦','♙','▣','⌁','▤','▧','♧','⚙'][index % 8]}</span>{item}</button>)}
          </nav>
          <div className="sidebar-bottom"><p>{currentUser.name}</p><span>{role === 'marketing_team' ? 'Marketing Team' : role.charAt(0).toUpperCase() + role.slice(1)}</span><button className="logout-button" type="button" onClick={logout}>Sign out ↗</button></div>
        </aside>
        <main className="dashboard-main role-main">
          <div className="dashboard-toolbar">
            <label className="dashboard-search"><span aria-hidden="true">⌕</span><input type="search" value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder={`Search ${role === 'agency' ? 'creators and campaigns' : role === 'marketing_team' ? 'campaigns and content' : 'workspace'}...`} aria-label="Search workspace" /></label>
            <div className="toolbar-actions"><label className="date-filter"><span>TIME RANGE</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Select date range"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select></label><div className="profile-avatar" title={currentUser.name}>{(currentUser.name || role[0]).charAt(0).toUpperCase()}</div></div>
          </div>
          <header className="dashboard-header"><div><p className="welcome-label">{config.eyebrow}</p><h1>{selected === 'Overview' ? config.title : selected}</h1><p>{selected === 'Overview' ? config.subtitle : `Review ${selected.toLowerCase()} for your CreatorIQ workspace.`}</p></div></header>
          <div className="demo-notice">Presentation workspace: the figures and records on this dashboard are illustrative demo data, not live analytics.</div>
          {dashboardLoading && <div className="demo-notice" role="status">Loading workspace data...</div>}
          {dashboardError && <div className="demo-notice dashboard-error" role="alert">API note: {dashboardError} Demo content remains available below.</div>}
          {selected === 'Overview' ? <>
            <section className="stats-grid role-stats" aria-label={`${config.title} summary`}>
              {config.cards.map(([label, value, note], index) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon">{['♙', '◎', '▶', '▣', '₹', '✓'][index]}</span></div><h2>{value}</h2><p>{note}</p></article>)}
            </section>
            {role === 'agency' && <>
              <section className="dashboard-content-grid role-panels">
                <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>Overall Performance</h2><p>Followers, views and engagement · {dateRange} · sample data</p></div></div>
                  <ResponsiveContainer width="100%" height={260}><LineChart data={[{month:'Aug 17',followers:0.9,views:0.6,engagement:0.2},{month:'Aug 24',followers:2.1,views:1.1,engagement:0.45},{month:'Aug 31',followers:3.2,views:1.9,engagement:0.75},{month:'Sep 7',followers:3.9,views:2.5,engagement:1.15},{month:'Sep 14',followers:4.8,views:3.2,engagement:1.65},{month:'Sep 21',followers:5.4,views:3.8,engagement:2.0}]}><CartesianGrid strokeDasharray="3 5" stroke="#244638" vertical={false}/><XAxis dataKey="month" tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{ backgroundColor: '#0b2119', border: '1px solid #28543d', borderRadius: 10, color: '#ecfdf5', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} labelStyle={{ color: '#a7f3d0', fontWeight: 700 }} itemStyle={{ color: '#ecfdf5', fontSize: 12 }} cursor={{ stroke: '#47735d', strokeDasharray: '4 4' }}/><Line type="monotone" dataKey="followers" name="Followers (M)" stroke="#ef4444" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/><Line type="monotone" dataKey="views" name="Views (M)" stroke="#d946ef" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/><Line type="monotone" dataKey="engagement" name="Engagement index" stroke="#60a5fa" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/></LineChart></ResponsiveContainer>
                </article>
                <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>Platform Distribution</h2><p>Share of total followers · sample data</p></div></div>
                  <ResponsiveContainer width="100%" height={240}><PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}><Pie data={[{name:'Instagram',value:42},{name:'YouTube',value:28},{name:'TikTok',value:18},{name:'LinkedIn',value:8},{name:'Others',value:4}]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} stroke="#082218" strokeWidth={3}>{['#6d4aff','#ef4444','#111827','#3b82f6','#93c5fd'].map((color,i)=><Cell key={`agency-pie-${i}`} fill={color}/>)}</Pie><Tooltip formatter={(v)=>`${v}%`}/></PieChart></ResponsiveContainer>
                  <div className="role-chart-legend">{[['Instagram','42%','#6d4aff'],['YouTube','28%','#ef4444'],['TikTok','18%','#111827'],['LinkedIn','8%','#3b82f6'],['Others','4%','#93c5fd']].map(([name,value,color])=><div key={name}><i style={{background:color}}/><span>{name}</span><strong>{value}</strong></div>)}</div>
                </article>
              </section>
              <section className="dashboard-card"><div className="section-heading"><div><h2>Creators Overview</h2><p>Illustrative creator metrics for presentation</p></div><span className="period-pill">Demo data</span></div>{roleTable(['Creator','Platforms','Followers','Views','Engagement','Revenue','Status'],[['Tech With Riya','YouTube · Instagram','450K','5.2M','7.8%','₹85,000','Active'],['Foodie Diaries','Instagram · TikTok','320K','3.1M','6.4%','₹62,000','Active'],['Travel With Arjun','YouTube · Instagram','280K','4.3M','8.1%','₹70,000','Active'],['Fitness Hub','Instagram · TikTok','210K','2.4M','5.9%','₹45,000','Inactive'],['Study Capsule','YouTube · Instagram','190K','2.1M','6.7%','₹38,000','Active']])}</section>
            </>}
            {role === 'marketing_team' && <section className="dashboard-content-grid role-panels">
              <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>Campaign Performance</h2><p>Reach, views and engagement · {dateRange} · sample data</p></div></div>
                <ResponsiveContainer width="100%" height={260}><LineChart data={[{week:'Week 1',reach:125,views:85,engagement:5.4},{week:'Week 2',reach:190,views:130,engagement:6.1},{week:'Week 3',reach:260,views:185,engagement:6.8},{week:'Week 4',reach:320,views:240,engagement:7.2},{week:'Week 5',reach:410,views:305,engagement:7.8}]}><CartesianGrid strokeDasharray="3 5" stroke="#244638" vertical={false}/><XAxis dataKey="week" tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{ backgroundColor: '#0b2119', border: '1px solid #28543d', borderRadius: 10, color: '#ecfdf5', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} labelStyle={{ color: '#a7f3d0', fontWeight: 700 }} itemStyle={{ color: '#ecfdf5', fontSize: 12 }} cursor={{ stroke: '#47735d', strokeDasharray: '4 4' }}/><Line type="monotone" dataKey="reach" name="Reach (K)" stroke="#10b981" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/><Line type="monotone" dataKey="views" name="Views (K)" stroke="#8b5cf6" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/><Line type="monotone" dataKey="engagement" name="Engagement rate (%)" stroke="#f59e0b" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/></LineChart></ResponsiveContainer>
              </article>
              <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>Content Distribution</h2><p>Published content by platform · sample data</p></div></div><ResponsiveContainer width="100%" height={230}><PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}><Pie data={[{name:'Instagram',value:35},{name:'YouTube',value:28},{name:'TikTok',value:20},{name:'Facebook',value:17}]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} stroke="#082218" strokeWidth={3}>{['#e4405f','#ef4444','#111827','#1877f2'].map((color,i)=><Cell key={`marketing-pie-${i}`} fill={color}/>)}</Pie><Tooltip formatter={(v)=>`${v}%`}/></PieChart></ResponsiveContainer><div className="role-chart-legend">{[['Instagram','35%','#e4405f'],['YouTube','28%','#ef4444'],['TikTok','20%','#111827'],['Facebook','17%','#1877f2']].map(([name,value,color])=><div key={name}><i style={{background:color}}/><span>{name}</span><strong>{value}</strong></div>)}</div></article>
            </section>}
            {role === 'admin' && <section className="dashboard-content-grid role-panels">
              <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>User Growth</h2><p>Registered users over time · {dateRange} · sample data</p></div></div><ResponsiveContainer width="100%" height={260}><LineChart data={[{month:'May',users:110},{month:'Jun',users:135},{month:'Jul',users:158},{month:'Aug',users:184},{month:'Sep',users:218},{month:'Oct',users:248}]}><CartesianGrid strokeDasharray="3 5" stroke="#244638" vertical={false}/><XAxis dataKey="month" tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:11,fill:'#9cc8b5'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{ backgroundColor: '#0b2119', border: '1px solid #28543d', borderRadius: 10, color: '#ecfdf5', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} labelStyle={{ color: '#a7f3d0', fontWeight: 700 }} itemStyle={{ color: '#ecfdf5', fontSize: 12 }} cursor={{ stroke: '#47735d', strokeDasharray: '4 4' }}/><Line type="monotone" dataKey="users" name="Registered users" stroke="#10b981" strokeWidth={2.8} dot={{ r: 3, strokeWidth: 1, fill: '#071e16' }} activeDot={{ r: 5, strokeWidth: 0 }}/></LineChart></ResponsiveContainer></article>
              <article className="dashboard-card role-chart-card role-chart-polished"><div className="section-heading"><div><h2>Role Distribution</h2><p>Demo account counts</p></div></div><ResponsiveContainer width="100%" height={230}><PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}><Pie data={[{name:'Creators',value:156},{name:'Agencies',value:32},{name:'Marketing Teams',value:60}]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} stroke="#082218" strokeWidth={3}>{['#10b981','#8b5cf6','#f59e0b'].map((color,i)=><Cell key={`admin-pie-${i}`} fill={color}/>)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0b2119', border: '1px solid #28543d', borderRadius: 10, color: '#ecfdf5', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} labelStyle={{ color: '#a7f3d0', fontWeight: 700 }} itemStyle={{ color: '#ecfdf5', fontSize: 12 }} cursor={{ stroke: '#47735d', strokeDasharray: '4 4' }}/></PieChart></ResponsiveContainer><div className="role-chart-legend">{[['Creators','156','#10b981'],['Agencies','32','#8b5cf6'],['Marketing Teams','60','#f59e0b']].map(([name,value,color])=><div key={name}><i style={{background:color}}/><span>{name}</span><strong>{value}</strong></div>)}</div></article>
            </section>}
            {role === 'marketing_team' && <section className="dashboard-card"><div className="section-heading"><div><h2>Campaign Overview</h2><p>Illustrative campaign rows</p></div></div>{roleTable(['Campaign','Platform','Views','Engagement'],overviewRows)}</section>}
            {role === 'admin' && <section className="dashboard-card"><div className="section-heading"><div><h2>Platform Activity</h2><p>Illustrative system activity summary</p></div></div>{roleTable(['Account type','Count','Status','Source'],overviewRows)}</section>}
          </> : sectionData ? <section className="dashboard-card"><div className="section-heading"><div><h2>{sectionData.title}</h2><p>{sectionData.description}</p></div><span className="period-pill">Demo data</span></div>{visibleRows.length ? roleTable(sectionData.headers, visibleRows) : <div className="role-empty"><span>⌕</span><h3>No matching records</h3><p>Try another search term.</p></div>}</section> : <section className="dashboard-card"><div className="section-heading"><div><h2>{selected}</h2><p>Illustrative demo workspace content</p></div></div><div className="demo-data-list"><p className="demo-label">This section is a presentation preview. Live actions require the relevant backend integration.</p><div className="demo-metric-row"><div className="demo-metric-heading"><strong>{selected} status</strong><span>Demo view available</span></div></div></div></section>}
        </main>
      </div>
    )
  }

  // Dashboard shown after successful login.

  if (page === 'dashboard' && currentUser) {
    const userRole = String(currentUser?.role ?? '').toLowerCase()

    const stats = dashboardData?.stats ?? {}

    const followerGrowthData =
    Array.isArray(dashboardData?.follower_growth) &&
    dashboardData.follower_growth.length > 0
    ? dashboardData.follower_growth
    : [
        { month: 'Jan', followers: 82000 },
        { month: 'Feb', followers: 91000 },
        { month: 'Mar', followers: 88000 },
        { month: 'Apr', followers: 105000 },
        { month: 'May', followers: 112000 },
        { month: 'Jun', followers: 125400 },
      ]
      const platformDistributionData =
      Array.isArray(dashboardData?.platform_distribution) &&
      dashboardData.platform_distribution.length > 0
      ? dashboardData.platform_distribution
      : [
          { platform: 'YouTube', followers: 48200 },
          { platform: 'Instagram', followers: 32800 },
          { platform: 'TikTok', followers: 28400 },
          { platform: 'Facebook', followers: 12000 },
          { platform: 'Others', followers: 4000 },
       ]

    const chartColors = ['#10b981', '#38bdf8', '#a78bfa', '#fb7185', '#fbbf24']

    const socialAccounts = Array.isArray(dashboardData?.social_accounts)

      ? dashboardData.social_accounts

      : []

    const demoTopContent = [
  {
    post_id: 'demo-1',
    title: 'Top YouTube Video',
    caption: 'How I create engaging content',
    thumbnail_url: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg',
    platform: 'YouTube',
    content_type: 'Video',
    views: 48500,
    likes: 4200,
    engagement_rate: 8.6,
  },
  {
    post_id: 'demo-2',
    title: 'Instagram Reels Highlights',
    caption: 'Behind the scenes',
    platform: 'Instagram',
    content_type: 'Reel',
    views: 32800,
    likes: 3100,
    engagement_rate: 9.2,
  },
  {
    post_id: 'demo-3',
    title: 'TikTok Trending Content',
    caption: 'My latest creative video',
    platform: 'TikTok',
    content_type: 'Video',
    views: 28400,
    likes: 2600,
    engagement_rate: 7.8,
  },
]

const topContent =
  Array.isArray(dashboardData?.top_content) &&
  dashboardData.top_content.length > 0
    ? dashboardData.top_content
    : demoTopContent

    const number = (value) => Number(value ?? 0).toLocaleString('en-IN')

    const money = (value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`

    const query = dashboardSearch.trim().toLowerCase()

    const searchableContent = topContent.filter((item) =>

      !query || [item.title, item.caption, item.platform, item.content_type]

        .some((value) => String(value ?? '').toLowerCase().includes(query))

    )

    const accountIsConnected = (platform) => socialAccounts.some((account) =>

      String(account.platform ?? '').toLowerCase().includes(platform.toLowerCase())

    )



    const navItems = [

      { label: 'Overview', icon: '▦' },

      { label: 'Content Analytics', icon: '▤' },

      { label: 'Audience', icon: '◎' },

      { label: 'Revenue', icon: '₹' },

      { label: 'Reports', icon: '▧' },

      { label: 'Social Accounts', icon: '⌘' },

      { label: 'Notifications', icon: '♧' },

    ]



    const statCards = [
  {
    label: 'Total Followers',
    value: Number(stats.total_followers) > 0
      ? number(stats.total_followers)
      : '125,400',
    icon: '♟',
    note: 'Demo: Across connected accounts',
  },
  {
    label: 'Total Views',
    value: Number(stats.total_views) > 0
      ? number(stats.total_views)
      : '1,200,000',
    icon: '▶',
    note: 'Demo: Recorded post views',
  },
  {
    label: 'Engagement Rate',
    value: Number(stats.engagement_rate) > 0
      ? `${Number(stats.engagement_rate).toFixed(1)}%`
      : '7.8%',
    icon: '♥',
    note: 'Demo: Audience engagement',
  },
  {
    label: 'Total Revenue',
    value: Number(stats.recorded_revenue) > 0
      ? money(stats.recorded_revenue)
      : '₹12,450',
    icon: '₹',
    note: 'Demo: Sample revenue',
  },
]



    const renderEmptyState = (title, description) => (

      <div className="empty-state">

        <span className="empty-state-icon">▤</span>

        <h3>{title}</h3>

        <p>{description}</p>

      </div>

    )



    return (

      <div className="dashboard-page">

        <aside className="dashboard-sidebar">

          <div className="brand-logo">

            <div className="logo-mark">CI</div>

            <span>CreatorIQ</span>

          </div>



          <p className="sidebar-caption">WORKSPACE</p>

          <nav aria-label="Dashboard navigation">

            {navItems.map((item) => (

              <button

                key={item.label}

                type="button"

                className={`sidebar-link ${activeSection === item.label ? 'active' : ''}`}

                onClick={() => setActiveSection(item.label)}

                aria-current={activeSection === item.label ? 'page' : undefined}

              >

                <span aria-hidden="true">{item.icon}</span>

                {item.label}

              </button>

            ))}

          </nav>



          <div className="sidebar-bottom">

            <p>{currentUser.name}</p>

            <span>{currentUser.role}</span>

            <button className="logout-button" onClick={logout} type="button">Sign out ↗</button>

          </div>

        </aside>



        <main className="dashboard-main">

          <div className="dashboard-toolbar">

            <label className="dashboard-search">

              <span aria-hidden="true">⌕</span>

              <input

                type="search"

                value={dashboardSearch}

                onChange={(event) => setDashboardSearch(event.target.value)}

                placeholder="Search content and platforms..."

                aria-label="Search dashboard content"

              />

              <span className="search-shortcut">Search</span>

            </label>

            <div className="toolbar-actions">

              <label className="date-filter">

                <span>TIME RANGE</span>

                <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Select date range">

                  <option>Last 7 days</option>

                  <option>Last 30 days</option>

                  <option>Last 90 days</option>

                  <option>This year</option>

                </select>

              </label>

              <div className="profile-avatar" title={currentUser.name}>

                {(currentUser.name || 'C').charAt(0).toUpperCase()}

              </div>

            </div>

          </div>



          <header className="dashboard-header">

            <div>

              <p className="welcome-label">CREATOR WORKSPACE</p>

              <h1>Welcome back, <span className="dashboard-name">{currentUser.name}</span>! <span aria-hidden="true">✦</span></h1>

              <p>{activeSection === 'Overview'

                ? 'Here is your content performance across connected platforms.'

                : `Explore your ${activeSection.toLowerCase()} workspace.`}</p>

            </div>

          </header>



          {dashboardLoading && <div className="demo-notice" role="status">Loading your dashboard data...</div>}

          {dashboardError && <div className="demo-notice dashboard-error" role="alert">{dashboardError}</div>}

          {!dashboardLoading && !dashboardError && dashboardData && (

            <div className="demo-notice">
  {dashboardData.creator_profile_exists &&
  socialAccounts.length === 0 ? (
    <div className="demo-social-accounts">
      <p>
        Demo mode: Sample social accounts shown for presentation.
      </p>

<div className="demo-social-account">
  <span className="revenue-platform-name">
    <img src={platformLogos.YouTube} alt="" className="platform-button-logo" />
    YouTube
  </span>
  <strong>Demo Creator</strong>
  <span className="connected-label">Demo Connected</span>
</div>

     <div className="demo-social-account">
  <span className="revenue-platform-name">
    <img src={platformLogos.Instagram} alt="" className="platform-button-logo" />
    Instagram
  </span>
  <strong>@demo_creator</strong>
  <span className="connected-label">Demo Connected</span>
</div>

     
<div className="demo-social-account">
  <span className="revenue-platform-name">
    <img src={platformLogos.Facebook} alt="" className="platform-button-logo" />
    Facebook
  </span>
  <strong>Demo Creator Page</strong>
  <span className="connected-label">Demo Connected</span>
</div>

    </div>
  ) : dashboardData.creator_profile_exists ? (
    socialAccounts.length === 0
      ? 'No social accounts connected yet.'
      : 'Dashboard data loaded from your CreatorIQ account.'
  ) : (
    'Your creator profile is not available yet. Your account can still use the workspace.'
  )}
</div>

          )}



          {activeSection === 'Overview' && (

            <>

              <section className="stats-grid" aria-label="Performance summary">

                {statCards.map((stat) => (

                  <article className="stat-card" key={stat.label}>

                    <div className="stat-top"><span>{stat.label}</span><span className="stat-icon" aria-hidden="true">{stat.icon}</span></div>

                    <h2>{stat.value}</h2>

                    <p>{stat.note}</p>

                  </article>

                ))}

              </section>



              <section className="dashboard-content-grid">

                <article className="dashboard-card">

                  <div className="section-heading">

                    <div><h2>Follower Growth</h2><p>Growth history from available analytics</p></div>

                    <span className="period-pill">{dateRange}</span>

                  </div>

                  {followerGrowthData.length > 0 ? (
                    <div className="analytics-chart">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={followerGrowthData}>
                          <CartesianGrid stroke="#174936" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fill: '#8fb9a7', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#8fb9a7', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#0b2118', border: '1px solid #236347', borderRadius: 10, color: '#ecfdf5' }} />
                          <Line type="monotone" dataKey="followers" name="Followers" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#34d399' }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="analytics-chart analytics-chart-empty">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={[]}>
                          <CartesianGrid stroke="#174936" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fill: '#8fb9a7', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#8fb9a7', fontSize: 11 }} />
                        </LineChart>
                      </ResponsiveContainer>
                      <p>No growth history yet — connect an account to load real data.</p>
                    </div>
                  )}

                </article>

                <article className="dashboard-card">

                  <div className="section-heading"><div><h2>Platform Distribution</h2><p>Connected social platforms</p></div></div>

                  {platformDistributionData.length > 0 ? (

                    <div className="platform-list">

                      {platformDistributionData.map((item, index) => (
                        <div className="platform-row" key={item.platform}>
                          
<span className={`platform-icon ${item.platform.toLowerCase()}`}>
  {platformLogos[item.platform] ? (
    <img
      src={platformLogos[item.platform]}
      alt=""
      className="platform-button-logo"
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  ) : (
    item.platform.slice(0, 2).toUpperCase()
  )}
</span>

                            
                            <div className="platform-info">
                              <strong className="revenue-platform-name">
  {platformLogos[item.platform] && (
    <img
      src={platformLogos[item.platform]}
      alt=""
      className="platform-button-logo"
    />
  )}
  {item.platform}
</strong>
                              <span>
                                {Number(item.followers).toLocaleString('en-IN')} followers
                                </span>
                                </div>
                                
                                <span className="connected-label">
                                  {(
                                    (Number(item.followers) /
                                    platformDistributionData.reduce(
                                      (total, platform) => total + Number(platform.followers || 0),
                                      0
                                    )) * 100
                                    ).toFixed(1)}%
                                    </span>
                                    </div>
                                  ))}
                    </div>

                  ) : renderEmptyState('No platforms connected', 'The distribution chart will use real connected-account analytics when available.')}

                </article>

              </section>



              <section className="dashboard-card posts-card">

                <div className="section-heading">

                  <div><h2>Top-performing content</h2><p>Post records from your dashboard API</p></div>

                  <button type="button" className="connect-account-button" onClick={() => setActiveSection('Content Analytics')}>View all →</button>

                </div>

                {searchableContent.length > 0 ? (

                  <div className="posts-table-wrap">

                    <table className="posts-table">

                      <thead><tr><th>Content</th><th>Platform</th><th>Views</th><th>Engagement</th></tr></thead>

                      <tbody>

                        {searchableContent.map((item, index) => (

                          <tr key={item.post_id ?? item.id ?? index}>

                            <td>
  <div className="content-title-cell">
    <img
      className="content-thumbnail"
      src={
        item.thumbnail_url ||
        item.thumbnail ||
        (item.platform === 'YouTube'
          ? 'https://placehold.co/96x60/063b2e/00d6a0?text=YouTube'
          : item.platform === 'Instagram'
            ? 'https://placehold.co/96x60/3b1738/ffffff?text=Instagram'
            : 'https://placehold.co/96x60/102b25/ffffff?text=Video')
      }
      alt=""
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden'
      }}
    />
    <div>
      <strong>{item.title ?? item.caption ?? `Post ${index + 1}`}</strong>
      <div className="content-type-label">
        {item.platform} · {item.content_type ?? 'Post'}
      </div>
    </div>
  </div>
</td>

                            <td>{item.platform ?? '—'}</td>

                            <td>{number(item.views ?? item.total_views)}</td>

                            <td>{item.engagement_rate != null ? `${item.engagement_rate}%` : '—'}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                ) : renderEmptyState(

                  dashboardSearch ? 'No matching content' : 'No content data yet',

                  dashboardSearch ? 'Try a different search term.' : 'Post metrics will appear when post records and analytics are available from the API.'

                )}

              </section>



              <section className="dashboard-content-grid dashboard-bottom-grid">

                <article className="dashboard-card">

                  <div className="section-heading"><div><h2>Audience Demographics</h2><p>Audience analytics from connected platforms</p></div><button type="button" className="connect-account-button" onClick={() => setActiveSection('Audience')}>View all →</button></div>

                  <div className="demo-data-list">
  <p className="demo-label">Illustrative demo audience data</p>

  {[
    ['18–24 years', 35],
    ['25–34 years', 40],
    ['35–44 years', 18],
    ['45+ years', 7],
  ].map(([label, percentage]) => (
    <div className="demo-metric-row" key={label}>
      <div className="demo-metric-heading">
        <span>{label}</span>
        <strong>{percentage}%</strong>
      </div>
      <div className="demo-progress-track">
        <div
          className="demo-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  ))}
</div>

                </article>

                <article className="dashboard-card">

                  <div className="section-heading"><div><h2>Recent Activity</h2><p>Latest workspace updates</p></div><button type="button" className="connect-account-button" onClick={() => setActiveSection('Notifications')}>View all →</button></div>

                  <div className="demo-data-list">
  <p className="demo-label">Recent activity · Demo data</p>

  {[
    {
      title: 'YouTube account connected',
      detail: 'Demo social account',
      time: 'Today',
      icon: '▶',
    },
    {
      title: 'Instagram performance updated',
      detail: 'Sample analytics refreshed',
      time: 'Today',
      icon: '◎',
    },
    {
      title: 'Monthly report prepared',
      detail: 'Demo creator report',
      time: 'Yesterday',
      icon: '▤',
    },
    {
      title: 'Audience insights reviewed',
      detail: 'Sample audience demographics',
      time: 'Yesterday',
      icon: '♙',
    },
  ].map((activity) => (
    <div className="demo-activity-row" key={activity.title}>
      <span className="demo-activity-icon">{activity.icon}</span>
      <div className="demo-activity-details">
        <strong>{activity.title}</strong>
        <span>{activity.detail}</span>
      </div>
      <span className="demo-activity-time">{activity.time}</span>
    </div>
  ))}
</div>

                </article>

              </section>

            </>

          )}



          {activeSection === 'Content Analytics' && (

            <section className="dashboard-card">

              <div className="section-heading"><div><h2>Content Analytics</h2><p>Search and review available post performance.</p></div></div>

              {searchableContent.length ? (

                <div className="posts-table-wrap"><table className="posts-table">

                  <thead><tr><th>Content</th><th>Platform</th><th>Views</th><th>Engagement</th></tr></thead>

                  <tbody>{searchableContent.map((item, index) => (

                    <tr key={item.post_id ?? item.id ?? index}>

                      <td>{item.title ?? item.caption ?? `Post ${index + 1}`}</td><td>
  <span className="revenue-platform-name">
    {platformLogos[item.platform] && (
      <img
        src={platformLogos[item.platform]}
        alt=""
        className="platform-button-logo"
      />
    )}
    {item.platform ?? '—'}
  </span>
</td>

                      <td>{number(item.views ?? item.total_views)}</td><td>{item.engagement_rate != null ? `${item.engagement_rate}%` : '—'}</td>

                    </tr>

                  ))}</tbody>

                </table></div>

              ) : renderEmptyState('No post analytics yet', 'Post records will appear here when they are available from the API.')}

            </section>

          )}



          {activeSection === 'Audience' && <section className="dashboard-card"><div className="section-heading"><div><h2>Audience Analytics</h2><p>Understand your community.</p></div></div><div className="demo-data-list">
  <p className="demo-label">Illustrative demo audience data — not live analytics</p>

  {[
    { label: 'Age 18–24', value: '38%' },
    { label: 'Age 25–34', value: '42%' },
    { label: 'Age 35–44', value: '15%' },
    { label: 'Age 45+', value: '5%' },
    { label: 'India', value: '65%' },
    { label: 'United States', value: '20%' },
    { label: 'Other countries', value: '15%' },
  ].map((item) => (
    <div className="platform-row" key={item.label}>
      <div className="platform-info">
        <strong>{item.label}</strong>
        <span>Sample audience distribution</span>
      </div>
      <span className="connected-label">{item.value}</span>
    </div>
  ))}
</div></section>}



          {activeSection === 'Revenue' && (

            <>

              <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Recorded Revenue</span><span className="stat-icon">₹</span></div><h2>
  {Number(stats.recorded_revenue ?? 0) > 0
    ? money(stats.recorded_revenue)
    : '₹12,500'}
</h2><p>Recorded in CreatorIQ</p></article></section>

              <section className="dashboard-card"><div className="section-heading"><div><h2>Revenue Overview</h2><p>Recorded revenue and trends</p></div></div><div className="demo-data-list">
  <p className="demo-label">Illustrative demo revenue breakdown</p>

  {[
    { source: 'YouTube', amount: 6500, share: 52 },
    { source: 'Instagram', amount: 3750, share: 30 },
    { source: 'Brand Collaborations', amount: 2250, share: 18 },
  ].map((item) => (
    <div className="demo-metric-row" key={item.source}>
      <div className="demo-metric-heading">
        <span className="revenue-platform-name">
  {platformLogos[item.source] && (
    <img
      src={platformLogos[item.source]}
      alt=""
      className="platform-button-logo"
    />
  )}
  {item.source}
</span>
        <strong>
          ₹{item.amount.toLocaleString('en-IN')}
        </strong>
      </div>

      <div className="demo-progress-track">
        <div
          className="demo-progress-fill"
          style={{ width: `${item.share}%` }}
        />
      </div>
    </div>
  ))}
</div></section>

            </>

          )}



 
{activeSection === 'Reports' && (
  <section className="dashboard-card">
    <div className="section-heading">
      <div>
        <h2>Reports</h2>
        <p>Creator performance reports</p>
      </div>
    </div>

    <p className="demo-label">
      Illustrative demo reports — sample data, not live analytics
    </p>

    <div className="demo-data-list">
      {[
        {
          title: 'Monthly Creator Performance',
          date: '18 Oct 2026',
          status: 'Ready',
          format: 'PDF',
        },
        {
          title: 'Social Media Engagement Report',
          date: '15 Oct 2026',
          status: 'Ready',
          format: 'CSV',
        },
        {
          title: 'Revenue Summary Report',
          date: '12 Oct 2026',
          status: 'Ready',
          format: 'PDF',
        },
      ].map((report) => (
        <div className="demo-metric-row" key={report.title}>
          <div className="demo-metric-heading">
            <strong>{report.title}</strong>
            <span>{report.date} · {report.format}</span>
          </div>
          <span className="connected-label">{report.status}</span>
        </div>
      ))}
    </div>
  </section>
)}




          {activeSection === 'Social Accounts' && (
            <section className="dashboard-card">
              <div className="section-heading">
                <div>
                  <h2>Social Accounts</h2>
                  <p>Choose the social platforms you want to connect.</p>
                </div>
                <button
                  type="button"
                  className="connect-account-button"
                  onClick={() => setShowPlatformPicker((open) => !open)}
                >
                  {showPlatformPicker ? 'Close picker' : '+ Add Platform'}
                </button>
              </div>

              {showPlatformPicker && (
                <div className="platform-picker">
                  <h3>Choose a platform</h3>
                  <div className="platform-picker-grid">
                    
{[
  'Instagram', 'YouTube', 'Facebook', 'TikTok', 'LinkedIn',
  'X', 'Twitch', 'Pinterest', 'Snapchat', 'Reddit',
].map((platform) => {
 
  return (

                      <button
                        type="button"
                        key={platform}
                        className={`connect-account-button ${selectedPlatform === platform ? 'active' : ''}`}
                        onClick={() => setSelectedPlatform(platform)}
                      >
                        <img
  src={platformLogos[platform]}
  alt=""
  className="platform-button-logo"
  onError={(event) => {
    event.currentTarget.style.display = 'none'
  }}
/>
{platform}
                      </button>
  )
})}
                  </div>
                  

{selectedPlatform && (
  <>
    <p className="small-note">
      Selected platform: <strong>{selectedPlatform}</strong>.
      <br />
      Demo selection only — OAuth authorization is required to connect a real account.
    </p>

    <button
      type="button"
      className="connect-account-button"
      onClick={() =>
        window.alert(
          `Demo mode: ${selectedPlatform} OAuth is not configured yet.`
        )
      }
    >
      Connect {selectedPlatform} Account
    </button>
  </>
)}


                </div>
              )}

              {socialAccounts.length > 0 ? (
                <div className="platform-list">
                  {socialAccounts.map((account, index) => (
                    <div className="platform-row" key={account.social_account_id ?? account.account_id ?? `${account.platform}-${index}`}>
                      <span className="platform-icon">{platformLogos[account.platform] ? <img src={platformLogos[account.platform]} alt="" className="platform-button-logo" /> : String(account.platform ?? 'SOC').slice(0, 2).toUpperCase()}</span>
                      <div className="platform-info">
                        <strong className="revenue-platform-name">{platformLogos[account.platform] && <img src={platformLogos[account.platform]} alt="" className="platform-button-logo" />}{account.platform ?? 'Social platform'}</strong>
                        <span>{account.username ?? account.account_name ?? 'Connected account'}</span>
                      </div>
                      <span className="connected-label">Connected</span>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptyState('No social accounts connected', 'Choose a platform above. Analytics will appear after the account is connected and data is available.')
              )}
              <p className="small-note">The picker can list platforms, but each platform needs its own official authentication and API integration before it can actually connect.</p>
            </section>
          )}

          {activeSection === 'Notifications' && <section className="dashboard-card"><div className="section-heading"><div><h2>Notifications</h2><p>Updates from your workspace</p></div></div><div className="demo-data-list">
  <p className="demo-label">
    Illustrative demo notifications — not live account activity
  </p>

  {[
    {
      title: 'Analytics report generated',
      detail: 'Your weekly performance summary is ready.',
      time: '10 minutes ago',
    },
    {
      title: 'Campaign milestone reached',
      detail: 'A demo campaign has reached 100,000 views.',
      time: '1 hour ago',
    },
    {
      title: 'Social analytics refreshed',
      detail: 'Sample platform statistics have been updated.',
      time: 'Today',
    },
  ].map((item) => (
    <div className="platform-row" key={item.title}>
      <div className="platform-info">
        <strong>{item.title}</strong>
        <span>{item.detail}</span>
      </div>
      <span className="connected-label">{item.time}</span>
    </div>
  ))}
</div></section>}

        </main>

      </div>

    )

  }



  // Login and signup pages.

  return (

    <div className="login-page">

      <section className="brand-panel">

        <div className="brand-content">

          <div className="brand-logo">

            <div className="logo-mark">CI</div>

            <span>CreatorIQ</span>

          </div>



          <div className="brand-message">

            <p className="eyebrow">CREATOR ANALYTICS PLATFORM</p>

            <h1>

              Turn your <span>creativity</span> into insights.

            </h1>

            <p className="brand-description">

              Track your content performance, understand your audience,

              measure growth, and discover your creator potential — all

              in one place.

            </p>

          </div>



          <div className="analytics-preview">

            <div className="analytics-header">

              <span>Performance Overview</span>

              <span className="growth">CreatorIQ</span>

            </div>



            <div className="chart">

              <div className="chart-line line-one"></div>

              <div className="chart-line line-two"></div>

              <div className="chart-line line-three"></div>

              <div className="chart-point point-one"></div>

              <div className="chart-point point-two"></div>

              <div className="chart-point point-three"></div>

              <div className="chart-point point-four"></div>

              <div className="chart-point point-five"></div>

            </div>



            <div className="chart-labels">

              <span>Jan</span>

              <span>Feb</span>

              <span>Mar</span>

              <span>Apr</span>

              <span>May</span>

            </div>

          </div>



          <div className="feature-tags">

            <span>Content</span>

            <span>Audience</span>

            <span>Growth</span>

            <span>Revenue</span>

          </div>

        </div>

      </section>



      <section className="login-panel">

        <div className="login-card">

          <div className="mobile-logo">

            <div className="logo-mark">CI</div>

            <span>CreatorIQ</span>

          </div>



          <div className="login-heading">

            <p className="welcome-label">

              {page === 'login' ? 'WELCOME BACK' : 'GET STARTED'}

            </p>



            <h2>

              {page === 'login' ? (

                <>Sign in to your <span>CreatorIQ</span> account</>

              ) : (

                <>Create your <span>CreatorIQ</span> account</>

              )}

            </h2>



            <p>

              {page === 'login'

                ? 'Access your creator dashboard and continue growing.'

                : 'Join CreatorIQ to understand and grow your content.'}

            </p>

          </div>



          {message && (

            <div

              role="status"

              aria-live="polite"

              style={{

                padding: '12px',

                marginBottom: '16px',

                borderRadius: '8px',

                background:

                  messageType === 'success' ? '#dcfce7' : '#fee2e2',

                color:

                  messageType === 'success' ? '#166534' : '#991b1b',

                fontSize: '14px',

              }}

            >

              {message}

            </div>

          )}



          {page === 'login' ? (

            <form className="login-form" onSubmit={handleLogin}>

              <div className="input-group">

                <label htmlFor="login-email">Email address</label>

                <div className="input-wrapper">

                  <span className="input-icon">@</span>

                  <input

                    type="email"

                    id="login-email"

                    name="email"

                    placeholder="you\@example.com"

                    value={loginData.email}

                    onChange={updateLogin}

                    autoComplete="email"

                    required

                  />

                </div>

              </div>



              <div className="input-group">

                <div className="password-label">

                  <label htmlFor="login-password">Password</label>

                </div>

                <div className="input-wrapper">

                  <span className="input-icon">•</span>

                  <input

                    type={showLoginPassword ? 'text' : 'password'}

                    id="login-password"

                    name="password"

                    placeholder="Enter your password"

                    value={loginData.password}

                    onChange={updateLogin}

                    autoComplete="current-password"

                    required

                  />

                  <button

                    type="button"

                    onClick={() => setShowLoginPassword(!showLoginPassword)}

                    aria-label={

                      showLoginPassword ? 'Hide password' : 'Show password'

                    }

                    aria-pressed={showLoginPassword}

                    style={passwordToggleStyle}

                  >

                    {showLoginPassword ? 'Hide' : 'Show'}

                  </button>

                </div>

              </div>



              <div className="login-options-row">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-password-button"
                  onClick={() => {
                    setMessageType('error')
                    setMessage('Password reset is not configured yet. Please contact your CreatorIQ administrator.')
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>

                <span className="arrow">→</span>

              </button>

              <div className="login-divider"><span>OR CONTINUE WITH</span></div>
              <div className="social-login-grid">
                <button type="button" onClick={() => setMessage('Google sign-in is not configured yet. Use your CreatorIQ email and password.')}><span className="social-brand google-brand">G</span>Google</button>
                <button type="button" onClick={() => setMessage('Apple sign-in is not configured yet. Use your CreatorIQ email and password.')}><span className="social-brand apple-brand">●</span>Apple</button>
                <button type="button" onClick={() => setMessage('GitHub sign-in is not configured yet. Use your CreatorIQ email and password.')}><span className="social-brand github-brand">⌘</span>GitHub</button>
              </div>
              <p className="login-security-note"><span aria-hidden="true">▣</span> Your data is protected with secure authentication.</p>

            </form>

          ) : (

            <form className="login-form" onSubmit={handleSignup}>

              <div className="input-group">

                <label htmlFor="signup-name">Full name</label>

                <div className="input-wrapper">

                  <input

                    type="text"

                    id="signup-name"

                    name="name"

                    placeholder="Enter your full name"

                    value={signupData.name}

                    onChange={updateSignup}

                    autoComplete="name"

                    minLength={2}

                    maxLength={100}

                    required

                  />

                </div>

              </div>



              <div className="input-group">

                <label htmlFor="signup-email">Email address</label>

                <div className="input-wrapper">

                  <span className="input-icon">@</span>

                  <input

                    type="email"

                    id="signup-email"

                    name="email"

                    placeholder="you\@example.com"

                    value={signupData.email}

                    onChange={updateSignup}

                    autoComplete="email"

                    required

                  />

                </div>

              </div>



              <div className="input-group">

                <label htmlFor="signup-password">Password</label>

                <div className="input-wrapper">

                  <span className="input-icon">•</span>

                  <input

                    type={showSignupPassword ? 'text' : 'password'}

                    id="signup-password"

                    name="password"

                    placeholder="Create a password (8–128 characters)"

                    value={signupData.password}

                    onChange={updateSignup}

                    autoComplete="new-password"

                    minLength={8}

                    maxLength={128}

                    required

                  />

                  <button

                    type="button"

                    onClick={() => setShowSignupPassword(!showSignupPassword)}

                    aria-label={

                      showSignupPassword ? 'Hide password' : 'Show password'

                    }

                    aria-pressed={showSignupPassword}

                    style={passwordToggleStyle}

                  >

                    {showSignupPassword ? 'Hide' : 'Show'}

                  </button>

                </div>

              </div>



              <div className="input-group">

                <label htmlFor="signup-role">I want to join as</label>

                <div className="input-wrapper">

                  <select

                    id="signup-role"

                    name="role"

                    value={signupData.role}

                    onChange={updateSignup}

                    required

                    style={{

                      width: '100%',

                      padding: '12px',

                      border: 'none',

                      outline: 'none',

                      background: '#0b1712',

                      color: '#e8fff5',

                    }}

                  >

                    <option value="creator">Creator</option>

                    <option value="agency">Agency</option>

                    <option value="marketing_team">Marketing Team</option>

                    <option value="admin">Admin</option>

                  </select>

                </div>

              </div>



              <button

                type="submit"

                className="login-button"

                disabled={loading}

              >

                <span>{loading ? 'Creating account...' : 'Create account'}</span>

                <span className="arrow">→</span>

              </button>

            </form>

          )}



          <div className="divider">

            <span>OR</span>

          </div>



          <p className="register-text">

            {page === 'login'

              ? "Don't have a CreatorIQ account? "

              : 'Already have a CreatorIQ account? '}

            <a

              href={page === 'login' ? '#signup' : '#login'}

              onClick={(event) => {

                event.preventDefault()

                changePage(page === 'login' ? 'signup' : 'login')

              }}

            >

              {page === 'login' ? 'Create an account' : 'Sign in'}

            </a>

          </p>



          <p className="security-note">

            Your data is protected with secure authentication.

          </p>

        </div>

      </section>

    </div>

  )

}



const passwordToggleStyle = {

  border: 'none',

  background: 'transparent',

  color: '#34d399',

  cursor: 'pointer',

  padding: '8px',

  fontSize: '13px',

  fontWeight: 600,

  flexShrink: 0,

}



export default App

