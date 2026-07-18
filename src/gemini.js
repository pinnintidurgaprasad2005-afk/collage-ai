import { GEMINI_FUNCTION_URL } from './supabase.js';

export async function evaluateInterview({ studentName, branch, transcript }) {
  const res = await fetch(GEMINI_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'evaluate_interview', studentName, branch, transcript }),
  });
  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function generateFinalReport({ studentName, branch, interview, aptitudeScore, aptitudeTotal, vocabScore, vocabTotal, technical }) {
  const res = await fetch(GEMINI_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_final_report',
      studentName,
      branch,
      interview,
      aptitudeScore,
      aptitudeTotal,
      vocabScore,
      vocabTotal,
      technical,
    }),
  });
  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}
