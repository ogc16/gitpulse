"use client";

import { useState } from "react";
import { ShieldCheck, Cog, Activity, Users, GitCommitHorizontal, Puzzle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { CURISM_LABELS, CURISM_ORDER, gradeColor, ProfileCurism } from "../lib/curism";
import type { CurismKey } from "../lib/curism";

export interface ScanProgressState {
  running: boolean;
  phase?: string;
  completed?: number;
  total?: number;
  current?: string | null;
}

const DIMENSION_ICONS: Record<CurismKey, typeof ShieldCheck> = {
  C: GitCommitHorizontal,
  U: Puzzle,
  R: Activity,
  I: Users,
  S: ShieldCheck,
  M: Cog,
};

export default function CurismPanel({
  scanState,
  progress,
  curism,
  error,
  scanTip,
  onRetry,
}: {
  scanState: "idle" | "scanning" | "done" | "error";
  progress: ScanProgressState | null;
  curism: ProfileCurism | null;
  error: string | null;
  scanTip?: string;
  onRetry: () => void;
}) {
  if (scanState === "idle") return null;

  if (scanState === "scanning") {
    const done = progress?.completed ?? 0;
    const total = progress?.total ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 5;
    return (
      <section className="mt-2 panel p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
          <h2 className="text-base font-semibold text-slate-100">CURISM© scan in progress</h2>
          <span className="micro ml-auto hidden sm:inline num">{done}/{total || "…"}</span>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          {total > 0
            ? `Deep-scanning repositories — ${done}/${total} analyzed`
            : "Fetching profile and repository list…"}
        </p>
        {progress?.current ? (
          <p className="mt-1 text-xs text-slate-500 font-mono">now scanning: {progress.current}</p>
        ) : null}
        <div className="mt-4 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Evaluates Contribution, Uniqueness, Reliability, Influence, Security, Maintainability per repo. Unauthenticated scans share the server IP quota
          (60 req/hr) — set <span className="font-mono text-slate-400">GITHUB_TOKEN</span> for full-speed scans.
        </p>
      </section>
    );
  }

  if (scanState === "error") {
    return (
      <section className="mt-2 panel p-6 border-rose-500/25">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-rose-300">CURISM© scan failed</h2>
            <p className="text-sm text-rose-200/70 mt-1">{error}</p>
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 text-sm text-rose-300 border border-rose-400/40 rounded-lg px-3 py-1.5 hover:bg-rose-500/10"
            >
              <RefreshCw className="w-4 h-4" /> Retry scan
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (scanState !== "done" || !curism) return null;

  const o = curism.overview;
  const dimensionRows: { key: CurismKey; value: number; grade: string }[] = CURISM_ORDER.map((key) => ({
    key,
    value: o[key],
    grade: stageGrade(o[key]),
  }));

  return (
    <section className="mt-2 space-y-6">
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-green-400" />
              <h2 className="text-base font-semibold text-slate-100">CURISM© Profile Overview</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Scanned {curism.analyzedCount} of {curism.totalCount} repos · {new Date(curism.scannedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gradeColor(o.grade)} text-lg font-bold`}>
              {o.grade}
            </div>
            <p className="micro block mt-1.5">
              Overall <span className="text-slate-200 num">{o.overall.toFixed(1)}</span>
            </p>
          </div>
        </div>

        {scanTip ? (
          <div className="mt-4 flex items-start gap-2 text-xs text-green-300/90 bg-green-500/[0.06] border border-green-500/25 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanTip}</span>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {dimensionRows.map(({ key, value, grade }) => {
            const Icon = DIMENSION_ICONS[key];
            return (
              <div key={key} className="panel-deep p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">{CURISM_LABELS[key]}</span>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${gradeColor(grade)}`}>{grade}</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-100 num">{value.toFixed(1)}</span>
                  <span className="micro">/100</span>
                </div>
                <div className="mt-2.5 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-green-500/70 to-green-400" style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Hard = (R+S+M)/3: <b className="text-slate-300 num">{o.hard.toFixed(2)}</b></span>
          <span>Soft = (I+C)/2: <b className="text-slate-300 num">{o.soft.toFixed(2)}</b></span>
          <span>Builder = Uniqueness: <b className="text-slate-300 num">{o.builder.toFixed(2)}</b></span>
          <span>Overall = 30%·Hard + 40%·Soft + 30%·Builder: <b className="text-green-300 num">{o.overall.toFixed(2)}</b></span>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Per-repo CURISM ratings</h3>
          <span className="text-xs text-slate-500 num">
            {curism.analyzedCount} deep-scanned · {curism.totalCount - curism.analyzedCount} metadata-only
          </span>
        </div>
        <div className="space-y-2">
          {curism.repos.map((r) => (
            <RepoRow key={r.name} repo={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RepoRow({ repo }: { repo: ProfileCurism["repos"][number] }) {
  const [open, setOpen] = useState(false);
  const dims: CurismKey[] = CURISM_ORDER;
  return (
    <div className="panel-deep overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.025] transition-colors">
        <span className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border text-sm font-bold ${gradeColor(repo.grade)}`}>
          {repo.grade}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">{repo.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {repo.language ?? "—"} · ★ {repo.stars} · fork {repo.fork ? "yes" : "no"}{repo.isAnalyzed ? "" : " · shallow"}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {dims.map((k) => (
            <div key={k} className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{k}</div>
              <div className="text-sm font-semibold text-slate-300 num">{repo.scores[k]}</div>
            </div>
          ))}
        </div>
        <div className="text-sm font-bold text-slate-100 w-12 text-right num">{repo.overall.toFixed(1)}</div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open ? (
        <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] grid md:grid-cols-2 gap-4">
          {dims.map((k) => (
            <div key={k}>
              <p className="text-xs font-semibold text-slate-300">
                {CURISM_LABELS[k]} <span className="text-slate-500">({repo.scores[k].toFixed(1)})</span>
              </p>
              <ul className="mt-1 ml-4 list-disc text-xs text-slate-500 space-y-0.5">
                {repo.evidence[k]?.length ? (
                  repo.evidence[k].map((e, i) => <li key={i}>{e}</li>)
                ) : (
                  <li>No notable signals (metadata-only scoring).</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function stageGrade(value: number): string {
  if (value >= 89.1) return "S+";
  if (value >= 73.4) return "S";
  if (value >= 58.9) return "A";
  if (value >= 50.1) return "B";
  return "C";
}