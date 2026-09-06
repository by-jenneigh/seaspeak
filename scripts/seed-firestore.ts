import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "../service-account.json";

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount as any),
      });

const db = getFirestore(app);

type Option = {
  id: string;
  text: string;
};

type Dialogue = {
  order: number;
  speaker: string;
  station?: string;
  text: string;
};

type Scenario = {
  title: string;
  description?: string;
  order: number;
  published: boolean;
  studentRole: string;
  communicationChannel: string;
  situation: string;
  dialogue: Dialogue[];
  prompt: string;
  responseMode: string;
  options: Option[];
  correctOptionId: string;
  expectedResponse: string;
  explanation: string;
  wrongAnswerEffect?: {
    enabled: boolean;
    type: "text" | "video";
    description?: string;
    videoUrl?: string;
  };
};

type Module = {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  order: number;
  published: boolean;
  videoUrl: string;
  scenarios: Record<string, Scenario>;
};

/* ============================================================
   MODULE DATA
   ============================================================ */

const modules: Module[] = [
  {
    id: "anchoring",
    title: "Anchoring Operation",
    description:
      "Practice standard maritime communication used during anchoring operations.",
    type: "Operations",
    difficulty: "Beginner",
    order: 1,
    published: true,
    videoUrl: "https://www.youtube.com/watch?v=YOUR_ANCHORING_VIDEO_ID",

    scenarios: {
      "01": {
        title: "Anchor Party Readiness",
        description:
          "Practice communication between the Bridge and Forward Station before anchoring.",
        order: 1,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The vessel is preparing to anchor. The Master communicates with the Forward Station.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Forward, this is Bridge. Stand by for anchoring. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, anchor team ready, we go now. Over.",
          },
          {
            id: "b",
            text: "Bridge, this is Forward. Anchor party ready. Anchor cleared away. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse:
          "Bridge, this is Forward. Anchor party ready. Anchor cleared away. Over.",
        explanation:
          'Option A is incorrect because it uses informal and non-standard phraseology ("we go now") and does not clearly report the readiness status of the anchor party or the anchor itself. Standard communication on board requires clear, precise, and professional language to prevent misunderstandings and ensure safe ship operations.',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "02": {
        title: "Stand By to Let Go Port Anchor",
        order: 2,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The Master has instructed the Forward Station to stand by to let go the port anchor.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Very well. Stand by to let go port anchor in position. Depth is 20 meters. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Standing by to let go port anchor. Depth 20 meters, understood. Over.",
          },
          {
            id: "b",
            text: "Letting go port anchor. Depth 20 meters, understood. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Standing by to let go port anchor. Depth 20 meters, understood. Over.",
        explanation:
          'Option B is incorrect because it indicates that the anchor is already being released, even though the Master only instructed the officer to stand by. The officer must accurately acknowledge the instruction without taking action before the "Let go the anchor" command.',
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            'The officer at the forecastle mistakenly believes the anchoring order has already been given and releases the anchor without receiving the "Let go the anchor" command. The anchor drops rapidly to the seabed while the vessel is still moving faster than intended. The sudden tension on the anchor chain causes it to surge out at high speed, placing heavy stress on the windlass and brake system.',
          videoUrl:
            "https://www.youtube.com/watch?v=YOUR_WRONG_ANSWER_VIDEO_ID",
        },
      },

      "03": {
        title: "Let Go Port Anchor",
        order: 3,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The Master has given the command to let go the port anchor.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Let go port anchor. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Letting go port and starboard anchor… Anchor away. Cable running out. Over.",
          },
          {
            id: "b",
            text: "Letting go port anchor… Anchor away. Cable running out. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse:
          "Letting go port anchor… Anchor away. Cable running out. Over.",
        explanation:
          "Option A is incorrect because it reports that both the port and starboard anchors are being let go, while the Master only ordered the port anchor to be released.",
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The wrong response indicates that both anchors are being released, which can result in an unintended anchoring operation.",
          videoUrl:
            "https://www.youtube.com/watch?v=YOUR_WRONG_ANSWER_VIDEO_ID",
        },
      },

      "04": {
        title: "Cable Up and Down",
        order: 4,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The Master requests the Forward Station to report the cable status.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Report when cable is up and down. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Cable up and down. Over.",
          },
          {
            id: "b",
            text: "Anchor straight down. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Cable up and down. Over.",
        explanation:
          'Option B, "Anchor straight down. Over.", is not the standard phrase requested by the Master. Since the Master asked for the cable status, the officer should report "Cable up and down."',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "05": {
        title: "Five Shackles in the Water",
        order: 5,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The Master orders the Forward Station to pay out five shackles of cable.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Let go more cable. Pay out 5 shackles. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Five chains released. Over.",
          },
          {
            id: "b",
            text: "Cable running out. 5 shackles in the water. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse: "Cable running out. 5 shackles in the water. Over.",
        explanation:
          'Option A is incorrect because "chains" is not the standard term used to report the length of anchor cable paid out. The standard unit is shackles, and the response does not confirm that the cable is actually running out.',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "06": {
        title: "Anchor Holding",
        order: 6,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The Master asks the Forward Station to check and report whether the anchor is holding.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Hold on cable. Check the anchor is holding. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Anchor looking good, cable is tight now. Over.",
          },
          {
            id: "b",
            text: "Anchor holding. Cable leading ahead, slightly tight. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse:
          "Anchor holding. Cable leading ahead, slightly tight. Over.",
        explanation:
          'Option A is incorrect because it uses informal and non-standard language. Phrases such as "looking good" are subjective and can be interpreted differently. Standard maritime communication requires precise terms such as "anchor holding" and "cable leading ahead, slightly tight."',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "07": {
        title: "Windlass Secured",
        order: 7,
        published: true,
        studentRole: "Forward Station Officer",
        communicationChannel: "VHF",
        situation:
          "The vessel has been brought up and the Master instructs the Forward Station to secure the windlass and report.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Very well. Vessel brought up. Secure the windlass and report. Over.",
          },
        ],
        prompt: "How should the Forward Station respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Windlass secured. Anchor operation completed. Over.",
          },
          {
            id: "b",
            text: "Anchoring is done, machine locked. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Windlass secured. Anchor operation completed. Over.",
        explanation:
          'Option B is incorrect because it uses informal and non-standard terms. The word "machine" is vague and does not specifically identify the windlass, while "anchoring is done" is less precise than "anchor operation completed."',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },
    },
  },

  /* ============================================================
     CARGO LOADING
     ============================================================ */

  {
    id: "cargo-loading",
    title: "Cargo Loading Operation",
    description:
      "Practice standardized communication between the vessel and shore terminal during cargo loading.",
    type: "Operations",
    difficulty: "Intermediate",
    order: 2,
    published: true,
    videoUrl: "https://www.youtube.com/watch?v=YOUR_CARGO_VIDEO_ID",

    scenarios: {
      "01": {
        title: "Cargo Loading Readiness",
        order: 1,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master is confirming whether the vessel is ready to begin cargo loading.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Chief Officer, this is Master. Confirm readiness for loading cargo. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Master, this is Chief Officer. Vessel ready for loading. Cargo tanks inspected, valves set, and equipment tested. Over.",
          },
          {
            id: "b",
            text: "Captain, I think we're good to go. The tanks seem okay and the crew has checked some of the equipment. We can probably start loading now. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Master, this is Chief Officer. Vessel ready for loading. Cargo tanks inspected, valves set, and equipment tested. Over.",
        explanation:
          'Option B is incorrect because it uses informal and vague language such as "I think," "we\'re good to go," and "probably," which introduces uncertainty. It also fails to mention specific checks on cargo tanks, valves, or equipment.',
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "Option B uses informal and vague language and fails to confirm specific checks on cargo tanks, valves, and equipment. This could lead to operational errors, safety risks, or environmental incidents.",
        },
      },

      "02": {
        title: "Confirm Readiness with Terminal",
        order: 2,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master instructs the Chief Officer to inform the shore terminal that the vessel is ready.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Very well. Inform shore terminal. Over.",
          },
        ],
        prompt: "What should the Chief Officer say to the terminal?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Terminal, this is Chief Officer. Vessel ready to commence loading. Request confirmation. Over.",
          },
          {
            id: "b",
            text: "Terminal, Chief Officer here. We finished most of the checks and should be okay to start loading soon. If everything looks fine on your side, maybe we can begin whenever ready. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Terminal, this is Chief Officer. Vessel ready to commence loading. Request confirmation. Over.",
        explanation:
          'Option B is wrong because it uses unclear, informal, and uncertain language such as "finished most of the checks," "should be okay," "maybe," and "whenever ready."',
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The terminal may be unsure whether the ship is actually ready or whether loading has been authorized. Vague communication can cause delays, operational errors, or accidents.",
        },
      },

      "03": {
        title: "Standing By",
        order: 3,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The shore terminal informs the vessel that loading will begin in five minutes.",
        dialogue: [
          {
            order: 1,
            speaker: "Shore Terminal Operator",
            station: "Terminal",
            text: "Chief Officer, this is Terminal. Loading will start in 5 minutes at initial rate. Please stand by for confirmation. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Understood. Standing by. Over.",
          },
          {
            id: "b",
            text: "Okay, will wait for your go. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Understood. Standing by. Over.",
        explanation:
          'Option B is incorrect because it uses informal language such as "Okay" and "your go," which are not standard maritime phrases.',
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The phrase 'your go' is vague and could create confusion about whether loading has been authorized.",
        },
      },

      "04": {
        title: "Confirm Loading Rate",
        order: 4,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The terminal reports that loading has commenced at a rate of 500 cubic meters per hour.",
        dialogue: [
          {
            order: 1,
            speaker: "Shore Terminal Operator",
            station: "Terminal",
            text: "Chief Officer, this is Terminal. Loading commenced. Present rate: 500 cubic meters per hour. Over.",
          },
        ],
        prompt: "How should the Chief Officer acknowledge the loading rate?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Copy. Loading commenced at 500 liter per hour. Monitoring tanks. Over.",
          },
          {
            id: "b",
            text: "Copy. Loading commenced at 500 cubic meters per hour. Monitoring tanks. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse:
          "Copy. Loading commenced at 500 cubic meters per hour. Monitoring tanks. Over.",
        explanation:
          "Option A is wrong because the loading rate is repeated incorrectly as 500 liters per hour instead of 500 cubic meters per hour. Important information must be repeated exactly as received.",
        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "Repeating the loading rate incorrectly changes the meaning of the message and can cause confusion during cargo operations.",
        },
      },

      "05": {
        title: "Monitor Pressure and Temperature",
        order: 5,
        published: true,
        studentRole: "Deck Watch",
        communicationChannel: "VHF",
        situation:
          "The Chief Officer instructs the deck watch to monitor cargo tank conditions.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Cargo Control Room",
            text: "Check pressure and temperature. Sound tanks every hour and report. Over.",
          },
        ],
        prompt: "How should the Deck Watch acknowledge the instruction?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Check pressure and temperature. Sound tanks every hour and report. Over.",
          },
          {
            id: "b",
            text: "Look at the gauges and see if everything is okay. Check the tanks sometimes and tell me later. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Check pressure and temperature. Sound tanks every hour and report. Over.",
        explanation:
          'Option B is wrong because it does not use standard Maritime English. Phrases such as "see if everything is okay," "check the tanks sometimes," and "tell me later" are vague and non-specific.',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "06": {
        title: "Maintain Present Loading Rate",
        order: 6,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Chief Officer communicates with the terminal during cargo loading.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Cargo Control Room",
            text: "Terminal, this is Chief Officer. Loading rate acceptable. No abnormalities. Please maintain present rate. Over.",
          },
        ],
        prompt: "How should this communication be phrased?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Terminal, this is Chief Officer. Loading rate acceptable. No abnormalities. Please maintain present rate. Over.",
          },
          {
            id: "b",
            text: "Terminal, Chief Officer here. Loading seems fine for now. Just continue what you're doing until we tell you otherwise. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Terminal, this is Chief Officer. Loading rate acceptable. No abnormalities. Please maintain present rate. Over.",
        explanation:
          'Option B is wrong because it uses non-standard and uncertain language such as "seems fine for now" and "continue what you\'re doing."',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "07": {
        title: "Notify Before Topping-Off",
        order: 7,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The terminal instructs the Chief Officer to inform them before topping-off.",
        dialogue: [
          {
            order: 1,
            speaker: "Terminal",
            station: "Terminal",
            text: "Copy, maintaining present rate. Inform us when approaching topping-off. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Wilco. Will notify before topping-off. Over.",
          },
          {
            id: "b",
            text: "Wilco. Will notify when we're almost full. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Wilco. Will notify before topping-off. Over.",
        explanation:
          'Option B is wrong because it replaces the standard cargo operation term "topping-off" with the informal phrase "almost full."',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "08": {
        title: "Approaching Topping-Off",
        order: 8,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation: "The cargo loading operation is approaching topping-off.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Cargo Control Room",
            text: "Terminal, this is Chief Officer. Approaching topping-off. Request to reduce loading rate. Over.",
          },
        ],
        prompt: "How should the Chief Officer communicate this request?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Terminal, this is Chief Officer. Approaching topping-off. Request to reduce loading rate. Over.",
          },
          {
            id: "b",
            text: "Terminal, this is Chief Officer. Tanks are getting close now. Please ease off the loading a bit. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Terminal, this is Chief Officer. Approaching topping-off. Request to reduce loading rate. Over.",
        explanation:
          'Option B is wrong because it uses vague and non-standard Maritime English. "Tanks are getting close now" and "ease off the loading a bit" do not clearly describe the operational status or required action.',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "09": {
        title: "Standing By for Final Topping-Off",
        order: 9,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The terminal has confirmed that the loading rate is being reduced.",
        dialogue: [
          {
            order: 1,
            speaker: "Terminal",
            station: "Terminal",
            text: "Understood. Reducing rate now. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Roger. Commencing final topping-off now. Out.",
          },
          {
            id: "b",
            text: "Copy. Standing by for final topping-off. Over.",
          },
        ],
        correctOptionId: "b",
        expectedResponse: "Copy. Standing by for final topping-off. Over.",
        explanation:
          "Option A is wrong because it changes the meaning of the terminal's message and implies that topping-off has already begun.",
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "10": {
        title: "Loading Completed",
        order: 10,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "Cargo loading has been completed and the ship's valves have been closed.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Cargo Control Room",
            text: "Confirmed. All ship’s valves closed. Loading completed. Preparing documentation. Over.",
          },
        ],
        prompt: "How should the Chief Officer report completion?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Confirmed. All ship’s valves closed. Loading completed. Preparing documentation. Over.",
          },
          {
            id: "b",
            text: "Chief Officer here. Cargo work finished and everything should be secured. We’ll sort out the paperwork shortly. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse:
          "Confirmed. All ship’s valves closed. Loading completed. Preparing documentation. Over.",
        explanation:
          'Option B is wrong because phrases such as "everything should be secured" and "sort out the paperwork shortly" are vague and do not clearly confirm the status of the ship\'s valves or completion of loading.',
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "11": {
        title: "Report After Paperwork",
        order: 11,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master instructs the Chief Officer to report once the paperwork has been completed.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Chief Officer, report to me once paperwork is completed. Over.",
          },
        ],
        prompt: "How should the Chief Officer acknowledge the instruction?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Understood, Master. Over and out.",
          },
          {
            id: "b",
            text: "Okay, Master. I'll sort out the documents first and then we'll see what needs to be reported. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Understood, Master. Over and out.",
        explanation:
          "Option B is wrong because it is unclear and does not directly confirm the Master's instruction. The phrase \"we'll see what needs to be reported\" creates uncertainty.",
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },
    },
  },

  /* ============================================================
     BALLASTING
     ============================================================ */

  {
    id: "ballasting",
    title: "Ballasting Operation",
    description:
      "Practice standardized communication during ballast operations, including tank status, pump operations, and vessel stability.",
    type: "Operations",
    difficulty: "Intermediate",
    order: 3,
    published: true,
    videoUrl: "https://www.youtube.com/watch?v=YOUR_BALLASTING_VIDEO_ID",

    scenarios: {
      "01": {
        title: "Ballast Operation Team Ready",
        order: 1,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master asks the Chief Officer whether the ballast operation team is ready.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Chief Officer, this is Bridge. Are you ready for ballasting operation? Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, this is Chief Officer. Ballast operation team ready. Over.",
          },
          {
            id: "b",
            text: "Bridge, this is Chief Officer. Ballast operation team ready. All pumps and valves checked. Over.",
          },
        ],

        // Inferred from the source's explanation:
        correctOptionId: "b",

        expectedResponse:
          "Bridge, this is Chief Officer. Ballast operation team ready. All pumps and valves checked. Over.",

        explanation:
          "Option A is incomplete because it only confirms that the ballast operation team is ready and does not state whether the pumps and valves have been checked. In SMCP, important operational information must be communicated clearly and completely to prevent misunderstandings.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Master may assume that all ballast equipment is ready for use when its status has not been confirmed, which could lead to delays, equipment problems during operation, or unsafe ballast operations.",
        },
      },

      "02": {
        title: "Commence Ballasting",
        order: 2,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master orders ballasting of No. 2 port and starboard tanks.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Very well. Commence ballasting No. 2 port and starboard tanks. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Understood. standing by to ballasting No. 2 port and starboard tanks. Over.",
          },
          {
            id: "b",
            text: "Understood. Commencing ballasting No. 2 port and starboard tanks. Over.",
          },
        ],

        // Inferred from the provided negative effect:
        correctOptionId: "b",

        expectedResponse:
          "Understood. Commencing ballasting No. 2 port and starboard tanks. Over.",

        explanation:
          "Option A indicates that the Chief Officer is only standing by rather than commencing the ballasting operation as ordered.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The ballasting operation will not start as ordered, causing a delay in achieving the vessel's required trim and stability. The Master expects the tanks to be ballasted immediately, but the Chief Officer is only standing by.",
        },
      },

      "03": {
        title: "Ballasting No. 2 Tanks in Progress",
        order: 3,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "Ballasting of the No. 2 port and starboard tanks is in progress.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Ballast Control Room",
            text: "Bridge, this is Chief Officer. Ballasting No. 2 port and starboard tanks in progress. Pumps running normally. Over.",
          },
        ],
        prompt: "How should the Chief Officer report the operation?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, this is Chief Officer. Ballasting No. 2 port and starboard tanks in progress. Pumps running normally. Over.",
          },
          {
            id: "b",
            text: "Bridge, this is Chief Officer. Ballasting No. 2 port tanks in progress. Pumps running normally. Over.",
          },
        ],

        // Inferred from the stated misunderstanding of B:
        correctOptionId: "a",

        expectedResponse:
          "Bridge, this is Chief Officer. Ballasting No. 2 port and starboard tanks in progress. Pumps running normally. Over.",

        explanation:
          "Option B is incorrect because it reports only the port tank instead of both the port and starboard tanks.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Bridge may think the ship is taking an uneven load, possibly causing a list to port. This may lead to unnecessary corrective ballasting or adjustments and confusion in stability management.",
        },
      },

      "04": {
        title: "Monitor and Report",
        order: 4,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master asks the Chief Officer to keep him informed of tank soundings and stability condition.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Copy. Keep me informed of tank soundings and stability condition. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Wilco. Will monitor and report hourly. Over.",
          },
        ],
        correctOptionId: "a",
        expectedResponse: "Wilco. Will monitor and report hourly. Over.",
        explanation:
          "The Chief Officer acknowledges the instruction and confirms that monitoring and reporting will be carried out hourly.",
        wrongAnswerEffect: {
          enabled: false,
          type: "text",
        },
      },

      "05": {
        title: "No. 2 Tanks Almost Full",
        order: 5,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "No. 2 tanks are almost full and the Chief Officer is preparing to stop the pumps.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Ballast Control Room",
            text: "Bridge, this is Chief Officer. No. 2 tanks almost full. Standing by to stop pumps. Over.",
          },
        ],
        prompt: "How should the Chief Officer report the tank status?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, this is Chief Officer. No. 2 tanks almost full. Standing by to stop pumps. Over.",
          },
          {
            id: "b",
            text: "Bridge, tanks almost full now. Over.",
          },
        ],

        // Inferred from the stated possible consequence:
        correctOptionId: "a",

        expectedResponse:
          "Bridge, this is Chief Officer. No. 2 tanks almost full. Standing by to stop pumps. Over.",

        explanation:
          "Option B is incomplete because it does not identify which tanks are almost full or clearly report the operational status of the pumps.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Bridge may be unsure which tanks are being referred to and whether pumping operations should continue or be stopped, increasing the risk of communication errors.",
        },
      },

      "06": {
        title: "Stop No. 2 Tanks and Prepare No. 3",
        order: 6,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master orders the Chief Officer to stop ballasting No. 2 tanks and prepare No. 3 center tank.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Stop ballasting No. 2 tanks. Prepare to ballast No. 3 center tank. Over.",
          },
        ],
        prompt: "How should the Chief Officer respond?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Stopping ballast now, ready next. Over.",
          },
          {
            id: "b",
            text: "Stopping pumps on No. 2 tanks. Preparing No. 3 center tank for ballasting. Over.",
          },
        ],

        // Inferred from the stated misunderstanding of A:
        correctOptionId: "b",

        expectedResponse:
          "Stopping pumps on No. 2 tanks. Preparing No. 3 center tank for ballasting. Over.",

        explanation:
          "Option A is too vague because it does not clearly identify which pumps are being stopped or which tank is being prepared.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Master may not know whether No. 3 center tank, another ballast tank, or a different operation is being prepared, leading to confusion about the vessel's ballast plan.",
        },
      },

      "07": {
        title: "No. 3 Center Tank Ballasting",
        order: 7,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "Ballasting of the No. 3 center tank is in progress and the vessel's forward draft is increasing as planned.",
        dialogue: [
          {
            order: 1,
            speaker: "Chief Officer",
            station: "Ballast Control Room",
            text: "Bridge, this is Chief Officer. No. 3 center tank ballasting in progress. Draft increasing forward as planned. Over.",
          },
        ],
        prompt: "How should the Chief Officer report the operation?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, this is Chief Officer. No. 3 center tank ballasting in progress. Draft increasing forward as planned. Over.",
          },
          {
            id: "b",
            text: "Bridge, ballast going well. Over.",
          },
        ],

        // Inferred from the stated misunderstanding of B:
        correctOptionId: "a",

        expectedResponse:
          "Bridge, this is Chief Officer. No. 3 center tank ballasting in progress. Draft increasing forward as planned. Over.",

        explanation:
          "Option B is too vague and does not identify the tank involved or provide information about the vessel's draft and trim condition.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Bridge cannot determine which ballast operation is being discussed or whether the vessel is achieving the intended trim and draft changes.",
        },
      },

      "08": {
        title: "Ballasting Completed",
        order: 8,
        published: true,
        studentRole: "Chief Officer",
        communicationChannel: "VHF",
        situation:
          "The Master requests notification when ballasting is completed.",
        dialogue: [
          {
            order: 1,
            speaker: "Master",
            station: "Bridge",
            text: "Very well. Inform me when ballasting completed. Over.",
          },
        ],
        prompt: "How should the Chief Officer report completion?",
        responseMode: "multiple-choice-and-spoken",
        options: [
          {
            id: "a",
            text: "Bridge, ballast done. Tanks okay. Over.",
          },
          {
            id: "b",
            text: "Bridge, this is Chief Officer. Ballasting completed. Pumps stopped. All tanks secured. Final draft and trim stable. Over.",
          },
        ],

        // Inferred from the stated misunderstanding of A:
        correctOptionId: "b",

        expectedResponse:
          "Bridge, this is Chief Officer. Ballasting completed. Pumps stopped. All tanks secured. Final draft and trim stable. Over.",

        explanation:
          "Option A is too vague because it does not clearly confirm completion of the operation, pump status, tank security, or final draft and trim.",

        wrongAnswerEffect: {
          enabled: true,
          type: "text",
          description:
            "The Bridge may not know if the operation is fully completed, if equipment has been secured, or if the vessel has reached the desired draft and trim.",
        },
      },
    },
  },
];

