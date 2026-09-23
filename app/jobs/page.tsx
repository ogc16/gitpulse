"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Trash2,
  Pencil,
  Upload,
  Download,
  ExternalLink,
  Mail,
  User,
  MapPin,
  Banknote,
  CalendarDays,
  ListChecks,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Inbox,
  CircleCheck,
  FileX2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Header from "../../components/Header";
import {
  STATUS_META,
  STATUS_ORDER,
  JobApplication,
  JobStatus,
  draftJob,
  isValidJob,
  computeStats,
  daysSince,
  todayISO,
  toCSV,
  downloadFile,
} from "../../lib/jobs";

const STORAGE_KEY = "gitpulse.jobs.v1";

export default function JobsPage() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"applied" | "lastActivity" | "company">("applied");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JobApplication>(draftJob());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as JobApplication[];
        if (Array.isArray(parsed)) setApps(parsed);
      }
    } catch {
      /* corrupted storage -> start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  }, [apps, loaded]);

  const stats = useMemo(() => computeStats(apps), [apps]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(draftJob());
    setModalOpen(true);
  };

  const openEdit = (job: JobApplication) => {
    setEditingId(job.id);
    setForm({ ...job });
    setModalOpen(true);
  };

  const save = () => {
    if (!isValidJob(form)) {
      flash("Company and role are required.");
      return;
    }
    if (editingId) {
      setApps((prev) => prev.map((a) => (a.id === editingId ? { ...form, lastActivity: todayISO() } : a)));
      flash("Application updated.");
    } else {
      setApps((prev) => [{ ...form, lastActivity: todayISO() }, ...prev]);
      flash("Application added.");
    }
    setModalOpen(false);
  };

  const remove = (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
    flash("Application deleted.");
  };

  const setStatus = (id: string, status: JobStatus) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, lastActivity: todayISO() } : a)));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = apps.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.contactName.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "lastActivity") return b.lastActivity.localeCompare(a.lastActivity);
      return b.appliedDate.localeCompare(a.appliedDate);
    });
  }, [apps, filter, query, sortBy]);

  const exportJSON = () => {
    downloadFile(`job-applications-${todayISO()}.json`, JSON.stringify(apps, null, 2), "application/json");
  };

  const exportCSV = () => {
    downloadFile(`job-applications-${todayISO()}.csv`, toCSV(apps), "text/csv");
  };

  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as JobApplication[];
        if (!Array.isArray(parsed)) throw new Error("bad format");
        const cleaned = parsed.filter((a) => a && typeof a === "object" && isValidJob(a));
        setApps((prev) => [...cleaned, ...prev]);
        flash(`Imported ${cleaned.length} application${cleaned.length === 1 ? "" : "s"}.`);
      } catch {
        flash("Import failed — file is not a valid JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const filterChip = (s: JobStatus | "all") => (
    <button
      key={s}
      onClick={() => setFilter(s)}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
        filter === s
          ? s === "all"
            ? "bg-green-500/10 text-green-300 border-green-500/30"
            : STATUS_META[s].chip
          : "text-slate-400 border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:text-slate-200"
      }`}
    >
      {s === "all" ? "All" : STATUS_META[s].label}
      <span className="ml-1.5 opacity-70">({s === "all" ? apps.length : stats.byStatus[s]})</span>
    </button>
  );

  return (
    <div className="min-h-screen text-slate-100 font-sans">
      <Header active="jobs" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="micro mb-1.5 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
              Career pipeline
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-green-400" />
              Job Application Tracker
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Track applications, interviews, offers, and follow-ups. Saved locally in your browser.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJSON(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
              title="Import JSON backup"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <button
              onClick={exportJSON}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
              title="Export JSON backup"
            >
              <Download className="w-3.5 h-3.5" /> Backup
            </button>
            <button
              onClick={exportCSV}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
              title="Export CSV (spreadsheets)"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={openAdd} className="btn-prime flex items-center gap-1.5 px-4 py-2 text-xs">
              <Plus className="w-4 h-4" /> Add Application
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl panel text-sm text-slate-100 shadow-2xl">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Inbox, cls: "text-slate-300" },
            { label: "Active", value: stats.active, icon: Clock, cls: "text-green-400" },
            { label: "Interviewing", value: stats.interviews, icon: CalendarDays, cls: "text-green-300" },
            { label: "Offers", value: stats.offers, icon: CheckCircle2, cls: "text-white" },
            { label: "Rejected", value: stats.rejected, icon: FileX2, cls: "text-rose-400" },
            {
              label: "Response rate",
              value: stats.responseRate === null ? "–" : `${stats.responseRate}%`,
              icon: CircleCheck,
              cls: "text-green-400",
              sub: stats.avgDaysToResponse === null ? "no replies yet" : `avg ${stats.avgDaysToResponse}d to reply`,
            },
          ].map(({ label, value, icon: Icon, cls, sub }) => (
            <div key={label} className="p-5 panel">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{label}</span>
                <Icon className={`w-4 h-4 ${cls}`} />
              </div>
              <span className="text-2xl font-bold text-white block num">{value}</span>
              {sub ? <span className="text-[10px] text-slate-500 block mt-1">{sub}</span> : <span className="text-[10px] text-slate-600 block mt-1">&nbsp;</span>}
            </div>
          ))}
        </div>

        <div className="panel p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", ...STATUS_ORDER] as (JobStatus | "all")[]).map(filterChip)}
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search company, role, location, contact…"
                  className="field w-full pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="field px-3 py-2 text-sm cursor-pointer"
              >
                <option value="applied">Sort by Applied</option>
                <option value="lastActivity">Sort by Activity</option>
                <option value="company">Sort by Company</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No job applications here yet.</p>
              <p className="text-xs text-slate-600 mt-1">Click “Add Application” to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((a) => (
                <JobRow
                  key={a.id}
                  job={a}
                  confirmDelete={confirmDelete === a.id}
                  onEdit={() => openEdit(a)}
                  onStatus={(s) => setStatus(a.id, s)}
                  onAskDelete={() => setConfirmDelete(confirmDelete === a.id ? null : a.id)}
                  onDelete={() => remove(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <JobFormModal
          editing={editingId !== null}
          form={form}
          setForm={setForm}
          onClose={() => setModalOpen(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function JobRow({
  job,
  confirmDelete,
  onEdit,
  onStatus,
  onAskDelete,
  onDelete,
}: {
  job: JobApplication;
  confirmDelete: boolean;
  onEdit: () => void;
  onStatus: (s: JobStatus) => void;
  onAskDelete: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const days = daysSince(job.appliedDate);
  const meta = STATUS_META[job.status];

  return (
    <div className={`panel-deep ring-hover transition ${confirmDelete ? "border-rose-700/70" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border text-sm font-bold ${meta.color}`}>
          {job.status === "offer" ? "✓" : job.status.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">
            {job.role}
            <span className="text-slate-500 font-normal"> · {job.company}</span>
          </p>
          <p className="text-xs text-slate-500 truncate">
            {days !== null ? `${days}d ago` : "—"}
            {job.location ? ` · ${job.location}` : ""}
            {job.nextStep ? ` · next: ${job.nextStep}` : ""}
          </p>
        </div>
        <select
          value={job.status}
          onChange={(e) => onStatus(e.target.value as JobStatus)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus:outline-none ${meta.chip} bg-transparent`}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} className="bg-[var(--surface-panel)] text-slate-200">
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <button onClick={onEdit} className="p-2 rounded-lg text-slate-500 hover:text-green-400 hover:bg-slate-800/60 transition" title="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        {confirmDelete ? (
          <button onClick={onDelete} className="px-2 py-1.5 rounded-lg bg-rose-600/20 border border-rose-600/50 text-rose-300 text-xs font-medium transition" title="Confirm delete">
            Sure?
          </button>
        ) : (
          <button onClick={onAskDelete} className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 transition" title="Details">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] grid md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          {job.salaryRange && (
            <Row label="Salary">
              <Banknote className="w-3.5 h-3.5 text-slate-500" /> {job.salaryRange}
            </Row>
          )}
          {job.location && (
            <Row label="Location">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location}
            </Row>
          )}
          {job.appliedDate && (
            <Row label="Applied">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" /> {job.appliedDate}
              {days !== null ? <span className="text-slate-600"> ({days}d)</span> : null}
            </Row>
          )}
          {job.nextStep && (
            <Row label="Next step">
              <ListChecks className="w-3.5 h-3.5 text-slate-500" /> {job.nextStep}
              {job.nextStepDate ? <span className="text-slate-500"> — {job.nextStepDate}</span> : null}
            </Row>
          )}
          {job.contactName && (
            <Row label="Contact">
              <User className="w-3.5 h-3.5 text-slate-500" /> {job.contactName}
              {job.contactEmail ? <span className="block font-mono"> <a href={`mailto:${job.contactEmail}`} className="text-green-400 hover:underline">{job.contactEmail}</a></span> : null}
            </Row>
          )}
          {job.postingUrl && (
            <Row label="Posting">
              <a href={job.postingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-400 hover:underline">
                Open posting <ExternalLink className="w-3 h-3" />
              </a>
            </Row>
          )}
          <div className="md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3" /> Notes
            </span>
            <p className="mt-1 text-slate-400 leading-relaxed whitespace-pre-wrap">{job.notes || "No notes yet."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">{label}</span>
      <div className="mt-1 flex items-center gap-1.5 text-slate-300">{children}</div>
    </div>
  );
}

const FIELD_LABEL = "block text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1.5";
const FIELD_INPUT =
  "w-full px-3 py-2 field text-sm text-slate-200 placeholder-slate-600";

function JobFormModal({
  editing,
  form,
  setForm,
  onClose,
  onSave,
}: {
  editing: boolean;
  form: JobApplication;
  setForm: React.Dispatch<React.SetStateAction<JobApplication>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (k: keyof JobApplication) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl panel rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-semibold text-slate-100">{editing ? "Edit application" : "Add application"}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 grid sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <label className="sm:col-span-1">
            <span className={FIELD_LABEL}>Company *</span>
            <input type="text" value={form.company} onChange={set("company")} placeholder="Acme Corp" className={FIELD_INPUT} />
          </label>
          <label className="sm:col-span-1">
            <span className={FIELD_LABEL}>Role *</span>
            <input type="text" value={form.role} onChange={set("role")} placeholder="Senior Software Engineer" className={FIELD_INPUT} />
          </label>
          <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
            <label>
              <span className={FIELD_LABEL}>Location</span>
              <input type="text" value={form.location} onChange={set("location")} placeholder="Remote / Berlin / Hybrid" className={FIELD_INPUT} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Salary range</span>
              <input type="text" value={form.salaryRange} onChange={set("salaryRange")} placeholder="$80k – $110k" className={FIELD_INPUT} />
            </label>
          </div>
          <label>
            <span className={FIELD_LABEL}>Posting URL</span>
            <input type="url" value={form.postingUrl} onChange={set("postingUrl")} placeholder="https://…" className={FIELD_INPUT} />
          </label>
          <label>
            <span className={FIELD_LABEL}>Status</span>
            <select value={form.status} onChange={set("status")} className={`${FIELD_INPUT} cursor-pointer`}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s} className="bg-[var(--surface-panel)]">
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={FIELD_LABEL}>Applied date</span>
            <input type="date" value={form.appliedDate} onChange={set("appliedDate")} className={FIELD_INPUT} />
          </label>
          <label>
            <span className={FIELD_LABEL}>Next step date</span>
            <input type="date" value={form.nextStepDate} onChange={set("nextStepDate")} className={FIELD_INPUT} />
          </label>
          <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
            <label>
              <span className={FIELD_LABEL}>Contact name</span>
              <input type="text" value={form.contactName} onChange={set("contactName")} placeholder="Jane Doe (recruiter)" className={FIELD_INPUT} />
            </label>
            <label>
              <span className={FIELD_LABEL}>Contact email</span>
              <input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="jane@acme.com" className={FIELD_INPUT} />
            </label>
          </div>
          <label className="sm:col-span-2">
            <span className={FIELD_LABEL}>Next step</span>
            <input type="text" value={form.nextStep} onChange={set("nextStep")} placeholder="e.g. Technical interview on Thu" className={FIELD_INPUT} />
          </label>
          <label className="sm:col-span-2">
            <span className={FIELD_LABEL}>Notes</span>
            <textarea value={form.notes} onChange={set("notes")} rows={4} placeholder="Recruiter chat went well… link, referral, prep notes…" className={`${FIELD_INPUT} resize-y font-mono`} />
          </label>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Saved automatically to this browser only.
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
            <button onClick={onSave} className="btn-prime px-5 py-2 text-sm">
              {editing ? "Save changes" : "Add application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}