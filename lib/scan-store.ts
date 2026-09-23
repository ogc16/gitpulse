import { ProfileCurism } from "./curism";

export interface ScanProgress {
  user: string;
  phase: "fetching" | "analyzing" | "done" | "error";
  completed: number;
  total: number;
  current: string | null;
  limit: number;
}

interface ScanEntry {
  progress: ScanProgress | null;
  cachedAt: number;
  data: ScanResult | null;
}

export interface ScanResult {
  cached: boolean;
  mode?: "api" | "html";
  profile: ProfileCurism;
  userData: unknown;
  reposData: unknown;
  tip?: string;
}

const store = new Map<string, ScanEntry>();
const TTL = 15 * 60 * 1000;

export function getScan(user: string): ScanEntry {
  const key = user.toLowerCase();
  let entry = store.get(key);
  if (!entry) {
    entry = { progress: null, cachedAt: 0, data: null };
    store.set(key, entry);
  }
  return entry;
}

export function getFreshScan(user: string): ScanResult | null {
  const entry = getScan(user);
  if (entry.data && Date.now() - entry.cachedAt < TTL) return entry.data;
  return null;
}

export function setScanResult(user: string, data: ScanResult) {
  const entry = getScan(user);
  entry.data = data;
  entry.cachedAt = Date.now();
  entry.progress = null;
}

export function setProgress(user: string, progress: ScanProgress) {
  getScan(user).progress = progress;
}

export function getProgress(user: string): ScanProgress | null {
  return getScan(user).progress;
}

export function clearScan(user: string) {
  store.delete(user.toLowerCase());
}