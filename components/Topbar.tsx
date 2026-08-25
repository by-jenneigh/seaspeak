import { Bell, ChevronDown } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div />

      <div className="flex items-center gap-5">
        <button className="relative text-slate-500 hover:text-[#0b4778]">
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#168dcc]" />
        </button>

        <div className="h-7 w-px bg-slate-200" />

        <button className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b4778] text-sm font-semibold text-white">
            JC
          </div>

          <div className="text-left">
            <p className="text-xs font-semibold text-[#062b4f]">
              Cadet Juan Dela Cruz
            </p>

            <p className="text-[11px] text-slate-400">Cadet</p>
          </div>

          <ChevronDown size={15} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
