"use client";

import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleUserRound,
  House,
  LogOut,
  Settings,
  Trophy,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { logoutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const navigation = [
  {
    name: "Home",
    href: "/",
    icon: House,
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
    href: "#",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    name: "Results",
    href: "#",
    icon: Trophy,
  },
  {
    name: "Profile",
    href: "#",
    icon: CircleUserRound,
  },
  {
    name: "Settings",
    href: "#",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              item.href !== "#" &&
              (pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href)));

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
