import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
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
  const [platform, setPlatform] = useState("All Platforms");
  const [posts, setPosts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const loadPosts = (selectedPlat = platform) => {
    const q = selectedPlat && selectedPlat !== "All Platforms" ? `&platform=${selectedPlat.toLowerCase()}` : "";
    api.get(`/api/analytics/posts?sort_by=views&order=desc${q}`)
      .then((res) => setPosts(res.data))
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    loadPosts(platform);
  }, [platform]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const h = window.prompt("Enter YouTube Channel handle to sync (e.g. @chaiaurcode, @MrBeast):", "@chaiaurcode");
    if (!h) { setSyncing(false); return; }
    const res = await api.post("/api/analytics/youtube/sync", { channel_handle: h.trim() });
      setSyncMsg(res.data.message || "Channel synced successfully!");
      loadPosts();
    } catch (err) {
      setSyncMsg("Sync failed. Check connection.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
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
        <button className="chip ghost" onClick={handleSync} disabled={syncing} title="Sync Any Channel Channel from database or API">
          <Icon name="plus" size={14} /> {syncing ? "Syncing..." : "Sync Any Channel"}
        </button>
      </div>

      <p className="sample-note">
        <span className="sample-pill live">Live</span> Multi-Platform Connected: <strong>Hitesh Choudhary (Chai aur Code)</strong> • 1.41M Combined Audience
        {syncMsg && <span className="sample-pill live">✓ {syncMsg}</span>}
      </p>

      {/* Primary KPI Metrics */}
      <KpiRow platform={platform} />

      {/* Charts Row */}
      <div className="row row-a">
        <FollowerGrowth platform={platform} />
        <ContentPerformance />
      </div>

      {/* Top Posts & Demographics */}
      <div className="row row-b">
        <TopPosts posts={posts} />
        <div className="stack">
          <Audience />
          <Revenue />
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
