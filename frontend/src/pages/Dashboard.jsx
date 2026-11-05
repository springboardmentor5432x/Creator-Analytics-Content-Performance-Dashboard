import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { useAuth } from "../AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import { useDateRange } from "../dashboard/DateRangeContext.jsx";
import { Icon, PlatformBadge } from "../dashboard/Icons.jsx";
import { AdminDashboard, AgencyDashboard, MarketingDashboard } from "../dashboard/RoleDashboards.jsx";
import {
  Audience,
  ContentPerformance,
  FollowerGrowth,
  KpiRow,
  Revenue,
  TopPosts,
} from "../dashboard/Widgets.jsx";

const PLATFORMS = ["All Platforms", "YouTube", "Instagram", "LinkedIn"];

const SUBTITLE = {
  creator: "Here's an overview of your content performance across all platforms.",
  agency: "Here's the combined performance of the creators you manage.",
  marketing_team: "Here's how your campaigns and content are performing.",
  admin: "Here's an overview of everyone using CreatorIQ.",
};

function CreatorDashboard() {
  const { days } = useDateRange();
  const [platform, setPlatform] = useState("All Platforms");
  const [posts, setPosts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState({ ok: true, text: "" });

  const plat = platform === "All Platforms" ? "all" : platform.toLowerCase();

  const load = useCallback(() => {
    setLoadErr("");
    api.get(`/api/analytics/overview?platform=${plat}&days=${days}`)
      .then((res) => setOverview(res.data))
      .catch((e) => setLoadErr(errorMessage(e)));
    api.get(`/api/analytics/posts?sort_by=views&order=desc&platform=${plat}&days=${days}`)
      .then((res) => setPosts(res.data))
      .catch((e) => { setPosts([]); setLoadErr(errorMessage(e)); });
  }, [plat, days]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    const h = window.prompt("Enter YouTube channel handle (e.g. @chaiaurcode) or channel ID (UC...):", overview?.channel_name || "");
    if (!h) return;
    setSyncing(true);
    try {
      const res = await api.post("/api/analytics/youtube/sync", { channel_handle: h.trim() });
      setSyncMsg({ ok: true, text: res.data.message });
      load();
    } catch (err) {
      setSyncMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg({ ok: true, text: "" }), 8000);
    }
  };

  return (
    <>
      <div className="chips" role="group" aria-label="Platform filter">
        {PLATFORMS.map((p) => (
          <button key={p} className={"chip" + (platform === p ? " on" : "")} aria-pressed={platform === p} onClick={() => setPlatform(p)}>
            {p !== "All Platforms" && <PlatformBadge name={p} size={18} />}
            {p}
          </button>
        ))}
        <button className="chip ghost" onClick={handleSync} disabled={syncing} title="Connect / refresh a YouTube channel">
          <Icon name="plus" size={14} /> {syncing ? "Syncing..." : "Sync YouTube Channel"}
        </button>
      </div>

      <p className="sample-note">
        {overview?.connected ? (
          <>
            <span className={"sample-pill " + (overview.is_live ? "live" : "")}>{overview.is_live ? "Live" : "Demo data"}</span>
            Channel: <strong>{overview.channel_name}</strong>
            {overview.last_synced_at && <> • last synced {new Date(overview.last_synced_at + "Z").toLocaleString("en-IN")}</>}
            {" • "}showing last {days} days
          </>
        ) : (
          <>No channel connected for this view. Click <strong>Sync YouTube Channel</strong> to connect one.</>
        )}
        {syncMsg.text && <span className={"sample-pill " + (syncMsg.ok ? "live" : "")} style={syncMsg.ok ? {} : { background: "#fee2e2", color: "#b91c1c" }}>{syncMsg.ok ? "✓ " : "⚠ "}{syncMsg.text}</span>}
        {loadErr && <span className="sample-pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>⚠ {loadErr}</span>}
      </p>

      <KpiRow overview={overview} platform={platform} days={days} />

      <div className="row row-a">
        <FollowerGrowth platform={platform} days={days} />
        <ContentPerformance platform={platform} days={days} />
      </div>

      <div className="row row-b">
        <TopPosts posts={posts} />
        <div className="stack">
          <Audience followers={overview?.subscribers} />
          <Revenue overview={overview} days={days} />
        </div>
      </div>
    </>
  );
}

const VIEWS = { creator: CreatorDashboard, agency: AgencyDashboard, marketing_team: MarketingDashboard, admin: AdminDashboard };

export default function Dashboard() {
  const { user } = useAuth();
  const View = VIEWS[user.role] || CreatorDashboard;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppLayout>
      <div className="hello">
        <div>
          <h1>{greeting}, {user.name.split(" ")[0]}! <span aria-hidden="true">👋</span></h1>
          <p className="muted">{SUBTITLE[user.role]}</p>
        </div>
      </div>
      <View />
    </AppLayout>
  );
}
