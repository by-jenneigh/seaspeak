"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Info,
  Mic,
  Play,
  RotateCcw,
  Video,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function SimulationPage() {
  const [selectedAnswer, setSelectedAnswer] = useState("B");
  const [cameraEnabled, setCameraEnabled] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <Link
                href="/modules"
                className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#1478bd]"
              >
                <ArrowLeft size={15} />
                Back to Modules
              </Link>

              <h1 className="text-2xl font-bold text-[#062b4f]">
                Anchoring Operations Simulation
              </h1>

              <p className="mt-1 text-sm text-slate-500">Scenario 1 of 8</p>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-xs font-semibold text-slate-500">
                Progress
              </span>

              <div className="h-2 w-32 rounded-full bg-slate-200">
                <div className="h-full w-[18%] rounded-full bg-[#168dcc]" />
              </div>

              <span className="text-xs font-bold text-[#1478bd]">18%</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 flex gap-4 rounded-xl border border-[#c8e3f5] bg-[#e6f3fb] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1478bd]">
              <Info size={19} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#062b4f]">
                Simulation Instructions
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Listen to the communication from the Bridge, select the best
                verbal response, then say your response clearly.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
            {/* Main */}
            <div className="space-y-5">
              {/* Incoming communication */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1478bd]">
                    From Bridge (Master)
                  </p>

                  <button className="flex items-center gap-2 rounded-lg bg-[#e6f3fb] px-3 py-2 text-xs font-semibold text-[#0b4778] hover:bg-[#dcecf9]">
                    <Volume2 size={16} />
                    Play
                  </button>
                </div>

                <div className="rounded-lg bg-[#e6f3fb] p-5">
                  <p className="text-base font-semibold leading-7 text-[#173b5e]">
                    "Forward, this is Bridge. Stand by for anchoring. Over."
                  </p>
                </div>
              </section>

              {/* Answers */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-[#062b4f]">
                    Your Response
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select the best response, then say it out loud.
                  </p>
                </div>

                <div className="space-y-3">
                  <AnswerOption
                    letter="A"
                    text="Bridge, anchor team ready, we go now. Over."
                    selected={selectedAnswer === "A"}
                    onClick={() => setSelectedAnswer("A")}
                  />

                  <AnswerOption
                    letter="B"
                    text="Bridge, this is Forward. Anchor party ready. Anchor cleared away. Over."
                    selected={selectedAnswer === "B"}
                    onClick={() => setSelectedAnswer("B")}
                  />
                </div>
              </section>

              {/* Video + Audio */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#062b4f]">
                      Your Response
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Record your response using your microphone.
                    </p>
                  </div>

                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      cameraEnabled
                        ? "border-[#168dcc] bg-[#e6f3fb] text-[#0b4778]"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Video size={15} />
                    {cameraEnabled ? "Camera On" : "Enable Camera"}
                  </button>
                </div>

                {/* Camera placeholder */}
                {cameraEnabled && (
                  <div className="mb-5 overflow-hidden rounded-xl bg-[#071f35]">
                    <div className="relative flex aspect-video items-center justify-center">
                      <div className="text-center text-white">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                          <Video size={28} />
                        </div>

                        <p className="text-sm font-semibold">Webcam Preview</p>

                        <p className="mt-1 text-xs text-white/50">
                          Camera feed placeholder
                        </p>
                      </div>

                      <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-[10px] font-bold text-white">
                        <span className="h-2 w-2 rounded-full bg-white" />
                        CAMERA
                      </span>
                    </div>
                  </div>
                )}

                {/* Audio recorder */}
                <div className="rounded-xl border border-[#c8e3f5] bg-[#f4f9fd] p-5">
                  <div className="flex items-center gap-5">
                    <button className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0b4778] text-white shadow-md transition hover:bg-[#062b4f]">
                      <Mic size={24} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#062b4f]">
                          Press the microphone and say your response
                        </span>

                        <span className="text-xs font-mono text-slate-400">
                          00:00 / 00:30
                        </span>
                      </div>

                      {/* Fake waveform */}
                      <div className="flex h-8 items-center gap-[3px] overflow-hidden">
                        {Array.from({ length: 55 }).map((_, index) => (
                          <span
                            key={index}
                            className="w-[3px] rounded-full bg-[#168dcc]/40"
                            style={{
                              height: `${8 + ((index * 17) % 22)}px`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#c8e3f5] pt-4">
                    <button className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#1478bd]">
                      <RotateCcw size={14} />
                      Record again
                    </button>

                    <button className="flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#062b4f]">
                      Submit Response
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right column */}
            <aside className="space-y-5">
              {/* Scenario info */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#062b4f]">
                  Scenario Info
                </h3>

                <div className="mt-5 space-y-4">
                  <InfoRow label="Topic" value="Anchoring Operations" />
                  <InfoRow label="Difficulty" value="Beginner" />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Practice standard communication during the anchoring
                      procedure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CircleHelp size={17} className="text-[#1478bd]" />

                  <h3 className="text-sm font-bold text-[#062b4f]">Tips</h3>
                </div>

                <div className="mt-4 space-y-3">
                  <Tip text="Use standard Seaspeak phrases." />
                  <Tip text="Be clear and concise." />
                  <Tip text='End with "Over".' />
                </div>
              </div>

              {/* Video comparison */}
              <div className="rounded-xl border border-dashed border-[#8fc5e5] bg-[#f4f9fd] p-5">
                <div className="flex items-center gap-2 text-[#0b4778]">
                  <Video size={17} />

                  <h3 className="text-sm font-bold">
                    Video Response — Optional
                  </h3>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Camera recording can be enabled to capture the student during
                  the verbal simulation.
                </p>

                <div className="mt-4 rounded-lg bg-[#dcecf9] p-3 text-[10px] leading-4 text-[#0b4778]">
                  <strong>Client comparison:</strong> Audio-only is the
                  recommended MVP. Video can be enabled as an additional
                  simulation feature.
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function AnswerOption({
  letter,
  text,
  selected,
  onClick,
}: {
  letter: string;
  text: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-[#168dcc] bg-[#eaf6fc] shadow-sm"
          : "border-slate-200 bg-white hover:border-[#9bcce7] hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          selected
            ? "border-[#168dcc] bg-[#168dcc] text-white"
            : "border-slate-300 text-slate-500"
        }`}
      >
        {selected ? <Check size={16} /> : letter}
      </div>

      <span className="flex-1 text-sm font-medium leading-6 text-[#173b5e]">
        {text}
      </span>

      <Play size={16} className="text-slate-400" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#173b5e]">{value}</p>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dcecf9] text-[#1478bd]">
        <Check size={10} strokeWidth={3} />
      </div>

      <p className="text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
