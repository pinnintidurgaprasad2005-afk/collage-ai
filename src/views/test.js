import { el, toast } from '../ui.js';
import { supabase } from '../supabase.js';
import { APTITUDE_QUESTIONS, VOCABULARY_QUESTIONS, TECHNICAL_QUESTIONS } from '../questions.js';

export function renderTest(app, student, type, onDone) {
  const wrap = el('div', { class: 'view-wrap' });
  const titles = {
    aptitude: 'Aptitude Test',
    vocabulary: 'Vocabulary Test',
    technical: 'Technical Test',
  };
  wrap.appendChild(el('h2', { class: 'view-title' }, titles[type]));
  let questions = [];
  let language = null;
  if (type === 'aptitude') questions = APTITUDE_QUESTIONS;
  else if (type === 'vocabulary') questions = VOCABULARY_QUESTIONS;
  else if (type === 'technical') {
    const langSel = el('div', { class: 'lang-select-wrap' }, [
      el('p', { class: 'muted' }, 'Select a programming language:'),
      el('div', { class: 'lang-btns' }, Object.keys(TECHNICAL_QUESTIONS).map(l =>
        el('button', { class: 'btn btn-outline', onclick: () => {
          language = l;
          questions = TECHNICAL_QUESTIONS[l];
          startTest();
        } }, l)
      )),
    ]);
    wrap.appendChild(langSel);
    return wrap;
  }

  function startTest() {
    wrap.innerHTML = '';
    wrap.appendChild(el('h2', { class: 'view-title' }, `${titles[type]} — ${language || ''}`));
    wrap.appendChild(el('p', { class: 'muted' }, `Answer all ${questions.length} questions. Each correct answer is worth 1 point.`));
    const answers = new Array(questions.length).fill(null);
    const form = el('div', { class: 'test-form' });
    questions.forEach((q, i) => {
      const opts = q.options.map((opt, oi) => {
        const id = `q${i}o${oi}`;
        const radio = el('input', { type: 'radio', name: `q${i}`, id, value: oi, onchange: () => { answers[i] = oi; } });
        return el('label', { class: 'option' }, [
          radio,
          el('span', {}, opt),
        ]);
      });
      form.appendChild(el('div', { class: 'test-q' }, [
        el('div', { class: 'q-num' }, `Q${i + 1}`),
        el('div', { class: 'q-text' }, q.q),
        el('div', { class: 'options' }, opts),
      ]));
    });
    const submit = el('button', { class: 'btn btn-primary', onclick: async () => {
      if (answers.some(a => a === null)) {
        toast('Please answer all questions', 'error');
        return;
      }
      const score = answers.reduce((acc, a, i) => acc + (a === questions[i].answer ? 1 : 0), 0);
      const total = questions.length;
      submit.disabled = true;
      submit.textContent = 'Submitting...';
      try {
        const payload = {
          user_id: student.user_id,
          score,
          total,
          answers: questions.map((q, i) => ({ q: q.q, selected: answers[i], correct: q.answer })),
        };
        if (type === 'aptitude') await supabase.from('aptitude_reports').insert(payload);
        else if (type === 'vocabulary') await supabase.from('vocabulary_reports').insert(payload);
        else if (type === 'technical') await supabase.from('technical_reports').insert({ ...payload, language });

        if (score === total) {
          const badges = new Set(student.badges || []);
          badges.add('perfect_score');
          await supabase.from('students').update({ badges: [...badges] }).eq('user_id', student.user_id);
        }
        await supabase.from('notifications').insert({
          user_id: student.user_id,
          type: 'report_ready',
          message: `Your ${titles[type]} result is ready. Score: ${score}/${total}.`,
        });
        toast(`Test submitted! Score: ${score}/${total}`, 'success');
        form.innerHTML = '';
        form.appendChild(renderResultSummary(score, total, questions, answers));
      } catch (e) {
        toast(e.message, 'error');
        submit.disabled = false;
        submit.textContent = 'Submit Test';
      }
    } }, 'Submit Test');
    form.appendChild(submit);
    wrap.appendChild(form);
  }

  if (type !== 'technical') startTest();
  return wrap;
}

function renderResultSummary(score, total, questions, answers) {
  const card = el('div', { class: 'glass card result-card' });
  card.appendChild(el('h3', {}, `Result: ${score} / ${total}`));
  const pct = Math.round((score / total) * 100);
  card.appendChild(el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: { width: `${pct}%` } })));
  card.appendChild(el('div', { class: 'review-list' }, questions.map((q, i) => {
    const correct = answers[i] === q.answer;
    return el('div', { class: `review-item ${correct ? 'correct' : 'wrong'}` }, [
      el('div', { class: 'review-q' }, `Q${i + 1}. ${q.q}`),
      el('div', { class: 'review-a' }, `Your answer: ${q.options[answers[i]]} ${correct ? '✓' : '✗'}`),
      correct ? null : el('div', { class: 'review-correct' }, `Correct: ${q.options[q.answer]}`),
    ]);
  })));
  return card;
}
