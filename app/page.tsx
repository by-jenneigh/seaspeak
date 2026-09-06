"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type Module = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  order?: number;
  published?: boolean;
};

type Progress = {
  id: string;
  moduleId: string;
  completedScenarioIds: string[];
  completedScenarios: number;
  totalScenarios: number;
  progressPercent: number;
  currentScenarioIndex: number;
  lastScenarioId?: string;
  updatedAt?: Timestamp | null;
};

type Attempt = {
  id: string;
  moduleId: string;
  scenarioId: string;
  selectedOptionId?: string;
  isCorrect?: boolean;
  transcript?: string;
  score?: number;
  clarity?: number;
  phraseology?: number;
  feedback?: string;
  completedAt?: Timestamp | null;
};

type RecentActivity = Attempt & {
  moduleTitle: string;
};

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = user?.displayName || "Cadet";

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [user, authLoading]);

  async function loadDashboard() {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      /*
       * ---------------------------------------------------------
       * Load published modules
       * ---------------------------------------------------------
       */
      const modulesQuery = query(
        collection(db, "modules"),
        where("published", "==", true),
      );

      const modulesSnapshot = await getDocs(modulesQuery);

      const moduleData: Module[] = modulesSnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
            title: data.title || "Untitled Module",
            description: data.description || "",
            type: data.type || "",
            order: typeof data.order === "number" ? data.order : 0,
            published: data.published !== false,
          };
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      /*
       * ---------------------------------------------------------
       * Load user's module progress
       *
       * users/{uid}/progress/{moduleId}
       * ---------------------------------------------------------
       */
      const progressSnapshot = await getDocs(
        collection(db, "users", user.uid, "progress"),
      );

      const progressData: Progress[] = progressSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          moduleId: data.moduleId || docSnap.id,
          completedScenarioIds: Array.isArray(data.completedScenarioIds)
            ? data.completedScenarioIds
            : [],
          completedScenarios:
            typeof data.completedScenarios === "number"
              ? data.completedScenarios
              : 0,
          totalScenarios:
            typeof data.totalScenarios === "number" ? data.totalScenarios : 0,
          progressPercent:
            typeof data.progressPercent === "number" ? data.progressPercent : 0,
          currentScenarioIndex:
            typeof data.currentScenarioIndex === "number"
              ? data.currentScenarioIndex
              : 0,
          lastScenarioId: data.lastScenarioId || "",
          updatedAt: data.updatedAt || null,
        };
      });

      /*
       * ---------------------------------------------------------
       * Load user's simulation attempts
       *
       * users/{uid}/attempts/{attemptId}
       * ---------------------------------------------------------
       */
      const attemptsSnapshot = await getDocs(
        collection(db, "users", user.uid, "attempts"),
      );

      const attemptsData: Attempt[] = attemptsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          moduleId: data.moduleId || "",
          scenarioId: data.scenarioId || "",
          selectedOptionId: data.selectedOptionId || "",
          isCorrect: data.isCorrect === true,
          transcript: data.transcript || "",
          score: typeof data.score === "number" ? data.score : undefined,
          clarity: typeof data.clarity === "number" ? data.clarity : undefined,
          phraseology:
            typeof data.phraseology === "number" ? data.phraseology : undefined,
          feedback: data.feedback || "",
          completedAt: data.completedAt || null,
        };
      });

      setModules(moduleData);
      setProgress(progressData);
      setAttempts(attemptsData);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * Dashboard calculations
   * ---------------------------------------------------------
   */

  const totalModules = modules.length;

  const completedModules = modules.filter((module) => {
    const moduleProgress = progress.find((item) => item.moduleId === module.id);

    return moduleProgress?.progressPercent === 100;
  }).length;

  /*
   * Overall progress is calculated from all completed scenarios
   * versus all available scenarios.
   */
  const totalScenarios = progress.reduce(
    (total, item) => total + item.totalScenarios,
    0,
  );

  const completedScenarios = progress.reduce(
    (total, item) => total + item.completedScenarios,
    0,
  );

  const overallProgress =
    totalScenarios > 0
      ? Math.round((completedScenarios / totalScenarios) * 100)
      : 0;

  /*
   * Average score from all AI-evaluated attempts.
   */
  const scoredAttempts = attempts.filter(
    (attempt) => typeof attempt.score === "number",
  );

  const averageScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce(
            (total, attempt) => total + (attempt.score || 0),
            0,
          ) / scoredAttempts.length,
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * Continue Learning
   *
   * Priority:
   * 1. Module with the most recent progress
   * 2. First incomplete module
   * 3. First module
   * ---------------------------------------------------------
   */
  const continueModule = getContinueModule(modules, progress);

  const continueProgress = continueModule
    ? progress.find((item) => item.moduleId === continueModule.id)
    : undefined;

  /*
   * ---------------------------------------------------------
   * Recent Activity
   * ---------------------------------------------------------
   */
  const recentActivities: RecentActivity[] = [...attempts]
    .sort((a, b) => {
      const aTime = getTimestampMillis(a.completedAt);
      const bTime = getTimestampMillis(b.completedAt);

      return bTime - aTime;
    })
    .slice(0, 5)
    .map((attempt) => ({
      ...attempt,
      moduleTitle:
        modules.find((module) => module.id === attempt.moduleId)?.title ||
        "Simulation",
    }));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            {/* -------------------------------------------------
                Welcome
            -------------------------------------------------- */}
            <section className="mb-7">
              <h1 className="text-2xl font-bold text-[#062b4f]">
                Welcome back, {authLoading || loading ? "..." : displayName} 👋
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Keep learning. Keep improving.
              </p>
            </section>

            {/* -------------------------------------------------
                Error
            -------------------------------------------------- */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                <p className="font-semibold">Unable to load dashboard</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {/* -------------------------------------------------
                Stats
            -------------------------------------------------- */}
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Overall Progress"
                value={loading ? "..." : `${overallProgress}%`}
                description={
                  loading
                    ? "Loading..."
                    : overallProgress === 100
                      ? "All scenarios completed!"
                      : "Keep it up!"
                }
                icon={<Target size={20} />}
              />

              <StatCard
                title="Modules Completed"
                value={
                  loading ? "..." : `${completedModules} / ${totalModules}`
                }
                description={
                  loading
                    ? "Loading..."
                    : completedModules === totalModules && totalModules > 0
                      ? "All modules completed!"
                      : "Keep going"
                }
                icon={<BookOpen size={20} />}
              />

              <StatCard
                title="Simulations Taken"
                value={loading ? "..." : `${attempts.length}`}
                description={
                  loading
                    ? "Loading..."
                    : attempts.length === 1
                      ? "1 attempt recorded"
                      : `${attempts.length} attempts recorded`
                }
                icon={<Clock3 size={20} />}
              />

              <StatCard
                title="Average Score"
                value={loading ? "..." : `${averageScore}%`}
                description={
                  loading
                    ? "Loading..."
                    : scoredAttempts.length === 0
                      ? "No scores yet"
                      : averageScore >= 80
                        ? "Good performance!"
                        : averageScore >= 60
                          ? "Room to improve"
                          : "Keep practicing"
                }
                icon={<Award size={20} />}
              />
            </section>

            {/* -------------------------------------------------
                Continue Learning
            -------------------------------------------------- */}
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#062b4f]">
                  Continue Learning
                </h2>

                <Link
                  href="/modules"
                  className="text-sm font-semibold text-[#1478bd] hover:underline"
                >
                  View Modules
                </Link>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="p-10 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#168dcc]" />

                    <p className="mt-4 text-sm text-slate-500">
                      Loading your progress...
                    </p>
                  </div>
                ) : continueModule ? (
                  <div className="grid md:grid-cols-[280px_1fr]">
                    {/* Module visual */}
                    <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[#0b4778] to-[#168dcc] text-white md:h-full">
                      <div className="text-center">
                        <span className="text-6xl">
                          {getModuleIcon(continueModule)}
                        </span>

                        <p className="mt-2 text-sm font-semibold">
                          {continueModule.title}
                        </p>
                      </div>
                    </div>

                    {/* Module information */}
                    <div className="p-7">
                      <div className="flex h-full flex-col justify-center">
                        <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#168dcc]">
                          {getModuleLabel(continueModule, modules)}
                        </span>

                        <h3 className="text-xl font-bold text-[#062b4f]">
                          {continueModule.title}
                        </h3>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                          {continueModule.description ||
                            "Practice standard maritime communication through interactive simulation scenarios."}
                        </p>

                        {/* Progress */}
                        <div className="mt-5">
                          <div className="mb-2 flex justify-between text-xs font-medium">
                            <span className="text-slate-500">Progress</span>

                            <span className="text-[#1478bd]">
                              {continueProgress?.progressPercent || 0}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#168dcc] transition-all"
                              style={{
                                width: `${
                                  continueProgress?.progressPercent || 0
                                }%`,
                              }}
                            />
                          </div>

                          {continueProgress && (
                            <p className="mt-2 text-xs text-slate-400">
                              {continueProgress.completedScenarios} of{" "}
                              {continueProgress.totalScenarios} scenarios
                              completed
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/simulation?moduleId=${encodeURIComponent(
                            continueModule.id,
                          )}`}
                          className="mt-6 flex w-fit items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062b4f]"
                        >
                          {continueProgress?.progressPercent === 100
                            ? "Review Module"
                            : "Continue"}

                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <BookOpen className="mx-auto text-slate-300" size={42} />

                    <h3 className="mt-4 text-lg font-bold text-[#062b4f]">
                      No modules available
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Published training modules will appear here.
                    </p>

                    <Link
                      href="/modules"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062b4f]"
                    >
                      View Modules
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* -------------------------------------------------
                Recent Activity
            -------------------------------------------------- */}
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#062b4f]">
                  Recent Activity
                </h2>

                <Link
                  href="/modules"
                  className="text-sm font-semibold text-[#1478bd] hover:underline"
                >
                  View Modules
                </Link>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Loading recent activity...
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="p-10 text-center">
                    <Clock3 className="mx-auto text-slate-300" size={40} />

                    <h3 className="mt-4 text-sm font-bold text-[#062b4f]">
                      No simulation activity yet
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Complete your first simulation and your results will
                      appear here.
                    </p>

                    <Link
                      href="/modules"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062b4f]"
                    >
                      Start Learning
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <RecentActivityRow key={activity.id} activity={activity} />
                  ))
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>

        <div className="rounded-lg bg-[#e6f3fb] p-2 text-[#1478bd]">{icon}</div>
      </div>

      <p className="mt-5 text-3xl font-bold text-[#062b4f]">{value}</p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

/* ============================================================
   RECENT ACTIVITY ROW
============================================================ */

function RecentActivityRow({ activity }: { activity: RecentActivity }) {
  const score =
    typeof activity.score === "number" ? Math.round(activity.score) : null;

  const passed =
    activity.isCorrect === true || (typeof score === "number" && score >= 70);

  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e6f3fb]">
          {getActivityIcon(activity.moduleTitle)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#173b5e]">
            {activity.moduleTitle}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Scenario {activity.scenarioId}
          </p>
        </div>
      </div>

      <div className="ml-4 hidden items-center gap-8 text-sm md:flex">
        <span className="font-semibold text-[#173b5e]">
          {score !== null ? `Score: ${score}%` : "Evaluated"}
        </span>

        <span className="text-slate-400">
          {formatDate(activity.completedAt)}
        </span>

        <span
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            passed
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          <CheckCircle2 size={13} />

          {passed ? "Passed" : "Needs Practice"}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   CONTINUE LEARNING LOGIC
============================================================ */

function getContinueModule(
  modules: Module[],
  progress: Progress[],
): Module | null {
  if (modules.length === 0) {
    return null;
  }

  /*
   * First look for the module with the most recently updated
   * progress that is not yet complete.
   */
  const incompleteProgress = progress
    .filter((item) => item.progressPercent < 100)
    .sort((a, b) => {
      const aTime = getTimestampMillis(a.updatedAt);
      const bTime = getTimestampMillis(b.updatedAt);

      return bTime - aTime;
    });

  if (incompleteProgress.length > 0) {
    const module = modules.find(
      (item) => item.id === incompleteProgress[0].moduleId,
    );

    if (module) {
      return module;
    }
  }

  /*
   * If there is no existing progress, start with the first module.
   */
  const firstIncompleteModule = modules.find((module) => {
    const moduleProgress = progress.find((item) => item.moduleId === module.id);

    return !moduleProgress || moduleProgress.progressPercent < 100;
  });

  if (firstIncompleteModule) {
    return firstIncompleteModule;
  }

  /*
   * Everything is complete — let the user review the first
   * module.
   */
  return modules[0];
}

/* ============================================================
   HELPERS
============================================================ */

function getTimestampMillis(timestamp?: Timestamp | null): number {
  if (!timestamp) {
    return 0;
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }

  return 0;
}

function formatDate(timestamp?: Timestamp | null): string {
  if (!timestamp) {
    return "Recently";
  }

  const date = timestamp.toDate();

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getModuleIcon(module: Module): string {
  const text = `${module.title} ${module.type || ""}`.toLowerCase();

  if (text.includes("anchor") || text.includes("anchoring")) {
    return "⚓";
  }

  if (
    text.includes("vhf") ||
    text.includes("radio") ||
    text.includes("communication")
  ) {
    return "📡";
  }

  if (text.includes("moor") || text.includes("mooring")) {
    return "🚢";
  }

  if (text.includes("emergency") || text.includes("distress")) {
    return "🚨";
  }

  if (text.includes("navigation") || text.includes("navigat")) {
    return "🧭";
  }

  return "⚓";
}

function getActivityIcon(title: string): string {
  const text = title.toLowerCase();

  if (text.includes("anchor")) {
    return "⚓";
  }

  if (
    text.includes("vhf") ||
    text.includes("radio") ||
    text.includes("communication")
  ) {
    return "📡";
  }

  if (text.includes("moor")) {
    return "🚢";
  }

  if (text.includes("emergency") || text.includes("distress")) {
    return "🚨";
  }

  return "⚓";
}

function getModuleLabel(module: Module, modules: Module[]): string {
  const index = modules.findIndex((item) => item.id === module.id);

  if (index >= 0) {
    return `Module ${index + 1}`;
  }

  return "Training Module";
}
