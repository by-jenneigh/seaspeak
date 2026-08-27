"use client";

import { Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Topbar() {
  const { user, loading } = useAuth();

  const displayName = user?.displayName || "Student";

  // Get initials from the user's name
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0].toUpperCase())
    .join("");

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div />

      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button className="relative text-slate-500 hover:text-[#0b4778]">
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#168dcc]" />
        </button>

        <div className="h-7 w-px bg-slate-200" />

        {/* User */}
        <button className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b4778] text-sm font-semibold text-white">
            {loading ? "..." : initials || "ST"}
          </div>

          <div className="text-left">
            <p className="text-xs font-semibold text-[#062b4f]">
              {loading ? "Loading..." : displayName}
            </p>

            <p className="text-[11px] text-slate-400">Cadet</p>
          </div>

          <ChevronDown size={15} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
