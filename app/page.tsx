"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Star,
  GitFork,
  BookOpen,
  Calendar,
  MapPin,
  Building,
  Link as LinkIcon,
  Code,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  Filter,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { MOCK_PROFILES, LANGUAGE_COLORS, calculateDeveloperTier } from "../lib/github";
import type { GitHubUser, GitHubRepo } from "../lib/github";
import CurismPanel, { ScanProgressState } from "../components/CurismPanel";
import Header from "../components/Header";
import { gradeColor } from "../lib/curism";
import type { ProfileCurism } from "../lib/curism";

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Page() {
  const [query, setQuery] = useState("ogc16");
  const [searchKey, setSearchKey] = useState("ogc16");
  const [userData, setUserData] = useState<GitHubUser | null>(null);
  const [reposData, setReposData] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  // Filtering & Sorting State
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [sortBy, setSortBy] = useState("stars"); // 'stars', 'forks', 'updated'

  // CURISMÂ© Scan State
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [scanProgress, setScanProgress] = useState<ScanProgressState | null>(null);
  const [curismData, setCurismData] = useState<ProfileCurism | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanTip, setScanTip] = useState<string | undefined>(undefined);

  const runScan = useCallback(async (username: string) => {
    if (!username.trim()) return;
    setScanState("scanning");
    setCurismData(null);
    setScanError(null);
    setScanTip(undefined);
    setScanProgress({ running: true, phase: "fetching", completed: 0, total: 0, current: null });

    const poll = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/scan/progress?user=${encodeURIComponent(username.trim())}`);
        const j = await r.json();
        setScanProgress(j);
      } catch {
        /* progress is best-effort */
      }
    }, 900);

    try {
      const res = await fetch(`/api/scan?user=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      if (res.ok && data.profile) {
        setCurismData(data.profile as ProfileCurism);
        setScanTip(data.tip);
        setScanProgress({ running: false, phase: "done", completed: data.profile.totalCount, total: data.profile.totalCount });
        setScanState("done");
        if (data.userData) {
          setUserData(data.userData as GitHubUser);
          setUsingMock(false);
        }
        if (Array.isArray(data.reposData) && data.reposData.length) {
          setReposData(data.reposData as GitHubRepo[]);
        }
      } else {
        setScanError((data?.error as string) ?? "Scan failed for an unknown reason.");
        setScanState("error");
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed â€” ensure the dev server / API route is reachable.");
      setScanState("error");
    } finally {
      window.clearInterval(poll);
    }
  }, []);

  useEffect(() => {
    if (searchKey) {
      void runScan(searchKey);
    }
  }, [searchKey, runScan]);

  useEffect(() => {
    let isMounted = true;

    async function fetchGitHubData() {
      if (!searchKey) return;
      setLoading(true);
      setError(null);
      setUsingMock(false);

      try {
        const userRes = await fetch(`https://api.github.com/users/${searchKey}`);

        if (userRes.status === 403 || userRes.status === 404) {
          throw new Error(userRes.status === 404 ? "User not found" : "Rate limit exceeded");
        }

        const userJson = (await userRes.json()) as GitHubUser;
        const reposRes = await fetch(`https://api.github.com/users/${searchKey}/repos?sort=updated&per_page=100`);
        const reposJson = (await reposRes.json()) as GitHubRepo[];

        if (isMounted) {
          setUserData(userJson);
          setReposData(Array.isArray(reposJson) ? reposJson : []);
        }
      } catch (err) {
        // Fallback to mock data if available
        const normalizedKey = searchKey.toLowerCase();
        if (MOCK_PROFILES[normalizedKey]) {
          if (isMounted) {
            setUserData(MOCK_PROFILES[normalizedKey].user);
            setReposData(MOCK_PROFILES[normalizedKey].repos);
            setUsingMock(true);
          }
        } else {
          if (isMounted) {
            setError(err instanceof Error ? err.message : "Failed to fetch GitHub profile");
            setUserData(null);
            setReposData([]);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchGitHubData();

    return () => {
      isMounted = false;
    };
  }, [searchKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchKey(query.trim());
    }
  };

  const languageStats = useMemo(() => {
    if (!reposData.length) return [];

    const langCounts: Record<string, number> = {};
    let totalWithLang = 0;

    reposData.forEach((repo) => {
      const lang = repo.language || "Other";
      langCounts[lang] = (langCounts[lang] || 0) + 1;
      totalWithLang++;
    });

    return Object.entries(langCounts)
      .map(([lang, count]) => ({
        name: lang,
        count,
        percentage: ((count / totalWithLang) * 100).toFixed(1),
        color: LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.Other,
      }))
      .sort((a, b) => b.count - a.count);
  }, [reposData]);

  const filteredRepos = useMemo(() => {
    return reposData
      .filter((repo) => selectedLanguage === "All" || repo.language === selectedLanguage)
      .sort((a, b) => {
        if (sortBy === "stars") return (b.stargazers_count || 0) - (a.stargazers_count || 0);
        if (sortBy === "forks") return (b.forks_count || 0) - (a.forks_count || 0);
        if (sortBy === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return 0;
      });
  }, [reposData, selectedLanguage, sortBy]);

  // Derived stats
  const totalStars = useMemo(() => reposData.reduce((acc, r) => acc + (r.stargazers_count || 0), 0), [reposData]);
  const totalForks = useMemo(() => reposData.reduce((acc, r) => acc + (r.forks_count || 0), 0), [reposData]);
  const licensedReposCount = useMemo(() => reposData.filter((r) => r.license || r.has_license).length, [reposData]);
  const devTier = useMemo(() => (userData ? calculateDeveloperTier(userData, reposData) : null), [userData, reposData]);

  const repoGrades = useMemo(() => {
    const map = new Map<string, string>();
    curismData?.repos.forEach((r) => map.set(r.name.toLowerCase(), r.grade));
    return map;
  }, [curismData]);

  return (
    <div className="min-h-screen text-slate-100 font-sans">
      {/* Top Header Navigation */}
      <Header active="scan" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search Bar & Sample Tags */}
        <section className="panel p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-green-500/[0.06] rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-5">
            <p className="micro inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
              Profile Intelligence Scanner
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GitHub username (e.g. ogc16, torvalds, gaearon)..."
                className="field rounded-xl pl-12 pr-28 py-3.5 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-prime absolute right-2 px-4 py-2 text-xs"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analyze"}
              </button>
            </div>
          </form>

          {/* Quick Tags */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="micro mr-1">Quick access</span>
            {["ogc16", "torvalds", "gaearon", "octocat"].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  setSearchKey(tag);
                }}
                className={`px-2.5 py-1 rounded-md border transition ${
                  searchKey.toLowerCase() === tag
                    ? "bg-green-500/10 text-green-300 border-green-500/30"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.07] hover:border-white/[0.14] hover:text-slate-200"
                }`}
              >
                @{tag}
              </button>
            ))}
          </div>
        </section>

        {/* Error / Fallback State */}
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{error}</p>
              <p className="text-xs text-rose-400/80">
                Try typing a valid GitHub handle or choose one of the pre-configured sample tags above.
              </p>
            </div>
          </div>
        )}

        {/* Mock Data Banner */}
        {usingMock && (
          <div className="p-3 bg-green-500/[0.05] border border-green-500/20 rounded-xl flex items-center justify-between text-green-300 text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span>
                Showing offline cached profile snapshot for <strong>@{userData?.login}</strong> due to rate limits or
                API constraints.
              </span>
            </div>
            <span className="px-2 py-0.5 bg-green-900/50 rounded border border-green-700/50 text-[10px] uppercase tracking-wider font-semibold">
              Cached Mode
            </span>
          </div>
        )}

        {/* CURISMÂ© Scan Panel */}
        <CurismPanel
          scanState={scanState}
          progress={scanProgress}
          curism={curismData}
          error={scanError}
          scanTip={scanTip}
          onRetry={() => void runScan(searchKey)}
        />

        {/* Dashboard Content */}
        {userData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Developer Overview Card */}
            <div className="space-y-6">
              <div className="panel p-6 space-y-6 relative overflow-hidden">
                {/* Header Avatar & Level Badge */}
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img
                      src={userData.avatar_url}
                      alt={userData.name || userData.login}
                      className="w-20 h-20 rounded-2xl border-2 border-slate-700 object-cover shadow-md"
                    />
                    <a
                      href={userData.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute -bottom-2 -right-2 p-1.5 bg-[var(--surface-panel)] border border-slate-700 rounded-lg text-slate-400 hover:text-green-400 transition"
                      title="View on GitHub"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {devTier && (
                    <div
                      className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${devTier.color} text-[#fff] font-bold text-xs shadow-lg flex items-center space-x-1`}
                    >
                      <span>{devTier.badge}</span>
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{userData.name || userData.login}</h1>
                  <p className="text-sm text-green-400 font-mono">@{userData.login}</p>
                  {userData.bio && (
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed italic bg-[var(--surface-deep)] p-3 rounded-lg border border-slate-800/60">
                      &quot;{userData.bio}&quot;
                    </p>
                  )}
                </div>

                {/* Open Source Rank Info */}
                {devTier && (
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Open Source Rank:</span>
                      <span className="font-semibold text-slate-200">{devTier.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{devTier.desc}</p>
                  </div>
                )}

                {/* Profile Details List */}
                <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-4">
                  {userData.company && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Building className="w-4 h-4 text-slate-500" />
                      <span>{userData.company}</span>
                    </div>
                  )}
                  {userData.location && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <span>{userData.location}</span>
                    </div>
                  )}
                  {userData.blog && (
                    <div className="flex items-center space-x-2 text-slate-400 truncate">
                      <LinkIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <a
                        href={userData.blog.startsWith("http") ? userData.blog : `https://${userData.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:underline truncate"
                      >
                        {userData.blog}
                      </a>
                    </div>
                  )}
                  {userData.twitter_username && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <XBrandIcon className="w-4 h-4 text-slate-500" />
                      <a
                        href={`https://twitter.com/${userData.twitter_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green-400"
                      >
                        @{userData.twitter_username}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      Joined{" "}
                      {new Date(userData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Follower Stats Grid */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-center">
                  <div className="p-3 panel-deep text-center">
                    <span className="text-lg font-bold text-slate-100 block num">{userData.followers.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Followers</span>
                  </div>
                  <div className="p-3 panel-deep text-center">
                    <span className="text-lg font-bold text-slate-100 block num">{userData.following.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Following</span>
                  </div>
                </div>
              </div>

              {/* Security & Code Health Indicators */}
              <div className="panel p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span>Code Health &amp; Safety Metrics</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between px-2.5 py-2 panel-deep">
                    <span className="text-slate-400">Open Source Licensing</span>
                    <span className="font-semibold text-green-400">
                      {reposData.length > 0 ? `${Math.round((licensedReposCount / reposData.length) * 100)}%` : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-2 panel-deep">
                    <span className="text-slate-400">Public Repositories</span>
                    <span className="font-semibold text-slate-200">{userData.public_repos}</span>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-2 panel-deep">
                    <span className="text-slate-400">Public Gists</span>
                    <span className="font-semibold text-slate-200">{userData.public_gists}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns: Insights & Repository Showcase */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Metrics Overview Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-5 panel">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Total Stars</span>
                    <Star className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-2xl font-bold text-white num">{totalStars.toLocaleString()}</span>
                  <span className="micro block mt-1.5">Across analyzed repositories</span>
                </div>

                <div className="p-5 panel">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Total Forks</span>
                    <GitFork className="w-4 h-4 text-slate-300" />
                  </div>
                  <span className="text-2xl font-bold text-white num">{totalForks.toLocaleString()}</span>
                  <span className="micro block mt-1.5">Community derivative projects</span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-5 panel">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Primary Tech</span>
                    <Code className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-2xl font-bold text-white truncate block num">{languageStats[0]?.name || "N/A"}</span>
                  <span className="micro block mt-1.5">Top language distribution</span>
                </div>
              </div>

              {/* Language Distribution Breakdown */}
              <div className="panel p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span>Language Ecosystem Distribution</span>
                </h3>

                {/* Distribution Multi-Color Bar */}
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  {languageStats.map((lang) => (
                    <div
                      key={lang.name}
                      style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                      className="h-full transition-all duration-500 hover:opacity-80"
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>

                {/* Legend Chips */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {languageStats.map((lang) => (
                    <div key={lang.name} className="flex items-center space-x-1.5 text-xs text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-slate-500 text-[11px]">({lang.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repositories Breakdown Section */}
              <div className="panel p-6 space-y-6">
                {/* Repos Header & Filtering Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-green-400" />
                    <h2 className="font-bold text-slate-100 text-base">Top Repositories</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 border border-white/[0.07] num">{filteredRepos.length}</span>
                  </div>

                  {/* Filter / Sort Controls */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Language Select */}
                    <div className="relative text-xs w-full sm:w-auto">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="field w-full sm:w-auto px-3 py-1.5 pr-8 appearance-none cursor-pointer"
                      >
                        <option value="All">All Languages</option>
                        {languageStats.map((l) => (
                          <option key={l.name} value={l.name}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>

                    {/* Sort Select */}
                    <div className="relative text-xs w-full sm:w-auto">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="field w-full sm:w-auto px-3 py-1.5 pr-8 appearance-none cursor-pointer"
                      >
                        <option value="stars">Sort by Stars</option>
                        <option value="forks">Sort by Forks</option>
                        <option value="updated">Sort by Updated</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Repos Grid */}
                {filteredRepos.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">No repositories matching selected filters.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRepos.slice(0, 8).map((repo) => (
                      <div
                        key={repo.id}
                        className="panel-deep p-4 ring-hover group flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-green-400 group-hover:underline flex items-center space-x-1.5 text-sm truncate"
                            >
                              <BookOpen className="w-4 h-4 flex-shrink-0 text-slate-500" />
                              <span className="truncate">{repo.name}</span>
                            </a>
                            {(repo.license || repo.has_license) && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-300 border border-green-500/25 rounded">
                                Licensed
                              </span>
                            )}
                            {repoGrades.get((repo.name || "").toLowerCase()) && (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold border rounded ${gradeColor(
                                  repoGrades.get((repo.name || "").toLowerCase()) as string,
                                )}`}
                                title="CURISMÂ© grade"
                              >
                                {repoGrades.get((repo.name || "").toLowerCase())}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed">
                            {repo.description || "No description provided."}
                          </p>
                        </div>

                        {/* Repo Footer Stats */}
                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-2.5 mt-2">
                          <div className="flex items-center space-x-3">
                            {repo.language && (
                              <div className="flex items-center space-x-1">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Other }}
                                />
                                <span className="text-slate-300">{repo.language}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 hover:text-green-400">
                              <Star className="w-3.5 h-3.5" />
                              <span>{repo.stargazers_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <GitFork className="w-3.5 h-3.5" />
                              <span>{repo.forks_count}</span>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-600">
                            {new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GitPulse Insights Â© 2026 â€¢ Built for high-visibility open-source profiles</span>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/ogc16/streamz" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
              View Architecture
            </a>
            <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition">
              GitHub REST Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}