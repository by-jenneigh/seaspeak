"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, BookOpen, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type ResultRecord = {
  userId: string;
  userName: string;
  moduleId: string;
  moduleTitle: string;
  score: number;
  accuracy: number;
  completedAt?: Timestamp;
};

export default function StudentDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("Student");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;

    async function loadDashboard() {
      try {
        setError("");

        /*
         * Use the authenticated user's display name first.
         * Falls back to email if no display name is available.
         */
        setStudentName(
          currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Student",
        );

        /*
         * IMPORTANT:
         * Only retrieve results belonging to the currently
         * authenticated student.
         */
        const resultsQuery = query(
          collection(db, "results"),
          where("userId", "==", currentUser.uid),
        );

        const resultsSnap = await getDocs(resultsQuery);

        const studentResults: ResultRecord[] = resultsSnap.docs.map((item) => {
          const data = item.data();

          return {
            userId: data.userId || currentUser.uid,
            userName:
              data.userName ||
              currentUser.displayName ||
              currentUser.email?.split("@")[0] ||
              "Student",
            moduleId: data.moduleId || "",
            moduleTitle: data.moduleTitle || "Untitled Module",
            score: typeof data.score === "number" ? data.score : 0,
            accuracy: typeof data.accuracy === "number" ? data.accuracy : 0,
            completedAt: data.completedAt,
          };
        });

        setResults(studentResults);
      } catch (err) {
        console.error("Student dashboard error:", err);

        setError(
          "Unable to load your dashboard. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [authLoading, router, user]);

  if (authLoading || loading) {
    return (
      <StudentShell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading your dashboard...
        </div>
      </StudentShell>
    );
  }

  if (!user) return null;

  /*
   * Calculate statistics using ONLY this student's results.
   */
  const totalSubmissions = results.length;

  const averageScore = totalSubmissions
    ? Math.round(
        results.reduce((sum, result) => sum + result.score, 0) /
          totalSubmissions,
      )
    : 0;

  const averageAccuracy = totalSubmissions
    ? Math.round(
        results.reduce((sum, result) => sum + result.accuracy, 0) /
          totalSubmissions,
      )
    : 0;

  /*
   * Number of unique modules the student has completed.
   */
  const completedModules = new Set(
    results.map((result) => result.moduleId).filter(Boolean),
  ).size;

  /*
   * Most recent attempts.
   */
  const recentResults = [...results]
    .sort(
      (a, b) =>
        (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0),
    )
    .slice(0, 5);

  /*
   * Latest result can be useful for the "latest performance"
   * card/message.
   */
  const latestResult = recentResults[0];

  return (
    <StudentShell>
      {/* Header */}
      <div className="mb-7">
        <p className="mt-1 text-sm text-slate-500">
          Track your SEASPEAK learning progress and communication performance.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen size={19} />}
          label="Modules Completed"
          value={completedModules}
        />

        <StatCard
          icon={<BarChart3 size={19} />}
          label="Total Attempts"
          value={totalSubmissions}
        />

        <StatCard
          icon={<Trophy size={19} />}
          label="Average Score"
          value={`${averageScore}%`}
        />

        <StatCard
          icon={<Target size={19} />}
          label="Average Accuracy"
          value={`${averageAccuracy}%`}
        />
      </div>

      {/* Main content */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent Results */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#062b4f]">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Your latest completed module attempts.
              </p>
            </div>

            <Link
              href="/modules"
              className="flex items-center gap-1 text-xs font-semibold text-[#1478bd] hover:underline"
            >
              View Modules
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3">Module</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Accuracy</th>
                  <th className="px-3 py-3">Completed</th>
                </tr>
              </thead>

              <tbody>
                {recentResults.map((result, index) => (
                  <tr
                    key={`${result.moduleId}-${index}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#173b5e]">
                        {result.moduleTitle}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="font-bold text-[#1478bd]">
                        {result.score}%
                      </span>
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {result.accuracy}%
                    </td>

                    <td className="px-3 py-3 text-slate-500">
                      {formatDate(result.completedAt)}
                    </td>
                  </tr>
                ))}

                {recentResults.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center">
                      <div className="flex flex-col items-center">
                        <BookOpen size={28} className="text-slate-300" />

                        <p className="mt-3 font-semibold text-slate-500">
                          No completed modules yet.
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Start a module to begin tracking your progress.
                        </p>

                        <Link
                          href="/modules"
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#062b4f]"
                        >
                          Explore Modules
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Learning Summary */}
        <section className="rounded-xl border border-[#c8e3f5] bg-[#e6f3fb] p-6">
          <h2 className="text-base font-bold text-[#062b4f]">Your Learning</h2>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Continue practicing Maritime English communication through
            interactive SMCP modules and simulation scenarios.
          </p>

          {/* Latest performance */}
          {latestResult ? (
            <div className="mt-5 rounded-lg border border-white/80 bg-white/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Latest Result
              </p>

              <p className="mt-1 text-sm font-bold text-[#062b4f]">
                {latestResult.moduleTitle}
              </p>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Score
                  </p>

                  <p className="text-2xl font-bold text-[#1478bd]">
                    {latestResult.score}%
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Accuracy
                  </p>

                  <p className="text-lg font-bold text-[#062b4f]">
                    {latestResult.accuracy}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-white/80 bg-white/70 p-4">
              <p className="text-xs leading-5 text-slate-500">
                Complete your first module to see your performance results here.
              </p>
            </div>
          )}

          <Link
            href="/modules"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#062b4f]"
          >
            Continue Learning
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </StudentShell>
  );
}

function StudentShell({ children }: { children: React.ReactNode }) {
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f3fb] text-[#1478bd]">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-[#062b4f]">{value}</p>
    </div>
  );
}

function formatDate(value?: Timestamp) {
  if (!value?.toDate) return "—";

  return value.toDate().toLocaleString();
}
