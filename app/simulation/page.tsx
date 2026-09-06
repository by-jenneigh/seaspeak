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
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type DialogueLine = {
  speaker: string;
  text: string;
};

type ScenarioChoice = {
  id: string;
  text: string;
};

type Scenario = {
  id: string;
  title: string;
  order: number;
  dialogue: DialogueLine[];
  choices: ScenarioChoice[];
  correctAnswer: string;
  explanation: string;
  difficulty?: string;
  published?: boolean;
};

type Module = {
  id: string;
  title: string;
  description: string;
  type?: string;
  order?: number;
  published?: boolean;
};

export default function SimulationPage() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("module");

  const { user, loading: authLoading } = useAuth();

  const [module, setModule] = useState<Module | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Load module + scenarios
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    if (!moduleId) {
      setError("No module was specified.");
      setLoading(false);
      return;
    }

    async function loadSimulation() {
      try {
        setLoading(true);
        setError("");

        /*
         * ----------------------------------------
         * Get module
         * modules/{moduleId}
         * ----------------------------------------
         */
        const moduleRef = doc(db, "modules", moduleId);
        const moduleSnapshot = await getDoc(moduleRef);

        if (!moduleSnapshot.exists()) {
          setError("Module not found.");
          setLoading(false);
          return;
        }

        const rawModuleData = moduleSnapshot.data();

        const moduleData: Module = {
          id: moduleSnapshot.id,
          title:
            typeof rawModuleData.title === "string"
              ? rawModuleData.title
              : "Untitled Module",
          description:
            typeof rawModuleData.description === "string"
              ? rawModuleData.description
              : "",
          type:
            typeof rawModuleData.type === "string"
              ? rawModuleData.type
              : undefined,
          order:
            typeof rawModuleData.order === "number"
              ? rawModuleData.order
              : undefined,
          published:
            typeof rawModuleData.published === "boolean"
              ? rawModuleData.published
              : undefined,
        };

        setModule(moduleData);

        /*
         * ----------------------------------------
         * Get scenarios
         * modules/{moduleId}/scenarios
         * ----------------------------------------
         */
        const scenariosRef = collection(db, "modules", moduleId, "scenarios");

        const scenariosSnapshot = await getDocs(scenariosRef);

        const scenarioData: Scenario[] = scenariosSnapshot.docs.map(
          (scenarioDoc) => {
            const data = scenarioDoc.data();

            /*
             * IMPORTANT:
             * Firestore may contain older scenario documents
             * without choices/dialogue.
             *
             * Always normalize those fields to arrays.
             */

            const dialogue: DialogueLine[] = Array.isArray(data.dialogue)
              ? data.dialogue
                  .filter(
                    (item): item is Record<string, unknown> =>
                      typeof item === "object" && item !== null,
                  )
                  .map((item) => ({
                    speaker:
                      typeof item.speaker === "string"
                        ? item.speaker
                        : "Speaker",
                    text: typeof item.text === "string" ? item.text : "",
                  }))
              : [];

            const choices: ScenarioChoice[] = Array.isArray(data.choices)
              ? data.choices
                  .filter(
                    (item): item is Record<string, unknown> =>
                      typeof item === "object" && item !== null,
                  )
                  .map((item, index) => ({
                    id:
                      typeof item.id === "string"
                        ? item.id
                        : String.fromCharCode(97 + index),
                    text: typeof item.text === "string" ? item.text : "",
                  }))
              : [];

            return {
              id: scenarioDoc.id,

              title:
                typeof data.title === "string"
                  ? data.title
                  : `Scenario ${scenarioDoc.id}`,

              order: typeof data.order === "number" ? data.order : 0,

              dialogue,

              choices,

              correctAnswer:
                typeof data.correctAnswer === "string"
                  ? data.correctAnswer
                  : "",

              explanation:
                typeof data.explanation === "string" ? data.explanation : "",

              difficulty:
                typeof data.difficulty === "string"
                  ? data.difficulty
                  : undefined,

              published:
                typeof data.published === "boolean"
                  ? data.published
                  : undefined,
            };
          },
        );

        /*
         * Sort scenarios by order.
         */
        scenarioData.sort((a, b) => a.order - b.order);

        setScenarios(scenarioData);

        /*
         * Reset scenario state.
         */
        setCurrentScenarioIndex(0);
        setSelectedAnswer(null);
        setSubmitted(false);
      } catch (err) {
        console.error("Error loading simulation:", err);
        setError("Unable to load this simulation. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadSimulation();
  }, [user, authLoading, moduleId]);

  /*
   * Current scenario
   */
  const currentScenario = scenarios[currentScenarioIndex];

  /*
   * Calculate progress
   */
  const scenarioNumber = currentScenarioIndex + 1;
  const totalScenarios = scenarios.length;

  const progress =
    totalScenarios > 0
      ? Math.round((scenarioNumber / totalScenarios) * 100)
      : 0;

  /*
   * Submit answer
   */
  function handleSubmit() {
    if (!currentScenario || !selectedAnswer) {
      return;
    }

    setSubmitted(true);
  }

  /*
   * Move to next scenario
   */
  function handleNextScenario() {
    if (currentScenarioIndex >= scenarios.length - 1) {
      return;
    }

    setCurrentScenarioIndex((previous) => previous + 1);
    setSelectedAnswer(null);
    setSubmitted(false);
  }

  /*
   * Go back to previous scenario
   */
  function handlePreviousScenario() {
    if (currentScenarioIndex <= 0) {
      return;
    }

    setCurrentScenarioIndex((previous) => previous - 1);
    setSelectedAnswer(null);
    setSubmitted(false);
  }

  /*
   * Loading authentication
   */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-sm text-slate-500">
                Checking authentication...
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * Not authenticated
   */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Info size={35} className="mx-auto text-[#168dcc]" />

              <h1 className="mt-4 text-xl font-bold text-[#062b4f]">
                Login Required
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Please log in to access the simulation.
              </p>

              <Link
                href="/login"
                className="mt-6 inline-flex rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062b4f]"
              >
                Go to Login
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * Loading simulation
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <div className="mb-6 h-20 animate-pulse rounded-xl bg-slate-200" />

            <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
              </div>

              <div className="space-y-5">
                <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * Error
   */
  if (error || !module) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">
              <Info size={35} className="mx-auto text-red-400" />

              <h1 className="mt-4 text-xl font-bold text-[#062b4f]">
                Unable to Load Simulation
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {error || "The requested module could not be found."}
              </p>

              <Link
                href="/modules"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062b4f]"
              >
                <ArrowLeft size={15} />
                Back to Modules
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * No scenarios
   */
  if (scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <Link
              href="/modules"
              className="mb-5 flex items-center gap-2 text-xs font-semibold text-[#1478bd]"
            >
              <ArrowLeft size={15} />
              Back to Modules
            </Link>

            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpenIcon />

              <h1 className="mt-4 text-xl font-bold text-[#062b4f]">
                No Scenarios Available
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                There are currently no published scenarios for this module.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * Safety guard
   *
   * This prevents the page from crashing if the current scenario
   * somehow becomes unavailable.
   */
  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-[230px] min-h-screen">
          <Topbar />

          <main className="p-8">
            <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">
              <Info size={35} className="mx-auto text-red-400" />

              <h1 className="mt-4 text-xl font-bold text-[#062b4f]">
                Scenario Unavailable
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                This scenario could not be loaded.
              </p>

              <Link
                href="/modules"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-sm font-semibold text-white"
              >
                <ArrowLeft size={15} />
                Back to Modules
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
                {module.title} Simulation
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Scenario {scenarioNumber} of {totalScenarios}
              </p>
            </div>

            {/* Progress */}
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-xs font-semibold text-slate-500">
                Progress
              </span>

              <div className="h-2 w-32 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#168dcc] transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <span className="text-xs font-bold text-[#1478bd]">
                {progress}%
              </span>
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
              {/* Incoming Communication */}
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1478bd]">
                    Incoming Communication
                  </p>

                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-[#e6f3fb] px-3 py-2 text-xs font-semibold text-[#0b4778] hover:bg-[#dcecf9]"
                  >
                    <Volume2 size={16} />
                    Play
                  </button>
                </div>

                <div className="space-y-3">
                  {currentScenario.dialogue.length > 0 ? (
                    currentScenario.dialogue.map((line, index) => (
                      <div
                        key={`${currentScenario.id}-dialogue-${index}`}
                        className="rounded-lg bg-[#e6f3fb] p-5"
                      >
                        <p className="mb-2 text-xs font-bold text-[#1478bd]">
                          {line.speaker}
                        </p>

                        <p className="text-base font-semibold leading-7 text-[#173b5e]">
                          "{line.text}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
                      No dialogue is available for this scenario.
                    </div>
                  )}
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
                  {currentScenario.choices.length > 0 ? (
                    currentScenario.choices.map((choice) => (
                      <AnswerOption
                        key={choice.id}
                        letter={choice.id}
                        text={choice.text}
                        selected={selectedAnswer === choice.id}
                        submitted={submitted}
                        correct={choice.id === currentScenario.correctAnswer}
                        onClick={() => {
                          if (!submitted) {
                            setSelectedAnswer(choice.id);
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                      <p className="text-sm font-semibold text-slate-600">
                        No response choices available.
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Please add a choices array to this scenario in
                        Firestore.
                      </p>
                    </div>
                  )}
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
                    type="button"
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
                    <button
                      type="button"
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0b4778] text-white shadow-md transition hover:bg-[#062b4f]"
                    >
                      <Mic size={24} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#062b4f]">
                          Press the microphone and say your response
                        </span>

                        <span className="font-mono text-xs text-slate-400">
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
                    <button
                      type="button"
                      className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#1478bd]"
                    >
                      <RotateCcw size={14} />
                      Record again
                    </button>

                    {!submitted ? (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                          !selectedAnswer ||
                          currentScenario.choices.length === 0
                        }
                        className="flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#062b4f] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Submit Response
                        <ChevronRight size={15} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextScenario}
                        disabled={currentScenarioIndex >= scenarios.length - 1}
                        className="flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#062b4f] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next Scenario
                        <ChevronRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Result */}
              {submitted && (
                <section
                  className={`rounded-xl border p-6 shadow-sm ${
                    selectedAnswer === currentScenario.correctAnswer
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        selectedAnswer === currentScenario.correctAnswer
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {selectedAnswer === currentScenario.correctAnswer ? (
                        <Check size={20} />
                      ) : (
                        <Info size={20} />
                      )}
                    </div>

                    <div>
                      <h2
                        className={`text-base font-bold ${
                          selectedAnswer === currentScenario.correctAnswer
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {selectedAnswer === currentScenario.correctAnswer
                          ? "Correct!"
                          : "Incorrect"}
                      </h2>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {currentScenario.explanation ||
                          "No explanation is available for this scenario."}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right column */}
            <aside className="space-y-5">
              {/* Scenario info */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#062b4f]">
                  Scenario Info
                </h3>

                <div className="mt-5 space-y-4">
                  <InfoRow label="Topic" value={module.title} />

                  <InfoRow label="Scenario" value={currentScenario.title} />

                  <InfoRow
                    label="Difficulty"
                    value={currentScenario.difficulty || "Beginner"}
                  />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {module.description || "No module description available."}
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

          {/* Scenario navigation */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={handlePreviousScenario}
              disabled={currentScenarioIndex === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft size={15} />
              Previous
            </button>

            <span className="text-xs font-semibold text-slate-400">
              Scenario {scenarioNumber} of {totalScenarios}
            </span>

            <button
              type="button"
              onClick={handleNextScenario}
              disabled={
                !submitted || currentScenarioIndex >= scenarios.length - 1
              }
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-[#1478bd] transition hover:bg-[#e6f3fb] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

/*
 * Answer Option
 */
function AnswerOption({
  letter,
  text,
  selected,
  submitted,
  correct,
  onClick,
}: {
  letter: string;
  text: string;
  selected: boolean;
  submitted: boolean;
  correct: boolean;
  onClick: () => void;
}) {
  let containerClass =
    "border-slate-200 bg-white hover:border-[#9bcce7] hover:bg-slate-50";

  let letterClass = "border-slate-300 text-slate-500";

  if (!submitted && selected) {
    containerClass = "border-[#168dcc] bg-[#eaf6fc] shadow-sm";

    letterClass = "border-[#168dcc] bg-[#168dcc] text-white";
  }

  if (submitted && correct) {
    containerClass = "border-green-300 bg-green-50";

    letterClass = "border-green-500 bg-green-500 text-white";
  }

  if (submitted && selected && !correct) {
    containerClass = "border-red-300 bg-red-50";

    letterClass = "border-red-500 bg-red-500 text-white";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitted}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${containerClass} ${
        submitted ? "cursor-default" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${letterClass}`}
      >
        {submitted && correct ? <Check size={16} /> : letter.toUpperCase()}
      </div>

      <span className="flex-1 text-sm font-medium leading-6 text-[#173b5e]">
        {text}
      </span>

      {!submitted && <Play size={16} className="text-slate-400" />}
    </button>
  );
}

/*
 * Info Row
 */
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

/*
 * Tip
 */
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

/*
 * Small icon for empty state
 */
function BookOpenIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f3fb] text-[#1478bd]">
      <Play size={20} />
    </div>
  );
}
