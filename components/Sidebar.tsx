"use client";

import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleUserRound,
  House,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  Waves,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { logoutUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  adminOnly?: boolean;
};

const navigation: NavigationItem[] = [
  {
    name: "Home",
    href: "/",
    icon: House,
  },
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    name: "Results",
    href: "/admin/results",
    icon: Trophy,
    adminOnly: true,
  },
  {
    name: "Modules",
    href: "/modules",
    icon: BookOpen,
  },
  {
    name: "Simulation",
    href: "/simulation",
    icon: Waves,
  },
  {
    name: "Progress",
    href: "/progress",
    icon: ChartNoAxesColumnIncreasing,
  },

  // {
  //   name: "Profile",
  //   href: "/profile",
  //   icon: CircleUserRound,
  // },
  // {
  //   name: "Settings",
  //   href: "/settings",
  //   icon: Settings,
  // },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
        }

        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!cancelled) {
          const userData = userDoc.exists() ? userDoc.data() : null;

          setIsAdmin(userData?.role === "admin");
        }
      } catch (error) {
        console.error("Error checking admin role:", error);

        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    checkAdminRole();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const visibleNavigation = navigation.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }

    return true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[230px] flex-col bg-[#062b4f] text-white">
      {/* Logo */}
      <div className="flex flex-col items-center px-5 py-7">
        <div className="mb-4 flex items-center justify-center">
          <Image
            src="/seaspeak-logo.png"
            alt="SEASPEAK"
            width={110}
            height={110}
            className="rounded-full object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                  active
                    ? "bg-[#1478bd] text-white shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={async () => {
            await logoutUser();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-blue-100 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
