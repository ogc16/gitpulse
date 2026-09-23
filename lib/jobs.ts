export type JobStatus = "wishlist" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  location: string;
  salaryRange: string;
  postingUrl: string;
  contactName: string;
  contactEmail: string;
  status: JobStatus;
  appliedDate: string;
  lastActivity: string;
  nextStep: string;
  nextStepDate: string;
  notes: string;
}

export const STATUS_ORDER: JobStatus[] = ["wishlist", "applied", "interviewing", "offer", "rejected", "withdrawn"];

export const STATUS_META: Record<JobStatus, { label: string; color: string; chip: string }> = {
  wishlist: {
    label: "Wishlist",
    color: "text-slate-300 border-slate-500/50 bg-slate-500/10",
    chip: "bg-slate-500/10 text-slate-300 border-slate-500/40",
  },
  applied: {
    label: "Applied",
    color: "text-green-300 border-green-400/50 bg-green-400/10",
    chip: "bg-green-400/10 text-green-300 border-green-400/40",
  },
  interviewing: {
    label: "Interviewing",
    color: "text-green-200 border-green-300/50 bg-green-300/10",
    chip: "bg-green-300/10 text-green-200 border-green-300/40",
  },
  offer: {
    label: "Offer",
    color: "text-white border-white/60 bg-white/10",
    chip: "bg-white/10 text-white border-white/50",
  },
  rejected: {
    label: "Rejected",
    color: "text-rose-300 border-rose-400/50 bg-rose-400/10",
    chip: "bg-rose-400/10 text-rose-300 border-rose-400/40",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "text-slate-400 border-slate-500/50 bg-slate-500/10",
    chip: "bg-slate-500/10 text-slate-400 border-slate-500/40",
  },
};

export const draftJob = (): JobApplication => {
  const today = todayISO();
  return {
    id: uid(),
    company: "",
    role: "",
    location: "",
    salaryRange: "",
    postingUrl: "",
    contactName: "",
    contactEmail: "",
    status: "wishlist",
    appliedDate: today,
    lastActivity: today,
    nextStep: "",
    nextStepDate: "",
    notes: "",
  };
};

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export const isValidJob = (j: JobApplication) => j.company.trim().length > 0 && j.role.trim().length > 0;

export function daysSince(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}

export interface JobStats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  rejected: number;
  responseRate: number | null;
  avgDaysToResponse: number | null;
  byStatus: Record<JobStatus, number>;
}

export function computeStats(apps: JobApplication[]): JobStats {
  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {} as Record<JobStatus, number>);

  let responded = 0;
  let responseDays = 0;
  let decided = 0;

  for (const a of apps) {
    byStatus[a.status]++;
    if (a.status === "interviewing" || a.status === "offer" || a.status === "rejected") {
      responded++;
      const d = daysSince(a.appliedDate);
      if (d !== null) {
        responseDays += d;
        decided++;
      }
    }
  }

  const active = byStatus.applied + byStatus.interviewing;

  return {
    total: apps.length,
    active,
    interviews: byStatus.interviewing,
    offers: byStatus.offer,
    rejected: byStatus.rejected,
    responseRate: apps.length > 0 ? Math.round((responded / apps.length) * 100) : null,
    avgDaysToResponse: decided > 0 ? Math.round(responseDays / decided) : null,
    byStatus,
  };
}

export function toCSV(apps: JobApplication[]): string {
  const header = [
    "Company",
    "Role",
    "Location",
    "Salary",
    "Status",
    "Applied",
    "Last Activity",
    "Posting URL",
    "Contact",
    "Contact Email",
    "Next Step",
    "Next Step Date",
    "Notes",
  ];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = apps.map((a) =>
    [a.company, a.role, a.location, a.salaryRange, STATUS_META[a.status].label, a.appliedDate, a.lastActivity, a.postingUrl, a.contactName, a.contactEmail, a.nextStep, a.nextStepDate, a.notes]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}