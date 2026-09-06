import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "GROQ_API_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();

    const audio = formData.get("audio");
    const scenarioRaw = formData.get("scenario");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error: "No audio file was provided.",
        },
        { status: 400 },
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error: "The audio file is empty.",
        },
        { status: 400 },
      );
    }

    let scenario: {
      title?: string;
      situation?: string;
      prompt?: string;
      expectedResponse?: string;
      selectedOption?: string;
      correctOption?: string;
      explanation?: string;
    } = {};

    if (typeof scenarioRaw === "string") {
      try {
        scenario = JSON.parse(scenarioRaw);
      } catch {
        console.warn("Could not parse scenario JSON.");
      }
    }

    /*
     * ============================================================
     * STEP 1
     * GROQ WHISPER - AUDIO -> TEXT
     * ============================================================
     */

    const groqFormData = new FormData();

    groqFormData.append("file", audio, audio.name || "student-response.webm");

    groqFormData.append("model", "whisper-large-v3-turbo");

    groqFormData.append("response_format", "json");

    /*
     * Maritime vocabulary prompt.
     * This helps Whisper recognize common SMCP terminology.
     */
    groqFormData.append(
      "prompt",
      [
        "Maritime English.",
        "IMO Standard Marine Communication Phrases.",
        "SMCP.",
        "Seaspeak.",
        "Bridge communication.",
        "Forward station.",
        "Anchor party.",
        "Anchoring.",
        "Stand by.",
        "Anchor cleared away.",
        "Over.",
        "Out.",
        "Pilot.",
        "Helm.",
        "Port.",
        "Starboard.",
        "Master.",
        "Officer of the Watch.",
      ].join(" "),
    );

    /*
     * Your current application is English-language training.
     * Explicitly specifying English improves transcription accuracy.
     */
    groqFormData.append("language", "en");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: groqFormData,
      },
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();

      console.error("Groq transcription error:", errorText);

      return NextResponse.json(
        {
          error: "Speech transcription failed.",
          details: errorText,
        },
        { status: 502 },
      );
    }

    const groqResult = await groqResponse.json();

    const transcript =
      typeof groqResult.text === "string" ? groqResult.text.trim() : "";

    if (!transcript) {
      return NextResponse.json(
        {
          error:
            "No speech could be detected in the recording. Please speak clearly and try again.",
        },
        { status: 422 },
      );
    }

    /*
     * ============================================================
     * STEP 2
     * GEMINI - TRANSCRIPT -> MARITIME EVALUATION
     * ============================================================
     */

    const evaluationPrompt = `
You are an expert maritime communication instructor evaluating a
student practicing IMO Standard Marine Communication Phrases (SMCP).

Your task is to evaluate the student's spoken response to a maritime
communication scenario.

IMPORTANT:
- Evaluate the student's actual spoken response.
- Do not reward an answer simply because it contains some of the same
  words as the expected answer.
- Evaluate whether the response communicates the intended meaning.
- Evaluate standard maritime phraseology.
- Penalize informal, ambiguous, incomplete, or unsafe communication.
- Consider clarity and professionalism.
- The student may use minor grammatical variations if the meaning remains
  clear and appropriate for maritime communication.
- Do not require the student to reproduce the expected response word-for-word.
- Focus on operational communication safety.

SCENARIO

Title:
${scenario.title || "Not provided"}

Situation:
${scenario.situation || "Not provided"}

Prompt:
${scenario.prompt || "Not provided"}

Expected response:
${scenario.expectedResponse || "Not provided"}

Selected answer:
${scenario.selectedOption || "Not provided"}

Correct answer:
${scenario.correctOption || "Not provided"}

Instructor explanation:
${scenario.explanation || "Not provided"}

STUDENT'S SPOKEN RESPONSE

"${transcript}"

EVALUATION CRITERIA

Score:
0-100.

Clarity:
0-100.

Phraseology:
0-100.

Consider:

1. Correctness
Does the student communicate the required response?

2. Maritime phraseology
Does the student use appropriate SMCP/maritime terminology?

3. Clarity
Would another crew member understand the message immediately?

4. Completeness
Does the response provide the necessary operational information?

5. Safety
Could the wording create ambiguity or misunderstanding during an
actual maritime operation?

6. Professionalism
Is the communication concise, standardized and professional?

FEEDBACK

Give concise feedback suitable for a maritime student.

If the answer is good:
- explain what was done correctly.

If the answer needs improvement:
- identify the specific problem.
- give the student a better example response.

Do not be overly harsh about accent or pronunciation unless the speech
is genuinely difficult to understand.

Return ONLY valid JSON matching the requested schema.
`;

    const geminiSchema = {
      type: "object",
      properties: {
        score: {
          type: "integer",
          description:
            "Overall score from 0 to 100 for the student's maritime communication response.",
        },
        clarity: {
          type: "integer",
          description: "Clarity score from 0 to 100.",
        },
        phraseology: {
          type: "integer",
          description: "Standard maritime phraseology score from 0 to 100.",
        },
        feedback: {
          type: "string",
          description: "Concise instructional feedback for the student.",
        },
      },
      required: ["score", "clarity", "phraseology", "feedback"],
    };

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: evaluationPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: geminiSchema,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      console.error("Gemini evaluation error:", errorText);

      return NextResponse.json(
        {
          error: "AI evaluation failed.",
          details: errorText,
          transcript,
        },
        { status: 502 },
      );
    }

    const geminiResult = await geminiResponse.json();

    const responseText =
      geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty evaluation.",
          transcript,
        },
        { status: 502 },
      );
    }

    let evaluation;

    try {
      evaluation = JSON.parse(responseText);
    } catch (error) {
      console.error("Could not parse Gemini JSON:", responseText, error);

      return NextResponse.json(
        {
          error: "Gemini returned invalid evaluation data.",
          transcript,
        },
        { status: 502 },
      );
    }

    /*
     * ============================================================
     * STEP 3
     * RETURN RESULT TO NEXT.JS FRONTEND
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      transcript,

      score: evaluation.score,
      clarity: evaluation.clarity,
      phraseology: evaluation.phraseology,
      feedback: evaluation.feedback,
    });
  } catch (error) {
    console.error("AI evaluation route error:", error);

    return NextResponse.json(
      {
        error: "Unexpected error while evaluating the recording.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
