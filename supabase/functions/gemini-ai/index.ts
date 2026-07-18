import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(apiKey: string, systemPrompt: string, userText: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + userText }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action;

    let systemPrompt = "";
    let userText = "";

    if (action === "evaluate_interview") {
      systemPrompt = `You are an expert technical interviewer evaluating a student's interview transcript.
Return ONLY valid JSON with these fields:
{
  "confidence": number 0-10,
  "communication": number 0-10,
  "technical_knowledge": number 0-10,
  "problem_solving": number 0-10,
  "grammar": number 0-10,
  "overall_rating": number 0-10,
  "suggestions": "2-3 sentences of improvement suggestions",
  "feedback": "professional feedback paragraph 4-6 sentences"
}`;
      userText = `Student name: ${body.studentName || "Student"}\nBranch: ${body.branch || "N/A"}\nTranscript:\n${body.transcript || ""}`;
    } else if (action === "generate_final_report") {
      systemPrompt = `You are an AI career counselor generating a consolidated assessment report for a college student.
Return ONLY valid JSON with these fields:
{
  "overall_score": number 0-100,
  "grade": "A+/A/B+/B/C+/C/D",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "gemini_feedback": "detailed professional feedback 5-8 sentences"
}`;
      userText = `Student: ${body.studentName || "Student"}\nBranch: ${body.branch || "N/A"}\nInterview scores: ${JSON.stringify(body.interview || {})}\nAptitude: ${body.aptitudeScore || 0}/${body.aptitudeTotal || 0}\nVocabulary: ${body.vocabScore || 0}/${body.vocabTotal || 0}\nTechnical: ${JSON.stringify(body.technical || {})}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await callGemini(apiKey, systemPrompt, userText);
    const parsed = safeParse(raw);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response", raw }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
