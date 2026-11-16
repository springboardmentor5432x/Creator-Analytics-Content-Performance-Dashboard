import { useState } from "react";
import { Loader2 } from "lucide-react";
import api, { parseError } from "../api/client";
import { Alert, Field } from "./ui";
import { PLATFORMS, PLATFORM_LABEL, isoDate } from "../utils/format";

const COLUMNS = [
  ["title", "Title"],
  ["platform", "Platform"],
  ["published_at", "Date"],
  ["views", "Views"],
  ["likes", "Likes"],
  ["comments", "Comments"],
  ["shares", "Shares"],
  ["saves", "Saves"],
  ["reach", "Reach"],
  ["watch_time_minutes", "Watch (min)"],
];
const NUMS = ["views", "likes", "comments", "shares", "saves", "reach", "watch_time_minutes"];
const BLANK = {
  title: "",
  platform: "youtube",
  published_at: isoDate(new Date()),
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  reach: 0,
  watch_time_minutes: 0,
};

export default function ContentForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial || BLANK);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.title.trim()) errs.title = "Enter a title.";
    if (!f.published_at) errs.published_at = "Choose a date.";
    NUMS.forEach((k) => {
      if (f[k] === "" || Number(f[k]) < 0 || Number.isNaN(Number(f[k]))) errs[k] = "Use a number of 0 or more.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...f, title: f.title.trim() };
    NUMS.forEach((k) => (body[k] = Number(f[k])));
    ["views", "likes", "comments", "shares", "saves", "reach"].forEach((k) => (body[k] = Math.round(body[k])));
    setBusy(true);
    setMessage("");
    try {
      editing ? await api.put(`/api/content/${initial.id}`, body) : await api.post("/api/content", body);
      onSaved?.(editing ? "Content updated." : "Content added.");
      onClose?.();
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields);
      setMessage(p.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit content" : "Add content"}
    >
      <form onSubmit={submit} noValidate className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <h2 className="font-display text-xl font-extrabold text-ink-950">{editing ? "Edit Content Record" : "Add New Content"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-950">✕</button>
        </div>
        {message && <Alert>{message}</Alert>}
        <Field label="Title" htmlFor="c-title" error={errors.title}>
          <input
            id="c-title"
            placeholder="e.g., 5 editing tricks I wish I knew sooner"
            className={`input ${errors.title ? "input-error" : ""}`}
            value={f.title}
            onChange={set("title")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Platform" htmlFor="c-platform">
            <select id="c-platform" className="input" value={f.platform} onChange={set("platform")}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Published On" htmlFor="c-date" error={errors.published_at}>
            <input id="c-date" type="date" className="input" value={f.published_at} onChange={set("published_at")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {NUMS.map((k) => (
            <Field key={k} label={COLUMNS.find((c) => c[0] === k)[1]} htmlFor={`c-${k}`} error={errors[k]}>
              <input
                id={`c-${k}`}
                type="number"
                min="0"
                step={k === "watch_time_minutes" ? "0.1" : "1"}
                className={`input ${errors[k] ? "input-error" : ""}`}
                value={f[k]}
                onChange={set(k)}
              />
            </Field>
          ))}
        </div>
        <p className="rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600">
          <b>Formula:</b> Engagement Rate = (Likes + Comments + Shares + Saves) ÷ Reach × 100 (0 when reach is 0).
        </p>
        <div className="flex justify-end gap-2.5 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add content"}
          </button>
        </div>
      </form>
    </div>
  );
}
