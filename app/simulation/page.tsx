"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Info,
  Mic,
  Play,
  RotateCcw,
  Square,
  Video,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type DialogueLine = {
  speaker: string;
  text: string;
};

type ScenarioOption = {
  id: string;
  text: string;
};

type Scenario = {
  id: string;
  title: string;
  order: number;
  dialogue: DialogueLine[];
  options: ScenarioOption[];
  correctOptionId: string;
  explanation: string;
  difficulty?: string;
  published?: boolean;
  studentRole?: string;
  communicationChannel?: string;
  situation?: string;
  prompt?: string;
  responseMode?: string;
  expectedResponse?: string;
  wrongAnswerEffect?: string;
  assessment?: unknown;
};

type Module = {
  id: string;
  title: string;
  description: string;
  type?: string;
  order?: number;
  published?: boolean;
};

type ModuleProgress = {
  moduleId: string;
  completedScenarioIds: string[];
  completedScenarios: number;
  totalScenarios: number;
  progressPercent: number;
  currentScenarioIndex: number;
  lastScenarioId: string;
};

function SimulationPageContent() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("moduleId") || searchParams.get("module");

  const { user, loading: authLoading } = useAuth();

  const router = useRouter();

  const [module, setModule] = useState<Module | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [cameraEnabled, setCameraEnabled] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [transcript, setTranscript] = useState("");
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiClarity, setAiClarity] = useState<number | null>(null);
  const [aiPhraseology, setAiPhraseology] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState("");

  const [recordingError, setRecordingError] = useState("");

  const [playingSpeechId, setPlayingSpeechId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [activeDialogueIndex, setActiveDialogueIndex] = useState<number | null>(
    null,
  );

  const [completedScenarioIds, setCompletedScenarioIds] = useState<string[]>(
    [],
  );
  const [moduleProgress, setModuleProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speechVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !moduleId) {
      router.replace("/modules");
    }
  }, [authLoading, moduleId, router]);

  /*
   * Load available browser voices.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }

    const loadVoices = () => {
      speechVoicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);

      window.speechSynthesis.cancel();
    };
  }, []);

  /*
   * Stop any speech currently playing.
   */
  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    speechUtteranceRef.current = null;
    setPlayingSpeechId(null);
    setActiveDialogueIndex(null);
  }

  /*
   * Get the best available English voice.
   */
  function getPreferredVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices =
      speechVoicesRef.current.length > 0
        ? speechVoicesRef.current
        : window.speechSynthesis.getVoices();

    return (
      voices.find((voice) => voice.lang.toLowerCase() === "en-gb") ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ||
      voices.find((voice) => voice.lang.toLowerCase() === "en-us") ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en-")) ||
      null
    );
  }

  /*
   * Speak a single response option.
   */
  function speakOption(option: ScenarioOption) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setRecordingError("Speech practice is not supported by this browser.");
      return;
    }

    const speechId = `option-${option.id}`;

    if (playingSpeechId === speechId) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(option.text);

    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = getPreferredVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setPlayingSpeechId(speechId);
    };

    utterance.onend = () => {
      setPlayingSpeechId(null);
      speechUtteranceRef.current = null;
    };

    utterance.onerror = () => {
      setPlayingSpeechId(null);
      speechUtteranceRef.current = null;
    };

    speechUtteranceRef.current = utterance;
    setPlayingSpeechId(speechId);

    window.speechSynthesis.speak(utterance);
  }

  /*
   * Speak the complete incoming communication.
   */
  function speakIncomingCommunication() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setRecordingError("Speech practice is not supported by this browser.");
      return;
    }

    const currentScenario = scenarios[currentScenarioIndex];

    if (!currentScenario || currentScenario.dialogue.length === 0) {
      return;
    }

    if (playingSpeechId === "incoming") {
      stopSpeech();
      return;
    }

    stopSpeech();

    const dialogue = currentScenario.dialogue.filter(
      (line) => line.text.trim() !== "",
    );

    if (dialogue.length === 0) {
      return;
    }

    let dialogueIndex = 0;

    const speakNextLine = () => {
      if (
        dialogueIndex >= dialogue.length ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setPlayingSpeechId(null);
        setActiveDialogueIndex(null);
        speechUtteranceRef.current = null;
        return;
      }

      const currentLine = dialogue[dialogueIndex];

      const utterance = new SpeechSynthesisUtterance(currentLine.text);

      utterance.lang = "en-GB";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = getPreferredVoice();

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        setPlayingSpeechId("incoming");

        const originalIndex = currentScenario.dialogue.findIndex(
          (line) =>
            line.speaker === currentLine.speaker &&
            line.text === currentLine.text,
        );

        setActiveDialogueIndex(
          originalIndex >= 0 ? originalIndex : dialogueIndex,
        );
      };

      utterance.onend = () => {
        dialogueIndex += 1;

        if (dialogueIndex < dialogue.length) {
          speakNextLine();
        } else {
          setPlayingSpeechId(null);
          setActiveDialogueIndex(null);
          speechUtteranceRef.current = null;
        }
      };

      utterance.onerror = () => {
        setPlayingSpeechId(null);
        setActiveDialogueIndex(null);
        speechUtteranceRef.current = null;
      };

      speechUtteranceRef.current = utterance;

      window.speechSynthesis.speak(utterance);
    };

    setPlayingSpeechId("incoming");

    speakNextLine();
  }

  /*
   * Load module, scenarios, and the student's saved progress.
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
      if (!moduleId) {
        return;
      }

      if (authLoading) return;

      if (!user) {
        setError("You must be logged in to access simulations.");
        setLoading(false);
        return;
      }

      if (!moduleId) {
        setError("No module was specified.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // 1. Load module
        const moduleRef = doc(db, "modules", moduleId);
        const moduleSnap = await getDoc(moduleRef);

        if (!moduleSnap.exists()) {
          setError(`Module "${moduleId}" was not found.`);
          return;
        }

        const moduleData = moduleSnap.data();

        setModule({
          id: moduleSnap.id,
          title: moduleData.title || "Untitled Module",
          description: moduleData.description || "",
          type: moduleData.type || "",
          order: typeof moduleData.order === "number" ? moduleData.order : 0,
          published: moduleData.published !== false,
        });

        // 2. Load scenarios
        const scenariosRef = collection(db, "modules", moduleId, "scenarios");

        const scenariosSnap = await getDocs(scenariosRef);

        const loadedScenarios = scenariosSnap.docs
          .map((scenarioDoc) => {
            const data = scenarioDoc.data();

            return {
              id: scenarioDoc.id,
              title: data.title || "Untitled Scenario",

              order: typeof data.order === "number" ? data.order : 0,

              dialogue: Array.isArray(data.dialogue) ? data.dialogue : [],

              options: Array.isArray(data.options) ? data.options : [],

              correctOptionId:
                typeof data.correctOptionId === "string"
                  ? data.correctOptionId
                  : "",

              explanation: data.explanation || "",
              difficulty: data.difficulty || "",
              published: data.published !== false,

              studentRole: data.studentRole || "",
              communicationChannel: data.communicationChannel || "",
              situation: data.situation || "",
              prompt: data.prompt || "",
              responseMode: data.responseMode || "",
              expectedResponse: data.expectedResponse || "",
              wrongAnswerEffect: data.wrongAnswerEffect || "",
              assessment: data.assessment || null,
            };
          })
          .filter((scenario) => scenario.published !== false)
          .sort((a, b) => a.order - b.order);

        setScenarios(loadedScenarios);

        // 3. Load this user's progress for this module
        //
        // Firestore structure:
        // users/{uid}/progress/{moduleId}
        //
        // This is a DOCUMENT, so use doc(), not collection().
        const progressRef = doc(db, "users", user.uid, "progress", moduleId);

        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const progressData = progressSnap.data();

          const completedIds = Array.isArray(progressData.completedScenarioIds)
            ? progressData.completedScenarioIds.filter(
                (id): id is string => typeof id === "string",
              )
            : [];

          setCompletedScenarioIds(completedIds);

          const savedIndex =
            typeof progressData.currentScenarioIndex === "number"
              ? progressData.currentScenarioIndex
              : 0;

          setCurrentScenarioIndex(
            Math.min(
              Math.max(savedIndex, 0),
              Math.max(loadedScenarios.length - 1, 0),
            ),
          );
        } else {
          setCompletedScenarioIds([]);
          setCurrentScenarioIndex(0);
        }

        // Reset current-session response state
        setSelectedAnswer(null);
        setSubmitted(false);
      } catch (error) {
        console.error("Error loading simulation:", error);

        setError(
          error instanceof Error ? error.message : "Unable to load simulation.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSimulation();
  }, [user, authLoading, moduleId]);

  /*
   * Cleanup on page unmount.
   */
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      mediaRecorderRef.current?.stop();

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /*
   * Camera handling.
   */
  useEffect(() => {
    if (!cameraEnabled || !navigator.mediaDevices?.getUserMedia) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      return;
    }

    let cancelled = false;

    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);

        setCameraEnabled(false);

        setRecordingError(
          "Unable to access your camera. Please check browser permissions.",
        );
      }
    }

    enableCamera();

    return () => {
      cancelled = true;

      const stream = videoRef.current?.srcObject as MediaStream | null;

      stream?.getTracks().forEach((track) => track.stop());

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraEnabled]);

  const currentScenario = scenarios[currentScenarioIndex];

  const scenarioNumber = currentScenarioIndex + 1;
  const totalScenarios = scenarios.length;

  const scenarioPositionProgress =
    totalScenarios > 0
      ? Math.round((scenarioNumber / totalScenarios) * 100)
      : 0;

  /*
   * Save the student's current module progress.
   */
  async function saveModuleProgress(
    scenarioIndex: number,
    completedIds: string[],
  ) {
    if (!user || !moduleId || scenarios.length === 0) {
      return;
    }

    const uniqueCompletedIds = Array.from(new Set(completedIds)).filter((id) =>
      scenarios.some((scenario) => scenario.id === id),
    );

    const completedCount = uniqueCompletedIds.length;

    const progressPercent = Math.round(
      (completedCount / scenarios.length) * 100,
    );

    const safeScenarioIndex = Math.max(
      0,
      Math.min(scenarioIndex, Math.max(scenarios.length - 1, 0)),
    );

    const lastScenario = scenarios[safeScenarioIndex];

    const progressData: ModuleProgress = {
      moduleId,
      completedScenarioIds: uniqueCompletedIds,
      completedScenarios: completedCount,
      totalScenarios: scenarios.length,
      progressPercent,
      currentScenarioIndex: safeScenarioIndex,
      lastScenarioId: lastScenario?.id || "",
    };

    await setDoc(
      doc(db, "users", user.uid, "progress", moduleId),
      {
        ...progressData,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setCompletedScenarioIds(uniqueCompletedIds);
    setModuleProgress(progressPercent);
  }

  /*
   * Start/stop microphone recording.
   */
  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      setRecordingError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }

      stopSpeech();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      setAudioBlob(null);
      setTranscript("");
      setAiScore(null);
      setAiClarity(null);
      setAiPhraseology(null);
      setAiFeedback("");
      setRecordingSeconds(0);
      setSubmitted(false);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);
        setIsRecording(false);

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        mediaStreamRef.current = null;
      };

      recorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          if (seconds >= 29) {
            mediaRecorderRef.current?.stop();
            return 30;
          }

          return seconds + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);

      setIsRecording(false);

      setRecordingError(
        err instanceof Error
          ? err.message
          : "Unable to access your microphone. Please check your browser permissions.",
      );
    }
  }

  /*
   * Reset recording.
   */
  function resetRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }

    setAudioBlob(null);
    setTranscript("");
    setAiScore(null);
    setAiClarity(null);
    setAiPhraseology(null);
    setAiFeedback("");
    setRecordingSeconds(0);
    setRecordingError("");
    setSubmitted(false);
  }

  /*
   * Submit selected response + recorded speech
   * for AI evaluation and save the result.
   */
  async function handleSubmit() {
    if (
      !currentScenario ||
      !selectedAnswer ||
      !audioBlob ||
      isAnalyzing ||
      !user ||
      !moduleId
    ) {
      return;
    }

    try {
      stopSpeech();

      setIsAnalyzing(true);
      setRecordingError("");

      const selectedOption = currentScenario.options.find(
        (option) => option.id === selectedAnswer,
      );

      const correctOption = currentScenario.options.find(
        (option) => option.id === currentScenario.correctOptionId,
      );

      const formData = new FormData();

      formData.append("audio", audioBlob, "student-response.webm");

      formData.append(
        "scenario",
        JSON.stringify({
          title: currentScenario.title,
          situation: currentScenario.situation,
          prompt: currentScenario.prompt,
          expectedResponse: currentScenario.expectedResponse,
          selectedOption: selectedOption?.text,
          correctOption: correctOption?.text,
          explanation: currentScenario.explanation,
        }),
      );

      const response = await fetch("/api/ai-evaluate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI evaluation failed.");
      }

      const finalTranscript = result.transcript || "";

      const finalScore = typeof result.score === "number" ? result.score : null;

      const finalClarity =
        typeof result.clarity === "number" ? result.clarity : null;

      const finalPhraseology =
        typeof result.phraseology === "number" ? result.phraseology : null;

      const finalFeedback = result.feedback || "";

      const correct = selectedAnswer === currentScenario.correctOptionId;

      setTranscript(finalTranscript);
      setAiScore(finalScore);
      setAiClarity(finalClarity);
      setAiPhraseology(finalPhraseology);
      setAiFeedback(finalFeedback);
      setSubmitted(true);

      /*
       * Save individual attempt.
       *
       * users/{uid}/attempts/{attemptId}
       */
      await addDoc(collection(db, "users", user.uid, "attempts"), {
        moduleId,
        scenarioId: currentScenario.id,
        scenarioTitle: currentScenario.title,

        selectedOptionId: selectedAnswer,
        selectedOptionText: selectedOption?.text || "",

        correctOptionId: currentScenario.correctOptionId,
        correctOptionText: correctOption?.text || "",

        isCorrect: correct,

        transcript: finalTranscript,

        score: finalScore,
        clarity: finalClarity,
        phraseology: finalPhraseology,

        feedback: finalFeedback,

        completedAt: serverTimestamp(),
      });

      /*
       * Mark this scenario completed.
       *
       * A scenario is only added once, so repeating
       * the scenario does not increase progress.
       */
      const updatedCompletedIds = Array.from(
        new Set([...completedScenarioIds, currentScenario.id]),
      );

      const nextScenarioIndex =
        currentScenarioIndex < scenarios.length - 1
          ? currentScenarioIndex + 1
          : currentScenarioIndex;

      await saveModuleProgress(nextScenarioIndex, updatedCompletedIds);
    } catch (err) {
      console.error("AI evaluation / progress save error:", err);

      setRecordingError(
        err instanceof Error
          ? err.message
          : "Unable to save your result. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  /*
   * Move to next scenario.
   */
  function handleNextScenario() {
    if (currentScenarioIndex >= scenarios.length - 1) {
      return;
    }

    stopSpeech();

    const nextIndex = currentScenarioIndex + 1;

    setCurrentScenarioIndex(nextIndex);
    setSelectedAnswer(null);
    setSubmitted(false);
    setAudioBlob(null);
    setTranscript("");
    setAiScore(null);
    setAiClarity(null);
    setAiPhraseology(null);
    setAiFeedback("");
    setRecordingSeconds(0);
    setRecordingError("");

    void saveModuleProgress(nextIndex, completedScenarioIds);
  }

  /*
   * Go back to previous scenario.
   */
  function handlePreviousScenario() {
    if (currentScenarioIndex <= 0) {
      return;
    }

    stopSpeech();

    const previousIndex = currentScenarioIndex - 1;

    setCurrentScenarioIndex(previousIndex);
    setSelectedAnswer(null);
    setSubmitted(false);
    setAudioBlob(null);
    setTranscript("");
    setAiScore(null);
    setAiClarity(null);
    setAiPhraseology(null);
    setAiFeedback("");
    setRecordingSeconds(0);
    setRecordingError("");

    void saveModuleProgress(previousIndex, completedScenarioIds);
  }

  /*
   * Authentication loading.
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
   * Not authenticated.
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
   * Loading simulation.
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
   * Error.
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
   * No scenarios.
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
                There are currently no scenarios for this module.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * Safety guard.
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

  const isCorrect = selectedAnswer === currentScenario.correctOptionId;

  const isIncomingPlaying = playingSpeechId === "incoming";

  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">
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

            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-xs font-semibold text-slate-500">
                Module Progress
              </span>

              <div className="h-2 w-32 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#168dcc] transition-all"
                  style={{
                    width: `${moduleProgress}%`,
                  }}
                />
              </div>

              <span className="text-xs font-bold text-[#1478bd]">
                {moduleProgress}%
              </span>
            </div>
          </div>

          <div className="mb-6 flex gap-4 rounded-xl border border-[#c8e3f5] bg-[#e6f3fb] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1478bd]">
              <Info size={19} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#062b4f]">
                Simulation Instructions
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Listen to the incoming communication, practice the response
                options using Listen, select the best verbal response, then say
                your response clearly.
              </p>
            </div>
          </div>

          {!speechSupported && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
              Speech practice is not supported by this browser. You can still
              select responses and use the microphone recording feature.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1478bd]">
                      Incoming Communication
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Listen to the communication before choosing your response.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={speakIncomingCommunication}
                    disabled={
                      !speechSupported || currentScenario.dialogue.length === 0
                    }
                    aria-label={
                      isIncomingPlaying
                        ? "Stop incoming communication"
                        : "Listen to incoming communication"
                    }
                    title={
                      isIncomingPlaying
                        ? "Stop"
                        : "Listen to incoming communication"
                    }
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isIncomingPlaying
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-[#e6f3fb] text-[#0b4778] hover:bg-[#dcecf9]"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {isIncomingPlaying ? (
                      <>
                        <Square size={15} fill="currentColor" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 size={16} />
                        Listen
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {currentScenario.dialogue.length > 0 ? (
                    currentScenario.dialogue.map((line, index) => {
                      const isActive =
                        activeDialogueIndex === index && isIncomingPlaying;

                      return (
                        <div
                          key={`${currentScenario.id}-dialogue-${index}`}
                          className={`rounded-lg p-5 transition ${
                            isActive
                              ? "bg-[#dcecf9] ring-2 ring-[#168dcc]/30"
                              : "bg-[#e6f3fb]"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-bold text-[#1478bd]">
                              {line.speaker}
                            </p>

                            {isActive && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#1478bd]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#168dcc]" />
                                Speaking
                              </span>
                            )}
                          </div>

                          <p className="text-base font-semibold leading-7 text-[#173b5e]">
                            "{line.text}"
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
                      No dialogue is available for this scenario.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#062b4f]">
                      Your Response
                    </h2>

                    {currentScenario.options.length > 0 && (
                      <span className="rounded-full bg-[#e6f3fb] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1478bd]">
                        {currentScenario.options.length} Options
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Select the best response. Use Listen to hear the recommended
                    pronunciation and phrasing, then say it out loud.
                  </p>
                </div>

                <div className="space-y-3">
                  {currentScenario.options.length > 0 ? (
                    currentScenario.options.map((option) => (
                      <AnswerOption
                        key={option.id}
                        letter={option.id}
                        text={option.text}
                        selected={selectedAnswer === option.id}
                        submitted={submitted}
                        correct={option.id === currentScenario.correctOptionId}
                        isPlaying={playingSpeechId === `option-${option.id}`}
                        speechSupported={speechSupported}
                        onClick={() => {
                          if (!submitted) {
                            stopSpeech();
                            setSelectedAnswer(option.id);
                          }
                        }}
                        onPlay={() => speakOption(option)}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-red-200 bg-red-50 p-5 text-center">
                      <p className="text-sm font-semibold text-red-600">
                        No response options found.
                      </p>

                      <p className="mt-1 text-xs text-red-400">
                        This scenario does not contain an{" "}
                        <strong>options</strong> array in Firestore.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#062b4f]">
                      Verbal Response
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

                {cameraEnabled && (
                  <div className="mb-5 overflow-hidden rounded-xl bg-[#071f35]">
                    <div className="relative aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />

                      <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-[10px] font-bold text-white">
                        <span className="h-2 w-2 rounded-full bg-white" />
                        CAMERA LIVE
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[#c8e3f5] bg-[#f4f9fd] p-5">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={isAnalyzing}
                      aria-label={
                        isRecording ? "Stop recording" : "Start recording"
                      }
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-[#0b4778] hover:bg-[#062b4f]"
                      }`}
                    >
                      {isRecording ? (
                        <span className="h-5 w-5 rounded-sm bg-white" />
                      ) : (
                        <Mic size={24} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#062b4f]">
                          {isRecording
                            ? "Recording... speak your response clearly"
                            : audioBlob
                              ? "Recording ready for AI evaluation"
                              : "Press the microphone and say your response"}
                        </span>

                        <span className="shrink-0 font-mono text-xs text-slate-400">
                          00:
                          {String(recordingSeconds).padStart(2, "0")} / 00:30
                        </span>
                      </div>

                      <div className="flex h-8 items-center gap-[3px] overflow-hidden">
                        {Array.from({
                          length: 55,
                        }).map((_, index) => (
                          <span
                            key={index}
                            className={`w-[3px] rounded-full ${
                              isRecording ? "bg-red-400" : "bg-[#168dcc]/40"
                            }`}
                            style={{
                              height: `${8 + ((index * 17) % 22)}px`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {recordingError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                      {recordingError}
                    </div>
                  )}

                  {audioBlob && !isRecording && !recordingError && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                      Recording captured successfully. Select your response
                      above, then submit for AI evaluation.
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-[#c8e3f5] pt-4">
                    <button
                      type="button"
                      onClick={resetRecording}
                      disabled={isAnalyzing || (!audioBlob && !isRecording)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#1478bd] disabled:cursor-not-allowed disabled:opacity-40"
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
                          !audioBlob ||
                          currentScenario.options.length === 0 ||
                          isRecording ||
                          isAnalyzing
                        }
                        className="flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#062b4f] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isAnalyzing
                          ? "AI Analyzing..."
                          : "Submit for AI Evaluation"}

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

              {submitted && (
                <section
                  className={`rounded-xl border p-6 shadow-sm ${
                    isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isCorrect
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {isCorrect ? <Check size={20} /> : <Info size={20} />}
                    </div>

                    <div>
                      <h2
                        className={`text-base font-bold ${
                          isCorrect ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {isCorrect ? "Correct!" : "Incorrect"}
                      </h2>

                      {aiScore !== null && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <ScoreCard label="Overall" value={aiScore} />

                          <ScoreCard label="Clarity" value={aiClarity ?? 0} />

                          <ScoreCard
                            label="Phraseology"
                            value={aiPhraseology ?? 0}
                          />
                        </div>
                      )}

                      {transcript && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Transcript
                          </p>

                          <p className="mt-2 text-xs leading-5 text-[#173b5e]">
                            “{transcript}”
                          </p>
                        </div>
                      )}

                      <p className="mt-4 text-xs leading-5 text-slate-600">
                        {aiFeedback ||
                          currentScenario.explanation ||
                          "No AI feedback is available for this scenario."}
                      </p>

                      {!isCorrect && currentScenario.correctOptionId && (
                        <p className="mt-3 text-xs font-semibold text-red-600">
                          Correct answer:{" "}
                          {currentScenario.correctOptionId.toUpperCase()}
                        </p>
                      )}

                      <div className="mt-4 rounded-lg border border-green-200 bg-white p-3">
                        <p className="text-xs font-semibold text-green-700">
                          Progress saved
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Module progress: {moduleProgress}%
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-5">
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

                  {currentScenario.studentRole && (
                    <InfoRow
                      label="Your Role"
                      value={currentScenario.studentRole}
                    />
                  )}

                  {currentScenario.communicationChannel && (
                    <InfoRow
                      label="Channel"
                      value={currentScenario.communicationChannel}
                    />
                  )}

                  {currentScenario.responseMode && (
                    <InfoRow
                      label="Response Mode"
                      value={currentScenario.responseMode}
                    />
                  )}

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {module.description || "No module description available."}
                    </p>
                  </div>

                  {currentScenario.situation && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Situation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {currentScenario.situation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CircleHelp size={17} className="text-[#1478bd]" />

                  <h3 className="text-sm font-bold text-[#062b4f]">Tips</h3>
                </div>

                <div className="mt-4 space-y-3">
                  <Tip text="Use standard Seaspeak phrases." />
                  <Tip text="Be clear and concise." />
                  <Tip text={'End with "Over".'} />
                  <Tip text="Listen to the model pronunciation before speaking." />
                </div>
              </div>

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
                  <strong>Current setup:</strong> Audio is sent to AI
                  evaluation. Camera support is available for the student but is
                  not sent to the AI evaluator.
                </div>
              </div>
            </aside>
          </div>

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
                (!submitted &&
                  !completedScenarioIds.includes(currentScenario.id)) ||
                currentScenarioIndex >= scenarios.length - 1
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

function AnswerOption({
  letter,
  text,
  selected,
  submitted,
  correct,
  isPlaying,
  speechSupported,
  onClick,
  onPlay,
}: {
  letter: string;
  text: string;
  selected: boolean;
  submitted: boolean;
  correct: boolean;
  isPlaying: boolean;
  speechSupported: boolean;
  onClick: () => void;
  onPlay: () => void;
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
    <div
      className={`flex w-full items-center gap-2 rounded-xl border p-2 transition ${containerClass}`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={submitted}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-lg p-2 text-left transition hover:bg-black/[0.02] disabled:cursor-default"
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${letterClass}`}
        >
          {submitted && correct ? <Check size={16} /> : letter.toUpperCase()}
        </div>

        <span className="min-w-0 flex-1 text-sm font-medium leading-6 text-[#173b5e]">
          {text}
        </span>
      </button>

      <button
        type="button"
        onClick={onPlay}
        disabled={!speechSupported}
        aria-label={
          isPlaying
            ? `Stop practice for option ${letter}`
            : `Listen to option ${letter}`
        }
        title={
          isPlaying ? "Stop practice" : "Listen to recommended pronunciation"
        }
        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          isPlaying
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-[#e6f3fb] text-[#0b4778] hover:bg-[#dcecf9]"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {isPlaying ? (
          <>
            <Square size={14} fill="currentColor" />

            <span className="hidden sm:inline">Stop</span>
          </>
        ) : (
          <>
            <Play size={14} fill="currentColor" />

            <span className="hidden sm:inline">Listen</span>
          </>
        )}
      </button>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-[#0b4778]">{value}%</p>
    </div>
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

function BookOpenIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f3fb] text-[#1478bd]">
      <Play size={20} />
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f8fb]">
          <div className="flex min-h-screen items-center justify-center">
            <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-sm text-slate-500">Loading simulation...</p>
            </div>
          </div>
        </div>
      }
    >
      <SimulationPageContent />
    </Suspense>
  );
}
