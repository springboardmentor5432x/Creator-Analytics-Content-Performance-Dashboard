import { useState } from "react";
import { Users, Eye, Heart, Percent, FilePlus2, Pencil, Trash2, LogIn, LogOut, UserCog, Link2, FlaskConical } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi, Spinner, ErrorState, EmptyState, StatCard, PageHeader, Filters, DemoBanner, DemoBadge, ChartCard, LoadDemoButton } from "../components/ui";
import { PLATFORM_LABEL, PLATFORM_COLOR, num, compact, pct, shortDate, rangeParams, isoDate } from "../utils/format";

const ACTION_ICON = { content_add: FilePlus2, content_edit: Pencil, content_delete: Trash2, login: LogIn, logout: LogOut, register: UserCog, profile: UserCog, connection: Link2, demo: FlaskConical };

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const today = isoDate(new Date());
  const [custom, setCustom] = useState({ start: isoDate(new Date(Date.now() - 29 * 864e5)), end: today });
  const { data, loading, error, reload } = useApi("/api/dashboard/overview", rangeParams(days, custom));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your performance across all platforms at a glance.">
        <Filters days={days} setDays={setDays} custom={custom} setCustom={setCustom} />
      </PageHeader>
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : data.empty ? (
        <EmptyState title="No analytics yet" text="Add your first content record, or load demo data to explore every screen. Demo data is always labelled." action={<LoadDemoButton onDone={reload} />} />
      ) : (
        <div className="space-y-6">
          {data.has_demo && <DemoBanner />}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total followers" value={num(data.cards.total_followers)} icon={Users} hint="Latest across platforms" />
            <StatCard label="Total views" value={num(data.cards.total_views)} icon={Eye} hint="Posts in selected range" />
            <StatCard label="Total engagement" value={num(data.cards.total_engagement)} icon={Heart} hint="Likes + comments + shares + saves" />
            <StatCard label="Engagement rate" value={pct(data.cards.engagement_rate)} icon={Percent} hint="Engagement ÷ reach" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Platform overview" subtitle="Views by platform in the selected range">
                <ResponsiveContainer>
                  <BarChart data={data.platforms.map((p) => ({ ...p, name: PLATFORM_LABEL[p.platform] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3ECEE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tickFormatter={compact} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => num(v)} /><Bar dataKey="views" name="Views" fill="#143A41" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Engagement" fill="#E8A317" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="card">
              <h2 className="mb-3 font-display text-base font-bold">Recent activity</h2>
              {data.recent_activity.length === 0 ? <p className="text-sm text-ink-500">Nothing yet.</p> : (
                <ul className="space-y-3">
                  {data.recent_activity.map((a) => { const Icon = ACTION_ICON[a.action] || LogIn; return (
                    <li key={a.id} className="flex gap-3 text-sm"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                      <div><p>{a.detail}</p><p className="text-xs text-ink-500">{new Date(a.created_at).toLocaleString()}</p></div></li>
                  ); })}
                </ul>
              )}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="mb-3 font-display text-base font-bold">Recent content</h2>
              {data.recent_content.length === 0 ? <p className="text-sm text-ink-500">No posts in this range.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead><tr className="border-b border-ink-100 text-left text-ink-500"><th className="py-2 pr-3 font-medium">Title</th><th className="pr-3 font-medium">Platform</th><th className="pr-3 text-right font-medium">Views</th><th className="text-right font-medium">Eng. rate</th></tr></thead>
                  <tbody>{data.recent_content.map((c) => (
                    <tr key={c.id} className="border-b border-ink-50"><td className="py-2 pr-3">{c.title} {c.is_demo && <DemoBadge />}<div className="text-xs text-ink-500">{shortDate(c.published_at)}</div></td>
                      <td className="pr-3">{PLATFORM_LABEL[c.platform]}</td><td className="pr-3 text-right tabular-nums">{num(c.views)}</td><td className="text-right tabular-nums">{pct(c.engagement_rate)}</td></tr>
                  ))}</tbody></table></div>
              )}
            </div>
            <div className="card">
              <h2 className="mb-3 font-display text-base font-bold">Platforms</h2>
              <ul className="space-y-3">{data.platforms.map((p) => (
                <li key={p.platform} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[p.platform] }} />{PLATFORM_LABEL[p.platform]}</span>
                  <span className="tabular-nums text-ink-500">{compact(p.followers)} followers</span></li>
              ))}</ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
