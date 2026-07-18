import { el, toast } from '../ui.js';
import { supabase } from '../supabase.js';
import { evaluateInterview } from '../gemini.js';

const INTERVIEW_QUESTIONS = [
  'Tell me about yourself and your academic background.',
  'Why did you choose your branch of study?',
  'Describe a challenging project you have worked on.',
  'What are your greatest strengths and weaknesses?',
  'Where do you see yourself in five years?',
  'Explain a technical concept you are passionate about.',
  'How do you handle working in a team under pressure?',
  'What motivates you to learn new technologies?',
];

export function renderInterview(app, student, onDone) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'AI Interview'));
  wrap.appendChild(el('p', { class: 'muted' }, 'Answer the questions below. Your responses will be evaluated by Google Gemini 2.5 Flash for confidence, communication, technical knowledge, problem solving, and grammar.'));

  const answers = [];
  const form = el('div', { class: 'interview-form' });
  INTERVIEW_QUESTIONS.forEach((q, i) => {
    const ta = el('textarea', { class: 'input textarea', placeholder: 'Type your answer (2-4 sentences)...' });
    answers.push(ta);
    form.appendChild(el('div', { class: 'interview-q' }, [
      el('div', { class: 'q-num' }, `Q${i + 1}`),
      el('div', {}, [
        el('div', { class: 'q-text' }, q),
        ta,
      ]),
    ]));
  });

  const submit = el('button', { class: 'btn btn-primary', onclick: async () => {
    const transcript = INTERVIEW_QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i].value || '(no answer)'}`).join('\n\n');
    submit.disabled = true;
    submit.textContent = 'Evaluating with Gemini...';
    try {
      const result = await evaluateInterview({ studentName: student.full_name, branch: student.branch, transcript });
      const { data: saved } = await supabase.from('interview_reports').insert({
        user_id: student.user_id,
        confidence: result.confidence,
        communication: result.communication,
        technical_knowledge: result.technical_knowledge,
        problem_solving: result.problem_solving,
        grammar: result.grammar,
        overall_rating: result.overall_rating,
        suggestions: result.suggestions,
        feedback: result.feedback,
        transcript: INTERVIEW_QUESTIONS.map((q, i) => ({ q, a: answers[i].value || '' })),
      }).select().maybeSingle();
      const badges = new Set(student.badges || []);
      badges.add('interview_done');
      await supabase.from('students').update({ badges: [...badges] }).eq('user_id', student.user_id);
      await supabase.from('notifications').insert({
        user_id: student.user_id,
        type: 'report_ready',
        message: 'Your AI Interview report is ready.',
      });
      toast('Interview evaluated successfully!', 'success');
      resultEl.innerHTML = '';
      resultEl.appendChild(renderResultCard(result));
      submit.disabled = false;
      submit.textContent = 'Re-submit';
    } catch (e) {
      toast(e.message, 'error');
      submit.disabled = false;
      submit.textContent = 'Submit Interview';
    }
  } }, 'Submit Interview');
  form.appendChild(submit);

  const resultEl = el('div', { class: 'interview-result' });
  wrap.appendChild(form);
  wrap.appendChild(resultEl);
  return wrap;
}

function renderResultCard(r) {
  const card = el('div', { class: 'glass card result-card' });
  card.appendChild(el('h3', {}, 'AI Evaluation Result'));
  const scores = [
    ['Confidence', r.confidence],
    ['Communication', r.communication],
    ['Technical Knowledge', r.technical_knowledge],
    ['Problem Solving', r.problem_solving],
    ['Grammar', r.grammar],
    ['Overall Rating', r.overall_rating],
  ];
  card.appendChild(el('div', { class: 'score-grid' }, scores.map(([label, val]) =>
    el('div', { class: 'score-item' }, [
      el('div', { class: 'score-label' }, label),
      el('div', { class: 'score-bar' }, el('div', { class: 'score-fill', style: { width: `${(val || 0) * 10}%` } })),
      el('div', { class: 'score-val' }, `${(val || 0).toFixed(1)} / 10`),
    ])
  )));
  card.appendChild(el('div', { class: 'feedback-block' }, [
    el('div', { class: 'feedback-label' }, 'Professional Feedback'),
    el('p', {}, r.feedback || ''),
    el('div', { class: 'feedback-label' }, 'Suggestions'),
    el('p', {}, r.suggestions || ''),
  ]));
  return card;
}
