"use client";

import { useEffect, useState } from "react";

import {
  Anchor,
  ArrowRight,
  BookOpen,
  Radio,
  Ship,
  TriangleAlert,
} from "lucide-react";

import Link from "next/link";

import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

import type { Module } from "@/lib/types";

const moduleIcons = {
  Communication: Radio,
  Operations: Anchor,
  Navigation: BookOpen,
  Emergency: TriangleAlert,
};

export default function ModulesPage() {
  const { user, loading: authLoading } = useAuth();

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until Firebase finishes checking authentication
    if (authLoading) {
      return;
    }

    // User is not logged in
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    async function loadModules() {
      try {
        setLoading(true);

        const modulesRef = collection(db, "modules");

        const modulesQuery = query(
          modulesRef,
          where("published", "==", true),
          orderBy("order", "asc"),
        );

        const snapshot = await getDocs(modulesQuery);

        const data: Module[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Module[];

        setModules(data);
      } catch (error) {
        console.error("Error loading modules:", error);
        setModules([]);
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">
          {/* Header */}
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

          {/* Authentication Loading */}
          {authLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                Checking authentication...
              </p>
            </div>
          )}

          {/* Data Loading */}
          {!authLoading && loading && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-40 animate-pulse bg-slate-200" />

                  <div className="p-5">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />

                    <div className="mt-3 h-5 w-40 animate-pulse rounded bg-slate-200" />

                    <div className="mt-3 h-10 animate-pulse rounded bg-slate-100" />

                    <div className="mt-5 h-2 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not authenticated */}
          {!authLoading && !user && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen size={32} className="mx-auto text-slate-300" />

              <h3 className="mt-3 font-semibold text-[#062b4f]">
                Please log in
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                You need to be logged in to access the learning modules.
              </p>

              <Link
                href="/login"
                className="mt-5 inline-flex rounded-lg bg-[#0b4778] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b4f]"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Modules */}
          {!authLoading && user && !loading && modules.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module, index) => {
                const Icon =
                  moduleIcons[module.type as keyof typeof moduleIcons] || Ship;

                const moduleNumber = String(index + 1).padStart(2, "0");

                // TODO:
                // Replace this with actual student progress
                // from Firestore later.
                const progress = 0;

                return (
                  <Link
                    href={`/simulation?module=${module.id}`}
                    key={module.id}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Image / Visual */}
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-[#08365f] via-[#0b5b96] to-[#168dcc]">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[20px] border-white" />

                        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full border-[15px] border-white" />
                      </div>

                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#0b4778] shadow-lg">
                        <Icon size={30} strokeWidth={1.5} />
                      </div>

                      <span className="absolute left-4 top-4 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        Module {moduleNumber}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#168dcc]">
                        {module.type || "Maritime Communication"}
                      </span>

                      <h2 className="mt-1 text-lg font-bold text-[#062b4f]">
                        {module.title}
                      </h2>

                      <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
                        {module.description}
                      </p>

                      {/* Progress */}
                      <div className="mt-5">
                        <div className="mb-2 flex justify-between text-xs">
                          <span className="text-slate-400">Progress</span>

                          <span className="font-semibold text-[#1478bd]">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#168dcc]"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Continue */}
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">
                          Start learning
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
          )}

          {/* Empty State */}
          {!authLoading && user && !loading && modules.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen size={32} className="mx-auto text-slate-300" />

              <h3 className="mt-3 font-semibold text-[#062b4f]">
                No modules available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Check back later for available learning modules.
              </p>
            </div>
          )}

          {/* More Modules */}
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
