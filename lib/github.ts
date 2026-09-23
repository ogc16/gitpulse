export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  html_url: string;
  has_license?: boolean;
  license?: { spdx_id: string } | null;
}

export interface DevTier {
  title: string;
  badge: string;
  color: string;
  desc: string;
}

export const MOCK_PROFILES: Record<string, { user: GitHubUser; repos: GitHubRepo[] }> = {
  ogc16: {
    user: {
      login: "ogc16",
      name: "Caleb Ngeno",
      avatar_url: "https://avatars.githubusercontent.com/u/89234123?v=4",
      html_url: "https://github.com/ogc16",
      bio: "Distributed systems engineer building high-concurrency microservices, video streaming platforms, and native mobile apps.",
      location: "Nairobi, Kenya",
      company: "@Streamz",
      blog: "https://github.com/ogc16/streamz",
      twitter_username: "ogc16_dev",
      public_repos: 24,
      public_gists: 8,
      followers: 184,
      following: 42,
      created_at: "2020-03-15T10:20:30Z",
    },
    repos: [
      { id: 101, name: "streamz", description: "Production-ready video streaming microservices architecture with transactional outbox, Stripe webhooks, PgBouncer, and native clients.", stargazers_count: 342, forks_count: 58, language: "TypeScript", updated_at: "2026-09-18T14:10:00Z", html_url: "https://github.com/ogc16/streamz", has_license: true },
      { id: 102, name: "distributed-rate-limiter", description: "High-throughput Redis-backed rate limiting middleware for Express and Next.js microservices.", stargazers_count: 128, forks_count: 19, language: "TypeScript", updated_at: "2026-08-22T09:00:00Z", html_url: "https://github.com/ogc16/distributed-rate-limiter", has_license: true },
      { id: 103, name: "streamz-ios", description: "Native iOS video streaming app built with SwiftUI, AVFoundation, and secure Keychain storage.", stargazers_count: 94, forks_count: 12, language: "Swift", updated_at: "2026-09-02T16:30:00Z", html_url: "https://github.com/ogc16/streamz-ios", has_license: true },
      { id: 104, name: "streamz-android", description: "Native Android video player built with Jetpack Compose, ExoPlayer, and Keystore AES encryption.", stargazers_count: 87, forks_count: 15, language: "Kotlin", updated_at: "2026-08-29T11:45:00Z", html_url: "https://github.com/ogc16/streamz-android", has_license: true },
      { id: 105, name: "outbox-event-worker", description: "Resilient asynchronous outbox event replay worker for PostgreSQL and Redis Pub/Sub.", stargazers_count: 65, forks_count: 8, language: "Go", updated_at: "2026-07-14T18:20:00Z", html_url: "https://github.com/ogc16/outbox-event-worker", has_license: false },
    ],
  },
  torvalds: {
    user: {
      login: "torvalds",
      name: "Linus Torvalds",
      avatar_url: "https://avatars.githubusercontent.com/u/1024025?v=4",
      html_url: "https://github.com/torvalds",
      bio: "Creator of Linux kernel and Git.",
      location: "Portland, OR",
      company: "Linux Foundation",
      blog: "https://kernel.org",
      twitter_username: null,
      public_repos: 7,
      public_gists: 0,
      followers: 215000,
      following: 0,
      created_at: "2011-09-03T15:26:52Z",
    },
    repos: [
      { id: 201, name: "linux", description: "Linux kernel source tree", stargazers_count: 172000, forks_count: 53000, language: "C", updated_at: "2026-09-20T02:00:00Z", html_url: "https://github.com/torvalds/linux", has_license: true },
      { id: 202, name: "pesconvert", description: "Embroidery file format conversion tool", stargazers_count: 420, forks_count: 85, language: "C", updated_at: "2025-04-12T10:00:00Z", html_url: "https://github.com/torvalds/pesconvert", has_license: true },
      { id: 203, name: "ucto", description: "Microcontroller code for dive computers", stargazers_count: 310, forks_count: 40, language: "C++", updated_at: "2024-11-01T08:15:00Z", html_url: "https://github.com/torvalds/ucto", has_license: false },
    ],
  },
  gaearon: {
    user: {
      login: "gaearon",
      name: "Dan Abramov",
      avatar_url: "https://avatars.githubusercontent.com/u/810438?v=4",
      html_url: "https://github.com/gaearon",
      bio: "Working on React. Building tools for human thought.",
      location: "London, UK",
      company: "@facebook",
      blog: "https://overreacted.io",
      twitter_username: "dan_abramov",
      public_repos: 260,
      public_gists: 75,
      followers: 86000,
      following: 172,
      created_at: "2011-05-25T18:18:31Z",
    },
    repos: [
      { id: 301, name: "redux", description: "Predictable state container for JavaScript apps", stargazers_count: 60500, forks_count: 15400, language: "TypeScript", updated_at: "2026-09-15T12:00:00Z", html_url: "https://github.com/gaearon/redux", has_license: true },
      { id: 302, name: "react-dnd", description: "Drag and Drop for React", stargazers_count: 20200, forks_count: 1800, language: "JavaScript", updated_at: "2026-06-10T14:00:00Z", html_url: "https://github.com/gaearon/react-dnd", has_license: true },
      { id: 303, name: "overreacted.io", description: "Personal blog source code", stargazers_count: 5400, forks_count: 720, language: "JavaScript", updated_at: "2026-08-01T09:30:00Z", html_url: "https://github.com/gaearon/overreacted.io", has_license: true },
    ],
  },
};

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Swift: "#f05138",
  Kotlin: "#7f52ff",
  Go: "#00add8",
  C: "#555555",
  "C++": "#f34b7d",
  Python: "#3572A5",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Other: "#8b949e",
};

export function calculateDeveloperTier(user: GitHubUser, repos: GitHubRepo[]): DevTier {
  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((acc, r) => acc + (r.forks_count || 0), 0);
  const followers = user.followers || 0;

  const score = totalStars * 3 + totalForks * 2 + followers * 1.5 + user.public_repos * 0.5;

  if (score > 100000) return { title: "Open Source Titan", badge: "Titan", color: "from-white to-green-300", desc: "Global influence on technology infrastructure" };
  if (score > 10000) return { title: "Ecosystem Leader", badge: "Leader", color: "from-green-400 to-green-600", desc: "Maintains widely adopted software frameworks" };
  if (score > 1000) return { title: "Core Architecture Maintainer", badge: "Architect", color: "from-green-500 to-green-700", desc: "High community adoption and solid engineering impact" };
  if (score > 100) return { title: "Active Open Source Contributor", badge: "Contributor", color: "from-green-600 to-green-800", desc: "Regularly ships code and maintains open tools" };
  return { title: "Emerging Developer", badge: "Developer", color: "from-slate-400 to-slate-600", desc: "Building personal projects and open repositories" };
}