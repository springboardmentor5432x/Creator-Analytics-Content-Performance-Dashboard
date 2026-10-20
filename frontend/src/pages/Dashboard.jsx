import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import { Icon, PlatformBadge } from "../dashboard/Icons.jsx";
import { Audience, ContentPerformance, FollowerGrowth, KpiRow, Revenue, TopPosts } from "../dashboard/Widgets.jsx";
import { AdminDashboard, AgencyDashboard, MarketingDashboard } from "../dashboard/RoleDashboards.jsx";

const PLATFORMS = ["All Platforms", "YouTube", "Instagram", "TikTok"];

const SUBTITLE = {
  creator: "Here's an overview of your content performance across all platforms.",
  agency: "Here's the combined performance of the creators you manage.",
  marketing_team: "Here's how your campaigns and content are performing.",
  admin: "Here's an overview of everyone using CreatorIQ.",
};

function CreatorDashboard() {
  const [platform, setPlatform] = useState("All Platforms");
  return (
    <>
      <div className="chips" role="group" aria-label="Platform filter">
        {PLATFORMS.map((p) => (
          <button key={p} className={"chip" + (platform === p ? " on" : "")} aria-pressed={platform === p} onClick={() => setPlatform(p)}>
            {p !== "All Platforms" && <PlatformBadge name={p} size={18} />}
            {p}
          </button>
        ))}
        <button className="chip ghost"><Icon name="plus" size={14} /> Add Platform</button>
      </div>
      <p className="sample-note"><span className="sample-pill">Sample data</span> Analytics shown here are demo numbers until accounts are connected.</p>
      <KpiRow />
      <div className="row row-a">
        <FollowerGrowth platform={platform} />
        <ContentPerformance />
      </div>
      <div className="row row-b">
        <TopPosts />
        <div className="stack"><Audience /><Revenue /></div>
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
