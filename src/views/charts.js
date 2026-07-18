import { el } from '../ui.js';
import { supabase } from '../supabase.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export async function renderChartsView(app, student) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'Performance Charts'));
  wrap.appendChild(el('p', { class: 'muted' }, 'Visualize your assessment progress over time.'));

  const [{ data: interviews }, { data: apt }, { data: vocab }, { data: tech }] = await Promise.all([
    supabase.from('interview_reports').select('overall_rating, created_at').eq('user_id', student.user_id).order('created_at', { ascending: true }),
    supabase.from('aptitude_reports').select('score, total, created_at').eq('user_id', student.user_id).order('created_at', { ascending: true }),
    supabase.from('vocabulary_reports').select('score, total, created_at').eq('user_id', student.user_id).order('created_at', { ascending: true }),
    supabase.from('technical_reports').select('score, total, language, created_at').eq('user_id', student.user_id).order('created_at', { ascending: true }),
  ]);

  const grid = el('div', { class: 'charts-grid' });

  // Interview ratings over time
  if (interviews && interviews.length) {
    const card = el('div', { class: 'glass card chart-card' });
    card.appendChild(el('h3', {}, 'AI Interview Ratings'));
    const canvas = el('canvas', { height: '200' });
    card.appendChild(canvas);
    grid.appendChild(card);
    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: interviews.map((_, i) => `Attempt ${i + 1}`),
        datasets: [{
          label: 'Overall Rating / 10',
          data: interviews.map(i => Number(i.overall_rating || 0)),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          fill: true,
          tension: 0.35,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } }, scales: { y: { beginAtZero: true, max: 10, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } } },
    });
  }

  // Aptitude scores
  if (apt && apt.length) {
    const card = el('div', { class: 'glass card chart-card' });
    card.appendChild(el('h3', {}, 'Aptitude Test Scores'));
    const canvas = el('canvas', { height: '200' });
    card.appendChild(canvas);
    grid.appendChild(card);
    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: apt.map((_, i) => `Attempt ${i + 1}`),
        datasets: [{ label: 'Score', data: apt.map(a => a.score), backgroundColor: '#16a34a' }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } } },
    });
  }

  // Vocabulary scores
  if (vocab && vocab.length) {
    const card = el('div', { class: 'glass card chart-card' });
    card.appendChild(el('h3', {}, 'Vocabulary Test Scores'));
    const canvas = el('canvas', { height: '200' });
    card.appendChild(canvas);
    grid.appendChild(card);
    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: vocab.map((_, i) => `Attempt ${i + 1}`),
        datasets: [{ label: 'Score', data: vocab.map(v => v.score), backgroundColor: '#d97706' }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } } },
    });
  }

  // Technical by language
  if (tech && tech.length) {
    const card = el('div', { class: 'glass card chart-card' });
    card.appendChild(el('h3', {}, 'Technical Test Scores by Language'));
    const canvas = el('canvas', { height: '200' });
    card.appendChild(canvas);
    grid.appendChild(card);
    const byLang = {};
    tech.forEach(t => { byLang[t.language] = (byLang[t.language] || 0) + t.score; });
    new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(byLang),
        datasets: [{ data: Object.values(byLang), backgroundColor: ['#2563eb', '#16a34a', '#d97706', '#dc2626'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } } },
    });
  }

  if (!interviews?.length && !apt?.length && !vocab?.length && !tech?.length) {
    grid.appendChild(el('p', { class: 'muted' }, 'No data yet. Take some tests to see your performance charts.'));
  }

  wrap.appendChild(grid);
  return wrap;
}
