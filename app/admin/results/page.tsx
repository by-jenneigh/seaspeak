"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const SCORE_COLORS = ["#94a3b8", "#60a5fa", "#38bdf8", "#168dcc", "#062b4f"];

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

    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      /*
       * Verify that the currently authenticated user
       * has an admin role.
       */
      const currentUser = await getDoc(doc(db, "users", user.uid));

      if (currentUser.data()?.role !== "admin") {
        router.replace("/");
        return;
      }

      setAuthorized(true);

      /*
       * Admins can load all completed results.
       */
      const snap = await getDocs(collection(db, "results"));

      const loaded: ResultRecord[] = snap.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,

          userId: typeof data.userId === "string" ? data.userId : "",

          userName:
            typeof data.userName === "string" ? data.userName : "Student",

          userEmail: typeof data.userEmail === "string" ? data.userEmail : "",

          moduleId: typeof data.moduleId === "string" ? data.moduleId : "",

          moduleTitle:
            typeof data.moduleTitle === "string"
              ? data.moduleTitle
              : "Untitled Module",

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

          completedAt:
            data.completedAt instanceof Timestamp
              ? data.completedAt
              : undefined,
        };
      });

      /*
       * Sort newest submissions first.
       */
      loaded.sort(
        (a, b) =>
          (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0),
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

    // loadResults intentionally depends on the current authenticated user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /*
   * Build the module filter list from the loaded results.
   */
  const modules = useMemo(() => {
    const map = new Map<string, string>();

    results.forEach((result) => {
      if (result.moduleId) {
        map.set(result.moduleId, result.moduleTitle);
      }
    });

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [results]);

  /*
   * Apply module and date filters.
   */
  const filtered = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return results.filter((result) => {
      const completed = result.completedAt?.toDate() ?? null;

      const moduleMatches =
        moduleFilter === "all" || result.moduleId === moduleFilter;

      const fromMatches = !from || !completed || completed >= from;

      const toMatches = !to || !completed || completed <= to;

      return moduleMatches && fromMatches && toMatches;
    });
  }, [results, moduleFilter, fromDate, toDate]);

  /*
   * Summary metrics.
   */
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

  /*
   * Average score by module.
   */
  const moduleChart = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        total: number;
        count: number;
      }
    >();

    filtered.forEach((item) => {
      const existing = map.get(item.moduleId) ?? {
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
        module: item.title,
        average: item.count > 0 ? Math.round(item.total / item.count) : 0,
      }))
      .sort((a, b) => b.average - a.average);
  }, [filtered]);

  /*
   * Score distribution for the pie chart.
   */
  const scoreDistribution = useMemo(() => {
    const buckets = [
      {
        name: "0–59",
        min: 0,
        max: 59,
      },
      {
        name: "60–69",
        min: 60,
        max: 69,
      },
      {
        name: "70–79",
        min: 70,
        max: 79,
      },
      {
        name: "80–89",
        min: 80,
        max: 89,
      },
      {
        name: "90–100",
        min: 90,
        max: 100,
      },
    ];

    return buckets.map((bucket) => ({
      name: bucket.name,
      value: filtered.filter(
        (item) => item.score >= bucket.min && item.score <= bucket.max,
      ).length,
    }));
  }, [filtered]);

  /*
   * Clarity vs phraseology by module.
   */
  const communicationChart = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        clarityTotal: number;
        phraseologyTotal: number;
        count: number;
      }
    >();

    filtered.forEach((item) => {
      const existing = map.get(item.moduleId) ?? {
        title: item.moduleTitle,
        clarityTotal: 0,
        phraseologyTotal: 0,
        count: 0,
      };

      existing.clarityTotal += item.clarity;
      existing.phraseologyTotal += item.phraseology;
      existing.count += 1;

      map.set(item.moduleId, existing);
    });

    return Array.from(map.values()).map((item) => ({
      module: item.title,

      clarity: item.count > 0 ? Math.round(item.clarityTotal / item.count) : 0,

      phraseology:
        item.count > 0 ? Math.round(item.phraseologyTotal / item.count) : 0,
    }));
  }, [filtered]);

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading reports...
        </div>
      </Shell>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#1478bd]"
          >
            <ArrowLeft size={15} />
            Admin Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-[#062b4f]">
            Results & Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Filter completed module submissions and review student performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadResults(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#1478bd] shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-[#062b4f]">
          <Filter size={16} className="text-[#1478bd]" />
          Filters
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* Module */}
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

          {/* From date */}
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

          {/* To date */}
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

      {/* Metrics */}
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Submissions" value={filtered.length} />

        <Metric label="Average Score" value={`${averageScore}%`} />

        <Metric label="Average Clarity" value={`${averageClarity}%`} />

        <Metric label="Average Phraseology" value={`${averagePhraseology}%`} />
      </div>

      {/* Main Charts */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Average score by module */}
        <ChartCard title="Average Score by Module">
          {moduleChart.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleChart}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 0,
                    bottom: 55,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis
                    dataKey="module"
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <Tooltip
                    formatter={(value) => [`${value}%`, "Average Score"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />

                  <Bar
                    dataKey="average"
                    name="Average Score"
                    fill="#168dcc"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Score distribution */}
        <ChartCard title="Score Distribution">
          {filtered.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="#ffffff"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent !== undefined && percent > 0
                        ? `${name} ${(percent * 100).toFixed(0)}%`
                        : ""
                    }
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell
                        key={`score-cell-${entry.name}`}
                        fill={SCORE_COLORS[index] ?? "#168dcc"}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => [
                      `${value} ${
                        Number(value) === 1 ? "submission" : "submissions"
                      }`,
                      "Results",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Communication Performance */}
      <div className="mt-5">
        <ChartCard title="Clarity vs Phraseology by Module">
          {communicationChart.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={communicationChart}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 0,
                    bottom: 55,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis
                    dataKey="module"
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <Tooltip
                    formatter={(value, name) => [`${value}%`, name]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />

                  <Legend />

                  <Bar
                    dataKey="clarity"
                    name="Clarity"
                    fill="#168dcc"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="phraseology"
                    name="Phraseology"
                    fill="#062b4f"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Completed Results */}
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

/* -----------------------------------------
   Page Shell
----------------------------------------- */

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

/* -----------------------------------------
   Metric Card
----------------------------------------- */

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

/* -----------------------------------------
   Chart Card
----------------------------------------- */

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

      <div className="mt-4">{children}</div>
    </section>
  );
}

/* -----------------------------------------
   Empty Chart State
----------------------------------------- */

function Empty() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-slate-50 p-8 text-center text-xs text-slate-400">
      No data available for the selected filters.
    </div>
  );
}

/* -----------------------------------------
   Date Formatting
----------------------------------------- */

function formatDate(value?: Timestamp) {
  if (!value?.toDate) {
    return "—";
  }

  return value.toDate().toLocaleString();
}

/* -----------------------------------------
   Duration Formatting
----------------------------------------- */

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
}
