"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ShieldCheck,
  Users,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
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

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    async function loadDashboard() {
      try {
        const currentUser = await getDoc(doc(db, "users", user.uid));

        if (currentUser.data()?.role !== "admin") {
          router.replace("/");
          return;
        }

        setAuthorized(true);

        const resultsSnap = await getDocs(collection(db, "results"));
        setResults(
          resultsSnap.docs.map((item) => {
            const data = item.data();
            return {
              userId: data.userId || "",
              userName: data.userName || "Student",
              moduleId: data.moduleId || "",
              moduleTitle: data.moduleTitle || "Untitled Module",
              score: typeof data.score === "number" ? data.score : 0,
              accuracy: typeof data.accuracy === "number" ? data.accuracy : 0,
              completedAt: data.completedAt,
            };
          }),
        );
      } catch (err) {
        console.error("Admin dashboard error:", err);
        setError(
          "Unable to load admin data. Check your Firestore rules and admin role.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [authLoading, router, user]);

  if (authLoading || loading) {
    return (
      <AdminShell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading admin dashboard...
        </div>
      </AdminShell>
    );
  }

  if (!authorized) return null;

  const uniqueStudents = new Set(results.map((result) => result.userId)).size;
  const averageScore = results.length
    ? Math.round(
        results.reduce((sum, result) => sum + result.score, 0) / results.length,
      )
    : 0;
  const averageAccuracy = results.length
    ? Math.round(
        results.reduce((sum, result) => sum + result.accuracy, 0) /
          results.length,
      )
    : 0;
  const recent = [...results]
    .sort(
      (a, b) =>
        (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0),
    )
    .slice(0, 5);

  return (
    <AdminShell>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-[#1478bd]">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#062b4f]">
          SEASPEAK Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor completed module results and student performance.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Users size={19} />}
          label="Students"
          value={uniqueStudents}
        />
        <StatCard
          icon={<BookOpen size={19} />}
          label="Submissions"
          value={results.length}
        />
        <StatCard
          icon={<BarChart3 size={19} />}
          label="Average Score"
          value={`${averageScore}%`}
        />
        <StatCard
          icon={<ShieldCheck size={19} />}
          label="Average Accuracy"
          value={`${averageAccuracy}%`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#062b4f]">
                Recent Submissions
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Latest completed module results.
              </p>
            </div>
            <Link
              href="/admin/results"
              className="flex items-center gap-1 text-xs font-semibold text-[#1478bd] hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Module</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Accuracy</th>
                  <th className="px-3 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((result, index) => (
                  <tr
                    key={`${result.userId}-${result.moduleId}-${index}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-semibold text-[#173b5e]">
                      {result.userName}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {result.moduleTitle}
                    </td>
                    <td className="px-3 py-3 font-bold text-[#1478bd]">
                      {result.score}%
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {result.accuracy}%
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {formatDate(result.completedAt)}
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-slate-400"
                    >
                      No module submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-[#c8e3f5] bg-[#e6f3fb] p-6">
          <h2 className="text-base font-bold text-[#062b4f]">Reports</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Filter submissions by date and module, then review performance
            graphs and individual results.
          </p>
          <Link
            href="/admin/results"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#062b4f]"
          >
            Open Results & Reports <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
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