/* ============================================================
   SEED FUNCTION
   ============================================================ */

async function seed() {
  console.log("🌊 Starting SEASPEAK Firestore seed...\n");

  for (const module of modules) {
    const moduleRef = db.collection("modules").doc(module.id);

    // Create/update module
    await moduleRef.set({
      title: module.title,
      description: module.description,
      type: module.type,
      difficulty: module.difficulty,
      order: module.order,
      published: module.published,
      videoUrl: module.videoUrl,
      updatedAt: new Date(),
    });

    console.log(`✓ Module: ${module.title}`);

    // Create scenarios
    for (const [scenarioId, scenario] of Object.entries(module.scenarios)) {
      const scenarioRef = moduleRef.collection("scenarios").doc(scenarioId);

      await scenarioRef.set({
        title: scenario.title,
        description: scenario.description ?? "",
        order: scenario.order,
        published: scenario.published,

        studentRole: scenario.studentRole,
        communicationChannel: scenario.communicationChannel,
        situation: scenario.situation,

        dialogue: scenario.dialogue,

        prompt: scenario.prompt,

        responseMode: scenario.responseMode,

        options: scenario.options,

        correctOptionId: scenario.correctOptionId,

        // Used later for speech-to-text / AI comparison
        expectedResponse: scenario.expectedResponse,

        explanation: scenario.explanation,

        wrongAnswerEffect: scenario.wrongAnswerEffect ?? {
          enabled: false,
          type: "text",
        },

        // Future AI configuration
        assessment: {
          enabled: true,
          evaluateAccuracy: true,
          evaluatePhraseology: true,
          evaluateClarity: true,
          evaluatePronunciation: true,
          evaluateFluency: true,
        },

        updatedAt: new Date(),
      });

      console.log(`   ✓ Scenario ${scenarioId}: ${scenario.title}`);
    }

    console.log("");
  }

  console.log("====================================");
  console.log("🌊 SEASPEAK Firestore seed complete!");
  console.log("====================================");
}

seed().catch((error) => {
  console.error("\n❌ Seed failed:");
  console.error(error);
  process.exit(1);
});
