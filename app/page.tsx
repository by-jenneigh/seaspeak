import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Target,
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">
          {/* Welcome */}
          <section className="mb-7">
            <h1 className="text-2xl font-bold text-[#062b4f]">
              Welcome back, Cadet! 👋
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Keep learning. Keep improving.
            </p>
          </section>

          {/* Stats */}
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Overall Progress"
              value="65%"
              description="Keep it up!"
              icon={<Target size={20} />}
            />

            <StatCard
              title="Modules Completed"
              value="8 / 12"
              description="Keep going"
              icon={<BookOpen size={20} />}
            />

            <StatCard
              title="Simulations Taken"
              value="15"
              description="This month"
              icon={<Clock3 size={20} />}
            />

            <StatCard
              title="Average Score"
              value="82%"
              description="Good performance!"
              icon={<Award size={20} />}
            />
          </section>

          {/* Continue Learning */}
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#062b4f]">
                Continue Learning
              </h2>

              <Link
                href="/modules"
                className="text-sm font-semibold text-[#1478bd]"
              >
                View Modules
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid md:grid-cols-[280px_1fr]">
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[#0b4778] to-[#168dcc] text-white md:h-full">
                  <div className="text-center">
                    <span className="text-6xl">⚓</span>
                    <p className="mt-2 text-sm font-semibold">
                      Anchoring Operations
                    </p>
                  </div>
                </div>

                <div className="p-7">
                  <div className="flex h-full flex-col justify-center">
                    <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#168dcc]">
                      Module 2
                    </span>

                    <h3 className="text-xl font-bold text-[#062b4f]">
                      Anchoring Operations
                    </h3>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Practice standard maritime communication during the
                      anchoring procedure.
                    </p>

                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-[#1478bd]">70%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-[70%] rounded-full bg-[#168dcc]" />
                      </div>
                    </div>

                    <Link
                      href="/simulation"
                      className="mt-6 flex w-fit items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white hover:bg-[#062b4f]"
                    >
                      Continue
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#062b4f]">
                Recent Activity
              </h2>

              <button className="text-sm font-semibold text-[#1478bd]">
                View all
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {[
                [
                  "⚓",
                  "Anchoring Operations Simulation",
                  "85%",
                  "May 20, 2024",
                ],
                ["📡", "VHF Communication Practice", "78%", "May 18, 2024"],
                ["🚢", "Mooring Operations Simulation", "88%", "May 16, 2024"],
              ].map(([icon, title, score, date]) => (
                <div
                  key={title}
                  className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e6f3fb]">
                      {icon}
                    </div>

                    <p className="text-sm font-semibold text-[#173b5e]">
                      {title}
                    </p>
                  </div>

                  <div className="hidden items-center gap-8 text-sm md:flex">
                    <span className="font-semibold text-[#173b5e]">
                      Score: {score}
                    </span>

                    <span className="text-slate-400">{date}</span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Passed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

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
