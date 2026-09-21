"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";

import { doc, onSnapshot } from "firebase/firestore";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

export default function Topbar() {
  const { user, loading } = useAuth();

  const [photoBase64, setPhotoBase64] = useState("");

  const displayName = user?.displayName || "Student";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (!user) {
      setPhotoBase64("");
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPhotoBase64("");
          return;
        }

        const data = snapshot.data();

        setPhotoBase64(
          typeof data.photoBase64 === "string" ? data.photoBase64 : "",
        );
      },
      (error) => {
        console.error("Topbar profile image error:", error);

        setPhotoBase64("");
      },
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div />

      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button
          type="button"
          className="relative text-slate-500 hover:text-[#0b4778]"
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#168dcc]" />
        </button>

        <div className="h-7 w-px bg-slate-200" />

        {/* User profile */}
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
        >
          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#0b4778] text-sm font-semibold text-white">
            {loading ? (
              "..."
            ) : photoBase64 ? (
              <img
                src={photoBase64}
                alt={`${displayName}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials || "ST"
            )}
          </div>

          {/* User information */}
          <div className="text-left">
            <p className="text-xs font-semibold text-[#062b4f]">
              {loading ? "Loading..." : displayName}
            </p>

            <p className="text-[11px] text-slate-400">
              {user?.email ? "Account" : "Cadet"}
            </p>
          </div>

          <ChevronDown size={15} className="text-slate-400" />
        </Link>
      </div>
    </header>
  );
}
