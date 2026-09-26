"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";

import { useEffect, useState } from "react";

import {
  Anchor,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Plus,
  Radio,
  RefreshCw,
  Ship,
  Trash2,
  TriangleAlert,
  Video,
  Waves,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

type Module = {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  order: number;
  published: boolean;
  videoUrl: string;
};

type ModuleForm = {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  order: number;
  published: boolean;
  videoUrl: string;
};

type DialogueLine = {
  order: number;
  speaker: string;
  station: string;
  text: string;
};

type ScenarioOption = {
  id: string;
  text: string;
};

type WrongAnswerEffect = {
  enabled: boolean;
  type: "text" | "video";
  description: string;
  videoUrl: string;
};

type Assessment = {
  enabled: boolean;
  evaluateAccuracy: boolean;
  evaluatePhraseology: boolean;
  evaluateClarity: boolean;
  evaluatePronunciation: boolean;
  evaluateFluency: boolean;
};

type Scenario = {
  id: string;
  title: string;
  description: string;
  order: number;
  published: boolean;

  studentRole: string;
  communicationChannel: string;
  situation: string;

  dialogue: DialogueLine[];

  prompt: string;
  responseMode: string;

  options: ScenarioOption[];
  correctOptionId: string;

  expectedResponse: string;
  explanation: string;

  wrongAnswerEffect: WrongAnswerEffect;

  assessment: Assessment;
};

type ScenarioForm = Omit<Scenario, "id"> & {
  id: string;
};

/* =========================================================
   DEFAULTS
========================================================= */

const emptyModuleForm: ModuleForm = {
  id: "",
  title: "",
  description: "",
  type: "Operations",
  difficulty: "Beginner",
  order: 1,
  published: true,
  videoUrl: "",
};

const emptyScenarioForm: ScenarioForm = {
  id: "",
  title: "",
  description: "",
  order: 1,
  published: true,

  studentRole: "Officer",
  communicationChannel: "VHF",
  situation: "",

  dialogue: [
    {
      order: 1,
      speaker: "Bridge",
      station: "Bridge",
      text: "",
    },
  ],

  prompt:
    "Listen to the communication from the Bridge, select the best verbal response, then say your response clearly.",

  responseMode: "select-and-speak",

  options: [
    {
      id: "option-a",
      text: "",
    },
    {
      id: "option-b",
      text: "",
    },
  ],

  correctOptionId: "",

  expectedResponse: "",
  explanation: "",

  wrongAnswerEffect: {
    enabled: false,
    type: "text",
    description: "",
    videoUrl: "",
  },

  assessment: {
    enabled: false,
    evaluateAccuracy: true,
    evaluatePhraseology: true,
    evaluateClarity: true,
    evaluatePronunciation: false,
    evaluateFluency: false,
  },
};

/* =========================================================
   HELPERS
========================================================= */

const moduleIconMap: Record<string, React.ComponentType<any>> = {
  Communication: Radio,
  Operations: Anchor,
  Navigation: BookOpen,
  Emergency: TriangleAlert,
};

function getModuleIcon(type: string) {
  return moduleIconMap[type] || Ship;
}

function createOptionId(index: number) {
  return `option-${String.fromCharCode(97 + index)}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminModulesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const [scenariosByModule, setScenariosByModule] = useState<
    Record<string, Scenario[]>
  >({});

  const [loadingScenarios, setLoadingScenarios] = useState<
    Record<string, boolean>
  >({});

  /* =======================================================
     MODULE MODAL
  ======================================================= */

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModuleForm);

  const [savingModule, setSavingModule] = useState(false);

  /* =======================================================
     SCENARIO MODAL
  ======================================================= */

  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const [scenarioModuleId, setScenarioModuleId] = useState<string | null>(null);

  const [scenarioForm, setScenarioForm] =
    useState<ScenarioForm>(emptyScenarioForm);

  const [savingScenario, setSavingScenario] = useState(false);

  /* =======================================================
     ADMIN CHECK
  ======================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    async function checkAdmin() {
      try {
        const userRef = doc(db, "users", user!.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          router.replace("/");
          return;
        }

        const userData = userSnap.data();

        if (userData.role !== "admin") {
          router.replace("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.replace("/");
      }
    }

    checkAdmin();
  }, [user, authLoading, router]);

  /* =======================================================
     LOAD MODULES
  ======================================================= */

  async function loadModules() {
    try {
      setLoadingModules(true);

      const snapshot = await getDocs(collection(db, "modules"));

      const loadedModules: Module[] = snapshot.docs
        .map((item) => {
          const data = item.data();

          return {
            id: item.id,
            title: data.title || "",
            description: data.description || "",
            type: data.type || "Operations",
            difficulty: data.difficulty || "Beginner",
            order: Number(data.order ?? 1),
            published: data.published !== false,
            videoUrl: data.videoUrl || "",
          };
        })
        .sort((a, b) => a.order - b.order);

      setModules(loadedModules);
    } catch (error) {
      console.error("Error loading modules:", error);
      alert("Unable to load modules.");
    } finally {
      setLoadingModules(false);
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return;

    loadModules();
  }, [user, isAdmin]);

  /* =======================================================
     LOAD SCENARIOS
  ======================================================= */

  async function loadScenarios(moduleId: string) {
    try {
      setLoadingScenarios((prev) => ({
        ...prev,
        [moduleId]: true,
      }));

      const snapshot = await getDocs(
        collection(db, "modules", moduleId, "scenarios"),
      );

      const loadedScenarios: Scenario[] = snapshot.docs
        .map((item) => {
          const data = item.data();

          const dialogue: DialogueLine[] = Array.isArray(data.dialogue)
            ? data.dialogue.map((line: any, index: number) => ({
                order: Number(line?.order ?? index + 1),
                speaker: line?.speaker || "",
                station: line?.station || "",
                text: line?.text || "",
              }))
            : [];

          const options: ScenarioOption[] = Array.isArray(data.options)
            ? data.options.map((option: any, index: number) => ({
                id: option?.id || createOptionId(index),
                text: option?.text || "",
              }))
            : [];

          const wrongAnswerEffect: WrongAnswerEffect = {
            enabled: data.wrongAnswerEffect?.enabled === true,
            type: data.wrongAnswerEffect?.type === "video" ? "video" : "text",
            description: data.wrongAnswerEffect?.description || "",
            videoUrl: data.wrongAnswerEffect?.videoUrl || "",
          };

          const assessment: Assessment = {
            enabled: data.assessment?.enabled === true,
            evaluateAccuracy: data.assessment?.evaluateAccuracy === true,
            evaluatePhraseology: data.assessment?.evaluatePhraseology === true,
            evaluateClarity: data.assessment?.evaluateClarity === true,
            evaluatePronunciation:
              data.assessment?.evaluatePronunciation === true,
            evaluateFluency: data.assessment?.evaluateFluency === true,
          };

          return {
            id: item.id,
            title: data.title || "",
            description: data.description || "",
            order: Number(data.order ?? 1),
            published: data.published !== false,

            studentRole: data.studentRole || "Officer",
            communicationChannel: data.communicationChannel || "VHF",
            situation: data.situation || "",

            dialogue,

            prompt: data.prompt || "",
            responseMode: data.responseMode || "select-and-speak",

            options,

            correctOptionId: data.correctOptionId || "",

            expectedResponse: data.expectedResponse || "",
            explanation: data.explanation || "",

            wrongAnswerEffect,

            assessment,
          };
        })
        .sort((a, b) => a.order - b.order);

      setScenariosByModule((prev) => ({
        ...prev,
        [moduleId]: loadedScenarios,
      }));
    } catch (error) {
      console.error("Error loading scenarios:", error);
      alert("Unable to load scenarios.");
    } finally {
      setLoadingScenarios((prev) => ({
        ...prev,
        [moduleId]: false,
      }));
    }
  }

  /* =======================================================
     EXPAND MODULE / SCENARIOS
  ======================================================= */

  async function toggleScenarios(moduleId: string) {
    const currentlyExpanded = expandedModules[moduleId];

    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !currentlyExpanded,
    }));

    if (!currentlyExpanded && scenariosByModule[moduleId] === undefined) {
      await loadScenarios(moduleId);
    }
  }

  /* =======================================================
     MODULE ACTIONS
  ======================================================= */

  function openAddModule() {
    const nextOrder =
      modules.length > 0
        ? Math.max(...modules.map((module) => module.order)) + 1
        : 1;

    setEditingModule(null);

    setModuleForm({
      ...emptyModuleForm,
      order: nextOrder,
    });

    setShowModuleModal(true);
  }

  function openEditModule(module: Module) {
    setEditingModule(module);

    setModuleForm({
      id: module.id,
      title: module.title,
      description: module.description,
      type: module.type,
      difficulty: module.difficulty,
      order: module.order,
      published: module.published,
      videoUrl: module.videoUrl,
    });

    setShowModuleModal(true);
  }

  function closeModuleModal() {
    if (savingModule) return;

    setShowModuleModal(false);
    setEditingModule(null);
    setModuleForm(emptyModuleForm);
  }

  async function handleSaveModule() {
    if (!user) return;

    const moduleId = moduleForm.id.trim().toLowerCase();

    if (!moduleId) {
      alert("Please enter a Module ID.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(moduleId)) {
      alert(
        "Module ID may only contain lowercase letters, numbers, and hyphens.",
      );
      return;
    }

    if (!moduleForm.title.trim()) {
      alert("Please enter a module title.");
      return;
    }

    if (!Number.isFinite(moduleForm.order) || moduleForm.order < 1) {
      alert("Display order must be 1 or higher.");
      return;
    }

    try {
      setSavingModule(true);

      const moduleRef = doc(db, "modules", moduleId);

      if (!editingModule) {
        const existing = await getDoc(moduleRef);

        if (existing.exists()) {
          alert(
            "A module with this ID already exists. Please choose another ID.",
          );
          return;
        }

        await setDoc(moduleRef, {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          type: moduleForm.type,
          difficulty: moduleForm.difficulty,
          order: Number(moduleForm.order),
          published: moduleForm.published,
          videoUrl: moduleForm.videoUrl.trim(),

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
        });
      } else {
        await updateDoc(moduleRef, {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          type: moduleForm.type,
          difficulty: moduleForm.difficulty,
          order: Number(moduleForm.order),
          published: moduleForm.published,
          videoUrl: moduleForm.videoUrl.trim(),

          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }

      await loadModules();

      closeModuleModal();
    } catch (error) {
      console.error("Error saving module:", error);
      alert("Unable to save the module.");
    } finally {
      setSavingModule(false);
    }
  }

  async function togglePublished(module: Module) {
    try {
      await updateDoc(doc(db, "modules", module.id), {
        published: !module.published,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setModules((prev) =>
        prev.map((item) =>
          item.id === module.id
            ? {
                ...item,
                published: !item.published,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Error updating module status:", error);
      alert("Unable to update module status.");
    }
  }

  async function deleteModule(module: Module) {
    const confirmed = window.confirm(
      `Delete "${module.title}"?\n\nThe module document will be deleted. Its scenarios are not automatically deleted by Firestore.`,
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "modules", module.id));

      setModules((prev) => prev.filter((item) => item.id !== module.id));

      setScenariosByModule((prev) => {
        const next = { ...prev };
        delete next[module.id];
        return next;
      });

      setExpandedModules((prev) => {
        const next = { ...prev };
        delete next[module.id];
        return next;
      });
    } catch (error) {
      console.error("Error deleting module:", error);
      alert("Unable to delete module.");
    }
  }

  /* =======================================================
     SCENARIO ACTIONS
  ======================================================= */

  function getNextScenarioOrder(moduleId: string) {
    const scenarios = scenariosByModule[moduleId] || [];

    if (scenarios.length === 0) return 1;

    return Math.max(...scenarios.map((scenario) => scenario.order)) + 1;
  }

  function openAddScenario(moduleId: string) {
    setScenarioModuleId(moduleId);
    setEditingScenario(null);

    setScenarioForm({
      ...emptyScenarioForm,
      order: getNextScenarioOrder(moduleId),
      dialogue: [
        {
          order: 1,
          speaker: "Bridge",
          station: "Bridge",
          text: "",
        },
      ],
      options: [
        {
          id: "option-a",
          text: "",
        },
        {
          id: "option-b",
          text: "",
        },
      ],
    });

    setShowScenarioModal(true);
  }

  function openEditScenario(moduleId: string, scenario: Scenario) {
    setScenarioModuleId(moduleId);
    setEditingScenario(scenario);

    setScenarioForm({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      order: scenario.order,
      published: scenario.published,

      studentRole: scenario.studentRole,
      communicationChannel: scenario.communicationChannel,
      situation: scenario.situation,

      dialogue:
        scenario.dialogue.length > 0
          ? scenario.dialogue.map((line) => ({
              ...line,
            }))
          : [
              {
                order: 1,
                speaker: "Bridge",
                station: "Bridge",
                text: "",
              },
            ],

      prompt: scenario.prompt,
      responseMode: scenario.responseMode,

      options:
        scenario.options.length > 0
          ? scenario.options.map((option) => ({
              ...option,
            }))
          : [
              {
                id: "option-a",
                text: "",
              },
              {
                id: "option-b",
                text: "",
              },
            ],

      correctOptionId: scenario.correctOptionId,

      expectedResponse: scenario.expectedResponse,
      explanation: scenario.explanation,

      wrongAnswerEffect: {
        ...scenario.wrongAnswerEffect,
      },

      assessment: {
        ...scenario.assessment,
      },
    });

    setShowScenarioModal(true);
  }

  function closeScenarioModal() {
    if (savingScenario) return;

    setShowScenarioModal(false);
    setEditingScenario(null);
    setScenarioModuleId(null);
    setScenarioForm(emptyScenarioForm);
  }

  async function handleSaveScenario() {
    if (!user || !scenarioModuleId) return;

    const scenarioId = scenarioForm.id.trim().toLowerCase();

    if (!scenarioId) {
      alert("Please enter a Scenario ID.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(scenarioId)) {
      alert(
        "Scenario ID may only contain lowercase letters, numbers, and hyphens.",
      );
      return;
    }

    if (!scenarioForm.title.trim()) {
      alert("Please enter a scenario title.");
      return;
    }

    if (!Number.isFinite(scenarioForm.order) || scenarioForm.order < 1) {
      alert("Scenario order must be 1 or higher.");
      return;
    }

    if (scenarioForm.dialogue.length === 0) {
      alert("Please add at least one dialogue line.");
      return;
    }

    const hasEmptyDialogue = scenarioForm.dialogue.some(
      (line) => !line.text.trim(),
    );

    if (hasEmptyDialogue) {
      alert("Every dialogue line must have communication text.");
      return;
    }

    if (scenarioForm.options.length < 2) {
      alert("Please add at least two response options.");
      return;
    }

    const hasEmptyOption = scenarioForm.options.some(
      (option) => !option.text.trim(),
    );

    if (hasEmptyOption) {
      alert("Every response option must contain text.");
      return;
    }

    if (!scenarioForm.correctOptionId) {
      alert("Please select the correct response option.");
      return;
    }

    const correctOptionExists = scenarioForm.options.some(
      (option) => option.id === scenarioForm.correctOptionId,
    );

    if (!correctOptionExists) {
      alert("The selected correct option no longer exists.");
      return;
    }

    try {
      setSavingScenario(true);

      const scenarioRef = doc(
        db,
        "modules",
        scenarioModuleId,
        "scenarios",
        scenarioId,
      );

      const cleanedDialogue = scenarioForm.dialogue.map((line, index) => ({
        order: index + 1,
        speaker: line.speaker.trim(),
        station: line.station.trim(),
        text: line.text.trim(),
      }));

      const cleanedOptions = scenarioForm.options.map((option, index) => ({
        id: option.id,
        text: option.text.trim(),
      }));

      if (!editingScenario) {
        const existing = await getDoc(scenarioRef);

        if (existing.exists()) {
          alert("A scenario with this ID already exists in this module.");
          return;
        }

        await setDoc(scenarioRef, {
          title: scenarioForm.title.trim(),
          description: scenarioForm.description.trim(),
          order: Number(scenarioForm.order),
          published: scenarioForm.published,

          studentRole: scenarioForm.studentRole.trim(),
          communicationChannel: scenarioForm.communicationChannel.trim(),
          situation: scenarioForm.situation.trim(),

          dialogue: cleanedDialogue,

          prompt: scenarioForm.prompt.trim(),
          responseMode: scenarioForm.responseMode,

          options: cleanedOptions,
          correctOptionId: scenarioForm.correctOptionId,

          expectedResponse: scenarioForm.expectedResponse.trim(),
          explanation: scenarioForm.explanation.trim(),

          wrongAnswerEffect: {
            enabled: scenarioForm.wrongAnswerEffect.enabled,
            type: scenarioForm.wrongAnswerEffect.type,
            description: scenarioForm.wrongAnswerEffect.description.trim(),
            videoUrl: scenarioForm.wrongAnswerEffect.videoUrl.trim(),
          },

          assessment: {
            enabled: scenarioForm.assessment.enabled,
            evaluateAccuracy: scenarioForm.assessment.evaluateAccuracy,
            evaluatePhraseology: scenarioForm.assessment.evaluatePhraseology,
            evaluateClarity: scenarioForm.assessment.evaluateClarity,
            evaluatePronunciation:
              scenarioForm.assessment.evaluatePronunciation,
            evaluateFluency: scenarioForm.assessment.evaluateFluency,
          },

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
        });
      } else {
        await updateDoc(scenarioRef, {
          title: scenarioForm.title.trim(),
          description: scenarioForm.description.trim(),
          order: Number(scenarioForm.order),
          published: scenarioForm.published,

          studentRole: scenarioForm.studentRole.trim(),
          communicationChannel: scenarioForm.communicationChannel.trim(),
          situation: scenarioForm.situation.trim(),

          dialogue: cleanedDialogue,

          prompt: scenarioForm.prompt.trim(),
          responseMode: scenarioForm.responseMode,

          options: cleanedOptions,
          correctOptionId: scenarioForm.correctOptionId,

          expectedResponse: scenarioForm.expectedResponse.trim(),
          explanation: scenarioForm.explanation.trim(),

          wrongAnswerEffect: {
            enabled: scenarioForm.wrongAnswerEffect.enabled,
            type: scenarioForm.wrongAnswerEffect.type,
            description: scenarioForm.wrongAnswerEffect.description.trim(),
            videoUrl: scenarioForm.wrongAnswerEffect.videoUrl.trim(),
          },

          assessment: {
            enabled: scenarioForm.assessment.enabled,
            evaluateAccuracy: scenarioForm.assessment.evaluateAccuracy,
            evaluatePhraseology: scenarioForm.assessment.evaluatePhraseology,
            evaluateClarity: scenarioForm.assessment.evaluateClarity,
            evaluatePronunciation:
              scenarioForm.assessment.evaluatePronunciation,
            evaluateFluency: scenarioForm.assessment.evaluateFluency,
          },

          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }

      await loadScenarios(scenarioModuleId);

      closeScenarioModal();
    } catch (error) {
      console.error("Error saving scenario:", error);
      alert("Unable to save the scenario.");
    } finally {
      setSavingScenario(false);
    }
  }

  async function toggleScenarioPublished(moduleId: string, scenario: Scenario) {
    try {
      await updateDoc(doc(db, "modules", moduleId, "scenarios", scenario.id), {
        published: !scenario.published,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setScenariosByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map((item) =>
          item.id === scenario.id
            ? {
                ...item,
                published: !item.published,
              }
            : item,
        ),
      }));
    } catch (error) {
      console.error("Error updating scenario status:", error);
      alert("Unable to update scenario status.");
    }
  }

  async function deleteScenario(moduleId: string, scenario: Scenario) {
    const confirmed = window.confirm(`Delete scenario "${scenario.title}"?`);

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "modules", moduleId, "scenarios", scenario.id));

      setScenariosByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter(
          (item) => item.id !== scenario.id,
        ),
      }));
    } catch (error) {
      console.error("Error deleting scenario:", error);
      alert("Unable to delete scenario.");
    }
  }

  /* =======================================================
     DIALOGUE HELPERS
  ======================================================= */

  function updateDialogue(
    index: number,
    field: keyof DialogueLine,
    value: string,
  ) {
    setScenarioForm((prev) => ({
      ...prev,
      dialogue: prev.dialogue.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    }));
  }

  function addDialogueLine() {
    setScenarioForm((prev) => ({
      ...prev,
      dialogue: [
        ...prev.dialogue,
        {
          order: prev.dialogue.length + 1,
          speaker: "",
          station: "",
          text: "",
        },
      ],
    }));
  }

  function removeDialogueLine(index: number) {
    setScenarioForm((prev) => {
      const updated = prev.dialogue
        .filter((_, lineIndex) => lineIndex !== index)
        .map((line, lineIndex) => ({
          ...line,
          order: lineIndex + 1,
        }));

      return {
        ...prev,
        dialogue: updated,
      };
    });
  }

  function moveDialogueLine(index: number, direction: -1 | 1) {
    setScenarioForm((prev) => {
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= prev.dialogue.length) {
        return prev;
      }

      const updated = [...prev.dialogue];

      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

      return {
        ...prev,
        dialogue: updated.map((line, lineIndex) => ({
          ...line,
          order: lineIndex + 1,
        })),
      };
    });
  }

  /* =======================================================
     OPTION HELPERS
  ======================================================= */

  function updateOption(
    index: number,
    field: keyof ScenarioOption,
    value: string,
  ) {
    setScenarioForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              [field]: value,
            }
          : option,
      ),
    }));
  }

  function addOption() {
    setScenarioForm((prev) => {
      const newIndex = prev.options.length;

      return {
        ...prev,
        options: [
          ...prev.options,
          {
            id: createOptionId(newIndex),
            text: "",
          },
        ],
      };
    });
  }

  function removeOption(index: number) {
    setScenarioForm((prev) => {
      const removedOption = prev.options[index];

      const updatedOptions = prev.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          id: createOptionId(optionIndex),
        }));

      const newCorrectOptionId =
        prev.correctOptionId === removedOption?.id ? "" : prev.correctOptionId;

      return {
        ...prev,
        options: updatedOptions,
        correctOptionId: newCorrectOptionId,
      };
    });
  }

  /* =======================================================
     RENDER
  ======================================================= */

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f8fb]">
        <Sidebar />

        <div className="ml-0 lg:ml-64">
          <Topbar />

          <main className="p-6">
            <div className="flex min-h-[50vh] items-center justify-center">
              <RefreshCw className="animate-spin text-[#0b4778]" size={30} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const publishedCount = modules.filter((module) => module.published).length;

  const draftCount = modules.length - publishedCount;

  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-0 lg:ml-64">
        <Topbar />

        <main className="p-4 md:p-6 lg:p-8">
          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <span>/</span>
                <span>Modules Management</span>
              </div>

              <h1 className="text-3xl font-bold text-[#062b4f]">
                Modules Management
              </h1>

              <p className="mt-2 text-slate-600">
                Manage learning modules, scenarios, response options, and
                assessment settings.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadModules}
                disabled={loadingModules}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loadingModules ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openAddModule}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b4778] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#062b4f]"
              >
                <Plus size={18} />
                Add Module
              </button>
            </div>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total Modules
              </p>

              <p className="mt-1 text-3xl font-bold text-[#062b4f]">
                {modules.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Published</p>

              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {publishedCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Drafts</p>

              <p className="mt-1 text-3xl font-bold text-amber-600">
                {draftCount}
              </p>
            </div>
          </div>

          {/* =================================================
              MODULE LIST
          ================================================= */}

          {loadingModules ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white">
              <RefreshCw size={30} className="animate-spin text-[#0b4778]" />
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Ship size={42} className="mx-auto mb-4 text-slate-300" />

              <h2 className="text-lg font-semibold text-[#062b4f]">
                No modules yet
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create your first learning module to get started.
              </p>

              <button
                type="button"
                onClick={openAddModule}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={17} />
                Add Module
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {modules.map((module) => {
                const Icon = getModuleIcon(module.type);

                const isExpanded = expandedModules[module.id] === true;

                const scenarios = scenariosByModule[module.id] || [];

                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* MODULE HEADER */}

                    <div className="p-5 md:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e6f3fb] text-[#0b4778]">
                            <Icon size={24} />
                          </div>

                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h2 className="text-xl font-bold text-[#062b4f]">
                                {module.title}
                              </h2>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  module.published
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {module.published ? "Published" : "Draft"}
                              </span>
                            </div>

                            <p className="mb-3 text-xs font-mono text-slate-400">
                              {module.id}
                            </p>

                            <p className="max-w-3xl text-sm leading-6 text-slate-600">
                              {module.description || "No description provided."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {module.type}
                              </span>

                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {module.difficulty}
                              </span>

                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                Order {module.order}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* MODULE ACTIONS */}

                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          {module.videoUrl && (
                            <a
                              href={module.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              <Video size={16} />
                              Video
                              <ExternalLink size={13} />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModule(module)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            <Edit3 size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePublished(module)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              module.published
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {module.published ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteModule(module)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* SCENARIO TOGGLE */}

                      <div className="mt-6 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={() => toggleScenarios(module.id)}
                          className="flex w-full items-center justify-between rounded-lg bg-[#f5f8fb] px-4 py-3 text-left transition hover:bg-[#eaf3f8]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0b4778] shadow-sm">
                              <Waves size={18} />
                            </div>

                            <div>
                              <p className="font-semibold text-[#062b4f]">
                                Scenarios
                              </p>

                              <p className="text-xs text-slate-500">
                                {scenariosByModule[module.id] === undefined
                                  ? "Click to load scenarios"
                                  : `${scenarios.length} scenario${
                                      scenarios.length === 1 ? "" : "s"
                                    }`}
                              </p>
                            </div>
                          </div>

                          {isExpanded ? (
                            <ChevronUp size={20} className="text-slate-500" />
                          ) : (
                            <ChevronDown size={20} className="text-slate-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* =================================================
                        SCENARIOS SECTION
                    ================================================= */}

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-[#f9fbfc] px-5 py-5 md:px-6">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-bold text-[#062b4f]">
                              Scenario Management
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Create and configure the communication exercises
                              for this module.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openAddScenario(module.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b4778] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062b4f]"
                          >
                            <Plus size={17} />
                            Add Scenario
                          </button>
                        </div>

                        {loadingScenarios[module.id] ? (
                          <div className="flex min-h-[150px] items-center justify-center">
                            <RefreshCw
                              size={25}
                              className="animate-spin text-[#0b4778]"
                            />
                          </div>
                        ) : scenarios.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                            <Radio
                              size={32}
                              className="mx-auto mb-3 text-slate-300"
                            />

                            <p className="font-semibold text-slate-600">
                              No scenarios yet
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Add the first communication scenario for this
                              module.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {scenarios.map((scenario, index) => (
                              <div
                                key={scenario.id}
                                className="rounded-lg border border-slate-200 bg-white p-4"
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f3fb] text-sm font-bold text-[#0b4778]">
                                      {String(index + 1).padStart(2, "0")}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold text-[#062b4f]">
                                          {scenario.title}
                                        </h4>

                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            scenario.published
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-amber-50 text-amber-700"
                                          }`}
                                        >
                                          {scenario.published
                                            ? "Published"
                                            : "Draft"}
                                        </span>
                                      </div>

                                      <p className="mt-1 font-mono text-xs text-slate-400">
                                        {scenario.id}
                                      </p>

                                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                                        {scenario.description ||
                                          "No description provided."}
                                      </p>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                          {scenario.communicationChannel}
                                        </span>

                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                          {scenario.studentRole}
                                        </span>

                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                          {scenario.options.length} options
                                        </span>

                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                          Order {scenario.order}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEditScenario(module.id, scenario)
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                      <Edit3 size={15} />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleScenarioPublished(
                                          module.id,
                                          scenario,
                                        )
                                      }
                                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                        scenario.published
                                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                                          : "bg-emerald-600 text-white"
                                      }`}
                                    >
                                      {scenario.published
                                        ? "Unpublish"
                                        : "Publish"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteScenario(module.id, scenario)
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={15} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* =====================================================
          MODULE MODAL
      ===================================================== */}

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-[#062b4f]">
                  {editingModule ? "Edit Module" : "Add Module"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the learning module information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModuleModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* MODULE ID */}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Module ID
                </label>

                <input
                  value={moduleForm.id}
                  disabled={!!editingModule}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      id: event.target.value,
                    }))
                  }
                  placeholder="anchoring-operations"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20 disabled:bg-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              {/* TITLE */}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Module Title
                </label>

                <input
                  value={moduleForm.title}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Anchoring Operations"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={moduleForm.description}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Essential anchoring communication and standard phraseology."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                />
              </div>

              {/* TYPE / DIFFICULTY */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Type
                  </label>

                  <select
                    value={moduleForm.type}
                    onChange={(event) =>
                      setModuleForm((prev) => ({
                        ...prev,
                        type: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                  >
                    <option>Communication</option>
                    <option>Operations</option>
                    <option>Navigation</option>
                    <option>Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Difficulty
                  </label>

                  <select
                    value={moduleForm.difficulty}
                    onChange={(event) =>
                      setModuleForm((prev) => ({
                        ...prev,
                        difficulty: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>

              {/* ORDER */}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Display Order
                </label>

                <input
                  type="number"
                  min={1}
                  value={moduleForm.order}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      order: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                />
              </div>

              {/* VIDEO */}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Learning Video URL
                </label>

                <input
                  type="url"
                  value={moduleForm.videoUrl}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      videoUrl: event.target.value,
                    }))
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Optional YouTube or other learning video.
                </p>
              </div>

              {/* PUBLISHED */}

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={moduleForm.published}
                  onChange={(event) =>
                    setModuleForm((prev) => ({
                      ...prev,
                      published: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#0b4778]"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Published
                  </p>

                  <p className="text-xs text-slate-500">
                    Published modules can be accessed by students.
                  </p>
                </div>
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeModuleModal}
                disabled={savingModule}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveModule}
                disabled={savingModule}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062b4f] disabled:opacity-50"
              >
                {savingModule && (
                  <RefreshCw size={16} className="animate-spin" />
                )}

                {savingModule
                  ? "Saving..."
                  : editingModule
                    ? "Save Changes"
                    : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SCENARIO MODAL
      ===================================================== */}

      {showScenarioModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 md:p-6">
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Waves size={20} className="text-[#0b4778]" />

                  <h2 className="text-xl font-bold text-[#062b4f]">
                    {editingScenario ? "Edit Scenario" : "Add Scenario"}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the complete communication exercise.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScenarioModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={21} />
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto">
              <div className="space-y-8 p-5 md:p-6">
                {/* =================================================
                    SECTION 1 — BASIC INFORMATION
                ================================================= */}

                <section>
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      1. Scenario Information
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Basic information shown to the learner and used to
                      organize the scenario.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Scenario ID
                      </label>

                      <input
                        value={scenarioForm.id}
                        disabled={!!editingScenario}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            id: event.target.value,
                          }))
                        }
                        placeholder="scenario-01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20 disabled:bg-slate-100"
                      />

                      <p className="mt-1 text-xs text-slate-400">
                        Lowercase letters, numbers, and hyphens.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Title
                      </label>

                      <input
                        value={scenarioForm.title}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Stand by for anchoring"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Description
                      </label>

                      <textarea
                        rows={2}
                        value={scenarioForm.description}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Brief description of this exercise."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Student Role
                      </label>

                      <input
                        value={scenarioForm.studentRole}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            studentRole: event.target.value,
                          }))
                        }
                        placeholder="Officer"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Communication Channel
                      </label>

                      <select
                        value={scenarioForm.communicationChannel}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            communicationChannel: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      >
                        <option>VHF</option>
                        <option>Internal Communication</option>
                        <option>Telephone</option>
                        <option>Face-to-Face</option>
                        <option>PA System</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Display Order
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={scenarioForm.order}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            order: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Visibility
                      </label>

                      <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3">
                        <input
                          type="checkbox"
                          checked={scenarioForm.published}
                          onChange={(event) =>
                            setScenarioForm((prev) => ({
                              ...prev,
                              published: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[#0b4778]"
                        />

                        <span className="text-sm text-slate-600">
                          Published
                        </span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Situation
                      </label>

                      <textarea
                        rows={3}
                        value={scenarioForm.situation}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            situation: event.target.value,
                          }))
                        }
                        placeholder="Describe the operational situation..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>
                  </div>
                </section>

                {/* =================================================
                    SECTION 2 — DIALOGUE
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#062b4f]">
                        2. Bridge Communication
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Build the communication the student will listen to.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addDialogueLine}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0b4778] px-3 py-2 text-xs font-semibold text-white hover:bg-[#062b4f]"
                    >
                      <Plus size={15} />
                      Add Line
                    </button>
                  </div>

                  <div className="space-y-3">
                    {scenarioForm.dialogue.map((line, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-[#f9fbfc] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b4778] text-xs font-bold text-white">
                              {index + 1}
                            </span>

                            <span className="text-sm font-semibold text-[#062b4f]">
                              Communication Line
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveDialogueLine(index, -1)}
                              disabled={index === 0}
                              className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveDialogueLine(index, 1)}
                              disabled={
                                index === scenarioForm.dialogue.length - 1
                              }
                              className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeDialogueLine(index)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              title="Remove line"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Speaker
                            </label>

                            <input
                              value={line.speaker}
                              onChange={(event) =>
                                updateDialogue(
                                  index,
                                  "speaker",
                                  event.target.value,
                                )
                              }
                              placeholder="Bridge"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Station
                            </label>

                            <input
                              value={line.station}
                              onChange={(event) =>
                                updateDialogue(
                                  index,
                                  "station",
                                  event.target.value,
                                )
                              }
                              placeholder="Bridge"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Communication Text
                            </label>

                            <textarea
                              rows={2}
                              value={line.text}
                              onChange={(event) =>
                                updateDialogue(
                                  index,
                                  "text",
                                  event.target.value,
                                )
                              }
                              placeholder="Forward, this is Bridge. Stand by for anchoring. Over."
                              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* =================================================
                    SECTION 3 — STUDENT RESPONSE
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      3. Student Response
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Configure what the learner is asked to do after hearing
                      the communication.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Prompt
                      </label>

                      <textarea
                        rows={3}
                        value={scenarioForm.prompt}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            prompt: event.target.value,
                          }))
                        }
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Response Mode
                      </label>

                      <select
                        value={scenarioForm.responseMode}
                        onChange={(event) =>
                          setScenarioForm((prev) => ({
                            ...prev,
                            responseMode: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                      >
                        <option value="select-and-speak">
                          Select and Speak
                        </option>
                        <option value="select-only">Select Only</option>
                        <option value="speak-only">Speak Only</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* =================================================
                    SECTION 4 — OPTIONS
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#062b4f]">
                        4. Response Options
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Add possible verbal responses and identify the correct
                        one.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0b4778] px-3 py-2 text-xs font-semibold text-white hover:bg-[#062b4f]"
                    >
                      <Plus size={15} />
                      Add Option
                    </button>
                  </div>

                  <div className="space-y-3">
                    {scenarioForm.options.map((option, index) => {
                      const isCorrect =
                        scenarioForm.correctOptionId === option.id;

                      return (
                        <div
                          key={option.id}
                          className={`rounded-xl border p-4 ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50/50"
                              : "border-slate-200 bg-[#f9fbfc]"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#0b4778] shadow-sm">
                              {String.fromCharCode(65 + index)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-500">
                                  Option {String.fromCharCode(65 + index)}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => removeOption(index)}
                                  disabled={scenarioForm.options.length <= 2}
                                  className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                  title="Remove option"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={option.text}
                                onChange={(event) =>
                                  updateOption(
                                    index,
                                    "text",
                                    event.target.value,
                                  )
                                }
                                placeholder="Enter the student's possible response..."
                                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                              />

                              <label className="mt-3 inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="radio"
                                  name="correctOption"
                                  checked={isCorrect}
                                  onChange={() =>
                                    setScenarioForm((prev) => ({
                                      ...prev,
                                      correctOptionId: option.id,
                                    }))
                                  }
                                  className="h-4 w-4 accent-emerald-600"
                                />

                                <span
                                  className={`text-xs font-semibold ${
                                    isCorrect
                                      ? "text-emerald-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {isCorrect
                                    ? "Correct response"
                                    : "Mark as correct"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* =================================================
                    SECTION 5 — EXPECTED RESPONSE
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      5. Expected Response
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      The response the student should ideally say aloud.
                    </p>
                  </div>

                  <textarea
                    rows={4}
                    value={scenarioForm.expectedResponse}
                    onChange={(event) =>
                      setScenarioForm((prev) => ({
                        ...prev,
                        expectedResponse: event.target.value,
                      }))
                    }
                    placeholder="Bridge, this is Forward. Anchor party ready. Anchor cleared away. Over."
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                  />
                </section>

                {/* =================================================
                    SECTION 6 — EXPLANATION
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      6. Explanation
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Explain why the correct response follows standard maritime
                      communication.
                    </p>
                  </div>

                  <textarea
                    rows={4}
                    value={scenarioForm.explanation}
                    onChange={(event) =>
                      setScenarioForm((prev) => ({
                        ...prev,
                        explanation: event.target.value,
                      }))
                    }
                    placeholder="This response correctly identifies the station and uses standard phraseology..."
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                  />
                </section>

                {/* =================================================
                    SECTION 7 — WRONG ANSWER EFFECT
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      7. Wrong Answer Effect
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Optional feedback or consequence shown when the learner
                      selects an incorrect response.
                    </p>
                  </div>

                  <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={scenarioForm.wrongAnswerEffect.enabled}
                      onChange={(event) =>
                        setScenarioForm((prev) => ({
                          ...prev,
                          wrongAnswerEffect: {
                            ...prev.wrongAnswerEffect,
                            enabled: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 accent-[#0b4778]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Enable wrong-answer effect
                      </p>

                      <p className="text-xs text-slate-500">
                        Provide additional feedback when the selected answer is
                        incorrect.
                      </p>
                    </div>
                  </label>

                  {scenarioForm.wrongAnswerEffect.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Effect Type
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setScenarioForm((prev) => ({
                                ...prev,
                                wrongAnswerEffect: {
                                  ...prev.wrongAnswerEffect,
                                  type: "text",
                                },
                              }))
                            }
                            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                              scenarioForm.wrongAnswerEffect.type === "text"
                                ? "border-[#0b4778] bg-[#e6f3fb] text-[#0b4778]"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            Text Feedback
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScenarioForm((prev) => ({
                                ...prev,
                                wrongAnswerEffect: {
                                  ...prev.wrongAnswerEffect,
                                  type: "video",
                                },
                              }))
                            }
                            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                              scenarioForm.wrongAnswerEffect.type === "video"
                                ? "border-[#0b4778] bg-[#e6f3fb] text-[#0b4778]"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            Video Feedback
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Description
                        </label>

                        <textarea
                          rows={3}
                          value={scenarioForm.wrongAnswerEffect.description}
                          onChange={(event) =>
                            setScenarioForm((prev) => ({
                              ...prev,
                              wrongAnswerEffect: {
                                ...prev.wrongAnswerEffect,
                                description: event.target.value,
                              },
                            }))
                          }
                          placeholder="Explain the communication problem caused by this response..."
                          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                        />
                      </div>

                      {scenarioForm.wrongAnswerEffect.type === "video" && (
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Video URL
                          </label>

                          <input
                            type="url"
                            value={scenarioForm.wrongAnswerEffect.videoUrl}
                            onChange={(event) =>
                              setScenarioForm((prev) => ({
                                ...prev,
                                wrongAnswerEffect: {
                                  ...prev.wrongAnswerEffect,
                                  videoUrl: event.target.value,
                                },
                              }))
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#168dcc] focus:ring-2 focus:ring-[#168dcc]/20"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* =================================================
                    SECTION 8 — AI ASSESSMENT
                ================================================= */}

                <section className="border-t border-slate-200 pt-7">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-[#062b4f]">
                      8. AI Speech Assessment
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Choose which speech characteristics should be evaluated
                      when the student responds aloud.
                    </p>
                  </div>

                  <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={scenarioForm.assessment.enabled}
                      onChange={(event) =>
                        setScenarioForm((prev) => ({
                          ...prev,
                          assessment: {
                            ...prev.assessment,
                            enabled: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 accent-[#0b4778]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Enable AI assessment
                      </p>

                      <p className="text-xs text-slate-500">
                        Evaluate the student's spoken response.
                      </p>
                    </div>
                  </label>

                  {scenarioForm.assessment.enabled && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          key: "evaluateAccuracy",
                          label: "Accuracy",
                        },
                        {
                          key: "evaluatePhraseology",
                          label: "Phraseology",
                        },
                        {
                          key: "evaluateClarity",
                          label: "Clarity",
                        },
                        {
                          key: "evaluatePronunciation",
                          label: "Pronunciation",
                        },
                        {
                          key: "evaluateFluency",
                          label: "Fluency",
                        },
                      ].map((item) => {
                        const key = item.key as keyof Assessment;

                        return (
                          <label
                            key={item.key}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={scenarioForm.assessment[key] as boolean}
                              onChange={(event) =>
                                setScenarioForm((prev) => ({
                                  ...prev,
                                  assessment: {
                                    ...prev.assessment,
                                    [key]: event.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4 accent-[#0b4778]"
                            />

                            <span className="text-sm font-medium text-slate-700">
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-6">
              <button
                type="button"
                onClick={closeScenarioModal}
                disabled={savingScenario}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveScenario}
                disabled={savingScenario}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b4778] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062b4f] disabled:opacity-50"
              >
                {savingScenario && (
                  <RefreshCw size={16} className="animate-spin" />
                )}

                {savingScenario
                  ? "Saving..."
                  : editingScenario
                    ? "Save Scenario"
                    : "Create Scenario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
