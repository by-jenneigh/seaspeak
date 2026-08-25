import {
  Anchor,
  ArrowRight,
  Bell,
  BookOpen,
  CircleUserRound,
  Radio,
  Ship,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const modules = [
  {
    number: "01",
    title: "Bridge Communication",
    description: "Essential bridge communication and standard phraseology.",
    icon: Ship,
    progress: 70,
    type: "Communication",
  },
  {
    number: "02",
    title: "Anchoring Operations",
    description: "Practice communication during anchoring procedures.",
    icon: Anchor,
    progress: 65,
    type: "Operations",
  },
  {
    number: "03",
    title: "Mooring Operations",
    description: "Learn standard communication during mooring.",
    icon: Ship,
    progress: 40,
    type: "Operations",
  },
  {
    number: "04",
    title: "VHF Communication",
    description: "Practice standardized VHF communication.",
    icon: Radio,
    progress: 30,
    type: "Communication",
  },
  {
    number: "05",
    title: "Navigation & Watchkeeping",
    description: "Communication for navigation and watchkeeping.",
    icon: BookOpen,
    progress: 20,
    type: "Navigation",
  },
  {
    number: "06",
    title: "Emergency Communication",
    description: "Standard communication during emergencies.",
    icon: TriangleAlert,
    progress: 10,
    type: "Emergency",
  },
];

export default function ModulesPage() {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#168dcc]">
              Learning Center
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#062b4f]">
              Learning Modules
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Explore and learn essential maritime communication topics.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  href="/simulation"
                  key={module.number}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Image placeholder */}
                  <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-[#08365f] via-[#0b5b96] to-[#168dcc]">
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[20px] border-white" />
                      <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full border-[15px] border-white" />
                    </div>

                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#0b4778] shadow-lg">
                      <Icon size={30} strokeWidth={1.5} />
                    </div>

                    <span className="absolute left-4 top-4 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      Module {module.number}
                    </span>
                  </div>

                  <div className="p-5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#168dcc]">
                      {module.type}
                    </span>

                    <h2 className="mt-1 text-lg font-bold text-[#062b4f]">
                      {module.title}
                    </h2>

                    <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
                      {module.description}
                    </p>

                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-slate-400">Progress</span>
                        <span className="font-semibold text-[#1478bd]">
                          {module.progress}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#168dcc]"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Continue learning
                      </span>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f3fb] text-[#1478bd] transition group-hover:bg-[#1478bd] group-hover:text-white">
                        <ArrowRight size={15} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-7 rounded-xl bg-[#dcecf9] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1478bd]">
                <BookOpen size={20} />
              </div>

              <div>
                <h3 className="font-bold text-[#062b4f]">
                  More modules coming soon!
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Stay tuned for additional maritime topics and advanced
                  simulations.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
