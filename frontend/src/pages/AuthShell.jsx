import { Activity } from "lucide-react";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink-950 p-12 text-ink-100 lg:flex">
        <div className="flex items-center gap-2 font-display text-2xl font-extrabold text-white"><Activity className="h-7 w-7 text-signal" /> CreatorIQ</div>
        <div>
          <p className="font-display text-4xl font-extrabold leading-tight text-white">Know which posts earn their place on your calendar.</p>
          <p className="mt-4 max-w-md text-ink-300">Track views, engagement and follower growth across YouTube, Instagram, TikTok, Facebook, X and LinkedIn in one place.</p>
        </div>
        <p className="text-sm text-ink-500">Internship project · Weeks 1–4</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink-500">{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
