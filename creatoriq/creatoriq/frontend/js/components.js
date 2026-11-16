/* Shared UI helpers & components (React + htm, no build step) */
const html = htm.bind(React.createElement);
const { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo } = React;
const Ctx = createContext({});

const PLAT = { YouTube: ['#ef4444', 'YT'], Instagram: ['#e1306c', 'IG'], TikTok: ['#14b8a6', 'TT'], Facebook: ['#1877f2', 'FB'], X: ['#64748b', 'X'], LinkedIn: ['#0a66c2', 'in'] };
const PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e', '#f97316', '#3b82f6', '#a855f7'];
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  film: 'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  link: 'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h8',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  hash: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
  out: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15',
  down: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  plus: 'M12 5v14M5 12h14', check: 'M20 6L9 17l-5-5', zap: 'M13 2L3 14h9l-1 8 10-12h-9z', bar: 'M18 20V10M12 20V4M6 20v-6',
};
const Icon = ({ n, s = 20, c = 'currentColor' }) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d=${ICONS[n] || ICONS.bar}/></svg>`;

const fmt = (n) => n == null ? '–' : new Intl.NumberFormat('en', { notation: Math.abs(n) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
const num = (n) => n == null ? '–' : Number(n).toLocaleString('en');
const money = (n) => n == null ? '–' : '$' + Number(n).toLocaleString('en', { maximumFractionDigits: 0 });
const day = (d) => d ? new Date(d.slice(0, 10) + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
const ago = (s) => { if (!s) return 'never'; const m = Math.round((Date.now() - new Date(s.replace(' ', 'T') + 'Z')) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

function useToast() { const [t, setT] = useState(null); const show = (msg, err) => { setT({ msg, err }); setTimeout(() => setT(null), 3200); }; return [t, show]; }

/* fetch hook: re-runs when path or global filters change */
function useApi(path, { range = true, deps = [] } = {}) {
  const { days, creatorId, tick } = useContext(Ctx);
  const [state, set] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(() => {
    const sep = path.includes('?') ? '&' : '?';
    const url = path + (range && !/[?&]days=/.test(path) ? `${sep}days=${days}` : '') + (creatorId ? `${path.includes('?') || range ? '&' : '?'}creator_id=${creatorId}` : '');
    set(s => ({ ...s, loading: s.data == null }));
    API.get(url).then(data => set({ data, loading: false, error: null })).catch(e => set({ data: null, loading: false, error: e.message }));
  }, [path, days, creatorId, tick, ...deps]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}

const Loading = () => html`<div class="spin"></div>`;
const Empty = ({ text = 'No data yet — connect a platform to get started.' }) => html`<div class="empty">📭<br/>${text}</div>`;
const Card = ({ title, hint, right, children, style, className = '' }) => html`<div class=${'card ' + className} style=${style}>
  ${(title || right) && html`<div class="row" style=${{ marginBottom: hint ? 0 : 10 }}><div><h3>${title}</h3>${hint && html`<div class="hint">${hint}</div>`}</div><div class="spacer"/>${right}</div>`}${children}</div>`;

const Kpi = ({ label, value, change, icon, color, suffix = '', prefix = '', pts = false }) => {
  const cls = change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return html`<div class="card kpi" style=${{ '--c': color }}>
    <div class="ic"><${Icon} n=${icon} c="#fff"/></div>
    <div class="lbl">${label}</div><div class="val">${prefix}${value}${suffix}</div>
    <span class=${'chg ' + cls}>${change == null ? '— vs prev' : (change > 0 ? '▲ ' : change < 0 ? '▼ ' : '') + Math.abs(change) + (pts ? ' pts' : '%') + ' vs prev'}</span></div>`;
};

const PlatBadge = ({ p, s = 42 }) => { const [c, t] = PLAT[p] || ['#8b5cf6', (p || '?')[0]]; return html`<div class="plat" style=${{ background: c, width: s, height: s }}>${t}</div>`; };

Chart.defaults.color = '#9aa0c3'; Chart.defaults.font.family = 'Inter'; Chart.defaults.borderColor = 'rgba(255,255,255,.07)';
Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.plugins.tooltip.backgroundColor = '#1b1b44'; Chart.defaults.plugins.tooltip.padding = 10;
function Graph({ type = 'line', data, options = {}, small }) {
  const ref = useRef(), inst = useRef();
  useEffect(() => {
    inst.current && inst.current.destroy();
    inst.current = new Chart(ref.current, { type, data, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, ...options } });
    return () => inst.current && inst.current.destroy();
  }, [JSON.stringify(data), type]);
  return html`<div class=${'chart' + (small ? ' sm' : '')}><canvas ref=${ref}/></div>`;
}
const gradient = (ctx, c) => { const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, c + '66'); g.addColorStop(1, c + '00'); return g; };
const lineDs = (label, data, color, fill = true, extra = {}) => ({ label, data, borderColor: color, tension: .38, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, fill,
  backgroundColor: (c) => c.chart.ctx && fill ? gradient(c.chart.ctx, color) : color, ...extra });
const scalesNoGrid = { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { ticks: { callback: (v) => fmt(v) }, beginAtZero: false } };
