"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type ResultRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  moduleId: string;
  moduleTitle: string;
  score: number;
  totalScenarios: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  speechScore: number;
  clarity: number;
  phraseology: number;
  durationSeconds: number;
  completedAt?: Timestamp;
};

export default function AdminResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");

  async function loadResults(showRefresh = false) {
    if (!user) return;
    if (showRefresh) setRefreshing(true);

    try {
      const currentUser = await getDoc(doc(db, "users", user.uid));
      if (currentUser.data()?.role !== "admin") {
        router.replace("/");
        return;
      }

      setAuthorized(true);
      const snap = await getDocs(collection(db, "results"));
      const loaded = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          userId: data.userId || "",
          userName: data.userName || "Student",
          userEmail: data.userEmail || "",
          moduleId: data.moduleId || "",
          moduleTitle: data.moduleTitle || "Untitled Module",
          score: typeof data.score === "number" ? data.score : 0,
          totalScenarios:
            typeof data.totalScenarios === "number" ? data.totalScenarios : 0,
          correctAnswers:
            typeof data.correctAnswers === "number" ? data.correctAnswers : 0,
          incorrectAnswers:
            typeof data.incorrectAnswers === "number"
              ? data.incorrectAnswers
              : 0,
          accuracy: typeof data.accuracy === "number" ? data.accuracy : 0,
          speechScore:
            typeof data.speechScore === "number" ? data.speechScore : 0,
          clarity: typeof data.clarity === "number" ? data.clarity : 0,
          phraseology:
            typeof data.phraseology === "number" ? data.phraseology : 0,
          durationSeconds:
            typeof data.durationSeconds === "number" ? data.durationSeconds : 0,
          completedAt: data.completedAt,
        } satisfies ResultRecord;
      });

      loaded.sort(
        (a, b) =>
          (b.completedAt?.toMillis?.() || 0) -
          (a.completedAt?.toMillis?.() || 0),
      );
      setResults(loaded);
      setError("");
    } catch (err) {
      console.error("Admin results error:", err);
      setError(
        "Unable to load results. Check your Firestore rules and admin role.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const modules = useMemo(() => {
    const map = new Map<string, string>();
    results.forEach((result) => map.set(result.moduleId, result.moduleTitle));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [results]);

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return results.filter((result) => {
      const completed = result.completedAt?.toDate?.() || null;
      const moduleMatches =
        moduleFilter === "all" || result.moduleId === moduleFilter;
      const fromMatches = !from || !completed || completed >= from;
      const toMatches = !to || !completed || completed <= to;
      return moduleMatches && fromMatches && toMatches;
    });
  }, [results, moduleFilter, fromDate, toDate]);

  const averageScore = filtered.length
    ? Math.round(
        filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length,
      )
    : 0;
  const averageClarity = filtered.length
    ? Math.round(
        filtered.reduce((sum, item) => sum + item.clarity, 0) / filtered.length,
      )
    : 0;
  const averagePhraseology = filtered.length
    ? Math.round(
        filtered.reduce((sum, item) => sum + item.phraseology, 0) /
          filtered.length,
      )
    : 0;

  const moduleChart = useMemo(() => {
    const map = new Map<
      string,
      { title: string; total: number; count: number }
    >();
    filtered.forEach((item) => {
      const existing = map.get(item.moduleId) || {
        title: item.moduleTitle,
        total: 0,
        count: 0,
      };
      existing.total += item.score;
      existing.count += 1;
      map.set(item.moduleId, existing);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        average: Math.round(item.total / item.count),
      }))
      .sort((a, b) => b.average - a.average);
  }, [filtered]);

  const scoreBuckets = useMemo(
    () =>
      [
        { label: "0–59", min: 0, max: 59 },
        { label: "60–69", min: 60, max: 69 },
        { label: "70–79", min: 70, max: 79 },
        { label: "80–89", min: 80, max: 89 },
        { label: "90–100", min: 90, max: 100 },
      ].map((bucket) => ({
        ...bucket,
        count: filtered.filter(
          (item) => item.score >= bucket.min && item.score <= bucket.max,
        ).length,
      })),
    [filtered],
  );

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading reports...
        </div>
      </Shell>
    );
  }

  if (!authorized) return null;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#1478bd]"
          >
            <ArrowLeft size={15} /> Admin Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-[#062b4f]">
            Results & Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter completed module submissions and review performance trends.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadResults(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#1478bd] shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-[#062b4f]">
          <Filter size={16} className="text-[#1478bd]" /> Filters
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600">
            Module
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-[#168dcc]"
            >
              <option value="all">All modules</option>
              {modules.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            From date
            <div className="relative mt-2">
              <CalendarDays
                size={15}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-normal text-slate-700 outline-none focus:border-[#168dcc]"
              />
            </div>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            To date
            <div className="relative mt-2">
              <CalendarDays
                size={15}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-normal text-slate-700 outline-none focus:border-[#168dcc]"
              />
            </div>
          </label>
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Submissions" value={filtered.length} />
        <Metric label="Average Score" value={`${averageScore}%`} />
        <Metric label="Average Clarity" value={`${averageClarity}%`} />
        <Metric label="Average Phraseology" value={`${averagePhraseology}%`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Average Score by Module">
          {moduleChart.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              {moduleChart.map((item) => (
                <BarRow
                  key={item.title}
                  label={item.title}
                  value={item.average}
                  suffix="%"
                />
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Score Distribution">
          {filtered.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              {scoreBuckets.map((item) => (
                <BarRow
                  key={item.label}
                  label={item.label}
                  value={item.count}
                  max={Math.max(
                    ...scoreBuckets.map((bucket) => bucket.count),
                    1,
                  )}
                  suffix={` ${item.count === 1 ? "submission" : "submissions"}`}
                />
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 size={17} className="text-[#1478bd]" />
          <h2 className="text-base font-bold text-[#062b4f]">
            Completed Results
          </h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Module</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Accuracy</th>
                <th className="px-3 py-3">Clarity</th>
                <th className="px-3 py-3">Phraseology</th>
                <th className="px-3 py-3">Scenarios</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#173b5e]">
                      {item.userName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {item.userEmail}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.moduleTitle}
                  </td>
                  <td className="px-3 py-3 font-bold text-[#1478bd]">
                    {item.score}%
                  </td>
                  <td className="px-3 py-3">{item.accuracy}%</td>
                  <td className="px-3 py-3">{item.clarity}%</td>
                  <td className="px-3 py-3">{item.phraseology}%</td>
                  <td className="px-3 py-3">
                    {item.correctAnswers}/{item.totalScenarios}
                  </td>
                  <td className="px-3 py-3">
                    {formatDuration(item.durationSeconds)}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {formatDate(item.completedAt)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-12 text-center text-slate-400"
                  >
                    No results match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />
      <div className="ml-[230px] min-h-screen">
        <Topbar />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[#062b4f]">{value}</p>
    </div>
  );
}
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#062b4f]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function BarRow({
  label,
  value,
  max = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
}) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-slate-600">{label}</span>
        <span className="font-bold text-[#1478bd]">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#168dcc]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
function Empty() {
  return (
    <div className="rounded-lg bg-slate-50 p-8 text-center text-xs text-slate-400">
      No data available for the selected filters.
    </div>
  );
}
function formatDate(value?: Timestamp) {
  if (!value?.toDate) return "—";
  return value.toDate().toLocaleString();
}
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
}
