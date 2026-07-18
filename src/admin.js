import { el, clear, toast, formatDate, gradeFromScore } from './ui.js';
import { supabase } from './supabase.js';
import { BRANCHES, YEARS, SECTIONS } from './constants.js';
import { renderLanding } from './views/auth.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export function renderAdminApp(app) {
  if (sessionStorage.getItem('admin_session') !== '1') {
    renderLanding(app);
    return;
  }
  renderAdminView(app, 'analytics');
}

export async function renderAdminView(app, view, extra = {}) {
  clear(app);
  const layout = el('div', { class: 'app-layout' });
  layout.appendChild(renderAdminSidebar(app, view));
  const main = el('main', { class: 'main-content' });
  main.appendChild(renderAdminTopbar(app));
  const content = el('div', { class: 'content-area' });
  if (view === 'analytics') content.appendChild(await renderAnalytics(app));
  else if (view === 'search') content.appendChild(renderSearchStudent(app));
  else if (view === 'filters') content.appendChild(renderFilters(app));
  else if (view === 'leaderboard') content.appendChild(await renderLeaderboard(app));
  main.appendChild(content);
  layout.appendChild(main);
  app.appendChild(layout);
}

function renderAdminSidebar(app, view) {
  const items = [
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'search', label: 'Search Student', icon: 'search' },
    { id: 'filters', label: 'Branch / Year / Section', icon: 'filter' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
  ];
  return el('nav', { class: 'sidebar admin-sidebar' }, [
    el('div', { class: 'sidebar-brand' }, [
      el('div', { class: 'brand-mark admin-mark' }, 'AD'),
      el('span', { class: 'sidebar-brand-text' }, 'Admin Panel'),
    ]),
    el('div', { class: 'sidebar-nav' }, items.map(it =>
      el('button', { class: `nav-item ${view === it.id ? 'active' : ''}`, onclick: () => renderAdminView(app, it.id) }, [
        el('span', { class: `nav-icon icon-${it.icon}` }),
        el('span', {}, it.label),
      ])
    )),
    el('div', { class: 'sidebar-footer' }, [
      el('button', { class: 'btn btn-ghost btn-block', onclick: () => {
        sessionStorage.removeItem('admin_session');
        renderLanding(app);
      } }, 'Sign Out'),
    ]),
  ]);
}

function renderAdminTopbar(app) {
  return el('header', { class: 'topbar' }, [
    el('div', { class: 'topbar-left' }, [
      el('h2', {}, 'Admin Dashboard'),
      el('p', { class: 'topbar-sub' }, 'Monitor student performance across all branches'),
    ]),
    el('div', { class: 'topbar-right' }, [
      el('div', { class: 'admin-chip' }, 'Administrator'),
    ]),
  ]);
}

async function renderAnalytics(app) {
  const wrap = el('div', { class: 'dashboard-grid' });
  const { data: students } = await supabase.from('students').select('*');
  const total = students?.length || 0;
  const completed = students?.filter(s => Number(s.overall_score) > 0).length || 0;
  const pending = total - completed;
  const today = new Date().toISOString().slice(0, 10);
  const todayActive = students?.filter(s => s.last_login_date === today).length || 0;
  const highestStreak = Math.max(0, ...(students || []).map(s => s.login_streak || 0));
  const topPerformer = (students || []).slice().sort((a, b) => Number(b.overall_score) - Number(a.overall_score))[0];
  const avgScore = total ? Math.round(students.reduce((acc, s) => acc + Number(s.overall_score || 0), 0) / total) : 0;

  wrap.appendChild(statCard('Total Students', total, 'primary'));
  wrap.appendChild(statCard('Completed', completed, 'success'));
  wrap.appendChild(statCard('Pending', pending, 'warning'));
  wrap.appendChild(statCard("Today's Active", todayActive, 'accent'));
  wrap.appendChild(statCard('Highest Streak', `${highestStreak} 🔥`, 'primary'));
  wrap.appendChild(statCard('Average Score', avgScore, 'success'));
  if (topPerformer) {
    wrap.appendChild(el('div', { class: 'glass card top-performer-card' }, [
      el('div', { class: 'card-head' }, [el('span', { class: 'card-icon trophy' }, '🏆'), el('h3', {}, "Today's Top Performer")]),
      el('div', { class: 'top-perf-body' }, [
        el('div', { class: 'top-perf-name' }, topPerformer.full_name),
        el('div', { class: 'top-perf-meta' }, `${topPerformer.branch} • ${topPerformer.year}`),
        el('div', { class: 'top-perf-score' }, `${Math.round(topPerformer.overall_score || 0)} / 100`),
      ]),
    ]));
  }

  // Branch-wise performance
  const branchMap = {};
  (students || []).forEach(s => {
    if (!branchMap[s.branch]) branchMap[s.branch] = { count: 0, sum: 0 };
    branchMap[s.branch].count++;
    branchMap[s.branch].sum += Number(s.overall_score || 0);
  });
  const branchLabels = Object.keys(branchMap);
  const branchAvg = branchLabels.map(b => branchMap[b].count ? Math.round(branchMap[b].sum / branchMap[b].count) : 0);
  const branchCard = el('div', { class: 'glass card chart-card wide' });
  branchCard.appendChild(el('h3', {}, 'Branch-wise Performance'));
  const bc = el('canvas', { height: '220' });
  branchCard.appendChild(bc);
  wrap.appendChild(branchCard);
  new Chart(bc.getContext('2d'), {
    type: 'bar',
    data: { labels: branchLabels, datasets: [{ label: 'Avg Score', data: branchAvg, backgroundColor: '#2563eb' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } } },
  });

  // Year-wise
  const yearMap = {};
  (students || []).forEach(s => {
    if (!yearMap[s.year]) yearMap[s.year] = { count: 0, sum: 0 };
    yearMap[s.year].count++;
    yearMap[s.year].sum += Number(s.overall_score || 0);
  });
  const yearLabels = Object.keys(yearMap);
  const yearAvg = yearLabels.map(y => yearMap[y].count ? Math.round(yearMap[y].sum / yearMap[y].count) : 0);
  const yearCard = el('div', { class: 'glass card chart-card wide' });
  yearCard.appendChild(el('h3', {}, 'Year-wise Performance'));
  const yc = el('canvas', { height: '220' });
  yearCard.appendChild(yc);
  wrap.appendChild(yearCard);
  new Chart(yc.getContext('2d'), {
    type: 'bar',
    data: { labels: yearLabels, datasets: [{ label: 'Avg Score', data: yearAvg, backgroundColor: '#16a34a' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } } },
  });

  // Section-wise (within selected branch — show all sections aggregated)
  const sectionMap = {};
  (students || []).forEach(s => {
    if (!sectionMap[s.section]) sectionMap[s.section] = { count: 0, sum: 0 };
    sectionMap[s.section].count++;
    sectionMap[s.section].sum += Number(s.overall_score || 0);
  });
  const secLabels = Object.keys(sectionMap);
  const secAvg = secLabels.map(s => sectionMap[s].count ? Math.round(sectionMap[s].sum / sectionMap[s].count) : 0);
  const secCard = el('div', { class: 'glass card chart-card wide' });
  secCard.appendChild(el('h3', {}, 'Section-wise Performance'));
  const sc = el('canvas', { height: '220' });
  secCard.appendChild(sc);
  wrap.appendChild(secCard);
  new Chart(sc.getContext('2d'), {
    type: 'doughnut',
    data: { labels: secLabels, datasets: [{ data: secAvg, backgroundColor: ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#475569' } } } },
  });

  return wrap;
}

function statCard(label, value, color) {
  return el('div', { class: `glass card stat-card ${color}` }, [
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, String(value)),
  ]);
}

function renderSearchStudent(app) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'Search Student by Roll Number'));
  const input = el('input', { class: 'input', type: 'text', placeholder: 'Enter roll number (e.g. 21A91A0501)' });
  const btn = el('button', { class: 'btn btn-primary', onclick: async () => {
    if (!input.value.trim()) { toast('Enter a roll number', 'error'); return; }
    resultEl.innerHTML = '<p class="muted">Searching...</p>';
    const { data: student } = await supabase.from('students').select('*').eq('roll_number', input.value.trim()).maybeSingle();
    if (!student) {
      resultEl.innerHTML = '';
      resultEl.appendChild(el('p', { class: 'muted' }, 'No student found with that roll number.'));
      return;
    }
    resultEl.innerHTML = '';
    resultEl.appendChild(await renderStudentProfile(student));
  } }, 'Search');
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  wrap.appendChild(el('div', { class: 'search-row' }, [input, btn]));
  const resultEl = el('div', { class: 'search-result' });
  wrap.appendChild(resultEl);
  return wrap;
}

async function renderStudentProfile(student) {
  const wrap = el('div', { class: 'profile-wrap' });
  wrap.appendChild(el('div', { class: 'glass card profile-head' }, [
    el('div', { class: 'profile-avatar' }, (student.full_name || 'S').charAt(0).toUpperCase()),
    el('div', {}, [
      el('h3', {}, student.full_name),
      el('p', { class: 'muted' }, `${student.roll_number} • ${student.branch} • ${student.year} • Section ${student.section}`),
      el('p', { class: 'muted small' }, student.email),
    ]),
    el('div', { class: 'profile-score' }, [
      el('div', { class: 'stat-value' }, String(Math.round(student.overall_score || 0))),
      el('div', { class: 'stat-label' }, `Grade ${gradeFromScore(Number(student.overall_score || 0))}`),
    ]),
  ]));

  const [{ data: interview }, { data: apt }, { data: vocab }, { data: tech }, { data: final }] = await Promise.all([
    supabase.from('interview_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('aptitude_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vocabulary_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('technical_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('final_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const grid = el('div', { class: 'profile-grid' });
  grid.appendChild(reportCard('AI Interview', interview ? `Overall: ${(interview.overall_rating || 0).toFixed(1)}/10` : 'Not attempted', interview?.feedback));
  grid.appendChild(reportCard('Aptitude', apt ? `Score: ${apt.score}/${apt.total}` : 'Not attempted'));
  grid.appendChild(reportCard('Vocabulary', vocab ? `Score: ${vocab.score}/${vocab.total}` : 'Not attempted'));
  grid.appendChild(reportCard('Technical', tech ? `${tech.language}: ${tech.score}/${tech.total}` : 'Not attempted'));
  wrap.appendChild(grid);

  if (final) {
    const fr = el('div', { class: 'glass card final-report-card' });
    fr.appendChild(el('h3', {}, 'Final AI Report'));
    fr.appendChild(el('div', { class: 'report-score' }, `Overall: ${Math.round(final.overall_score)}/100 (Grade ${final.grade})`));
    if (final.strengths?.length) fr.appendChild(el('div', { class: 'list-block' }, [el('div', { class: 'feedback-label' }, 'Strengths'), ...final.strengths.map(s => el('div', { class: 'list-item' }, `• ${s}`))]));
    if (final.weaknesses?.length) fr.appendChild(el('div', { class: 'list-block' }, [el('div', { class: 'feedback-label' }, 'Weaknesses'), ...final.weaknesses.map(s => el('div', { class: 'list-item' }, `• ${s}`))]));
    if (final.recommendations?.length) fr.appendChild(el('div', { class: 'list-block' }, [el('div', { class: 'feedback-label' }, 'Recommendations'), ...final.recommendations.map(s => el('div', { class: 'list-item' }, `• ${s}`))]));
    if (final.gemini_feedback) fr.appendChild(el('div', { class: 'feedback-block' }, [el('div', { class: 'feedback-label' }, 'Gemini Feedback'), el('p', {}, final.gemini_feedback)]));
    fr.appendChild(el('button', { class: 'btn btn-outline', onclick: async () => {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(18); doc.text('AI Student Assessment Report', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' }); y += 10;
      doc.setFontSize(10); doc.text(`${student.full_name} • ${student.roll_number}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' }); y += 12;
      doc.setFontSize(12); doc.text(`Overall: ${Math.round(final.overall_score)}/100 — Grade ${final.grade}`, 14, y); y += 10;
      const section = (title, items) => {
        if (!items?.length) return;
        doc.setFontSize(12); doc.text(title, 14, y); y += 7;
        doc.setFontSize(10);
        for (const it of items) { const lines = doc.splitTextToSize(`• ${it}`, doc.internal.pageSize.getWidth() - 28); for (const ln of lines) { if (y > 270) { doc.addPage(); y = 20; } doc.text(ln, 14, y); y += 6; } }
        y += 4;
      };
      section('Strengths', final.strengths);
      section('Weaknesses', final.weaknesses);
      section('Recommendations', final.recommendations);
      if (final.gemini_feedback) {
        doc.setFontSize(12); doc.text('Gemini Feedback', 14, y); y += 7;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(final.gemini_feedback, doc.internal.pageSize.getWidth() - 28);
        for (const ln of lines) { if (y > 270) { doc.addPage(); y = 20; } doc.text(ln, 14, y); y += 6; }
      }
      doc.save(`AI_Report_${student.roll_number}.pdf`);
    } }, 'Download PDF'));
    wrap.appendChild(fr);
  }

  return wrap;
}

function reportCard(title, summary, feedback) {
  return el('div', { class: 'glass card mini-report' }, [
    el('div', { class: 'card-head' }, [el('h3', {}, title)]),
    el('div', { class: 'report-score' }, summary),
    feedback ? el('p', { class: 'muted small' }, feedback) : null,
  ]);
}

function renderFilters(app) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'Filter Students'));
  wrap.appendChild(el('p', { class: 'muted' }, 'Select Branch → Year → Section to view students.'));

  const branchSel = el('select', { class: 'input' }, [el('option', { value: '' }, 'Select Branch'), ...BRANCHES.map(b => el('option', { value: b }, b))]);
  const yearSel = el('select', { class: 'input', disabled: true }, [el('option', { value: '' }, 'Select Year')]);
  const sectionSel = el('select', { class: 'input', disabled: true }, [el('option', { value: '' }, 'Select Section')]);
  const resultEl = el('div', { class: 'filter-result' });

  branchSel.addEventListener('change', () => {
    yearSel.innerHTML = '';
    yearSel.appendChild(el('option', { value: '' }, 'Select Year'));
    YEARS.forEach(y => yearSel.appendChild(el('option', { value: y }, y)));
    yearSel.disabled = false;
    sectionSel.innerHTML = '';
    sectionSel.appendChild(el('option', { value: '' }, 'Select Section'));
    sectionSel.disabled = true;
    resultEl.innerHTML = '';
  });
  yearSel.addEventListener('change', () => {
    sectionSel.innerHTML = '';
    sectionSel.appendChild(el('option', { value: '' }, 'Select Section'));
    SECTIONS.forEach(s => sectionSel.appendChild(el('option', { value: s }, s)));
    sectionSel.disabled = false;
    resultEl.innerHTML = '';
  });
  sectionSel.addEventListener('change', async () => {
    if (!branchSel.value || !yearSel.value || !sectionSel.value) return;
    resultEl.innerHTML = '<p class="muted">Loading...</p>';
    const { data: students } = await supabase.from('students')
      .select('*')
      .eq('branch', branchSel.value)
      .eq('year', yearSel.value)
      .eq('section', sectionSel.value)
      .order('roll_number', { ascending: true });
    resultEl.innerHTML = '';
    if (!students || students.length === 0) {
      resultEl.appendChild(el('p', { class: 'muted' }, 'No students found in this section.'));
      return;
    }
    const table = el('table', { class: 'data-table' });
    table.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', {}, 'Roll No'),
      el('th', {}, 'Name'),
      el('th', {}, 'Interview'),
      el('th', {}, 'Aptitude'),
      el('th', {}, 'Vocabulary'),
      el('th', {}, 'Technical'),
      el('th', {}, 'Overall'),
      el('th', {}, 'Status'),
    ])]));
    const tbody = el('tbody', {});
    for (const s of students) {
      const [{ data: iv }, { data: ap }, { data: vo }, { data: te }] = await Promise.all([
        supabase.from('interview_reports').select('overall_rating').eq('user_id', s.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('aptitude_reports').select('score,total').eq('user_id', s.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('vocabulary_reports').select('score,total').eq('user_id', s.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('technical_reports').select('score,total,language').eq('user_id', s.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const status = Number(s.overall_score) > 0 ? 'Completed' : 'Pending';
      tbody.appendChild(el('tr', {}, [
        el('td', {}, s.roll_number),
        el('td', {}, s.full_name),
        el('td', {}, iv ? `${(iv.overall_rating || 0).toFixed(1)}/10` : '-'),
        el('td', {}, ap ? `${ap.score}/${ap.total}` : '-'),
        el('td', {}, vo ? `${vo.score}/${vo.total}` : '-'),
        el('td', {}, te ? `${te.score}/${te.total}` : '-'),
        el('td', {}, String(Math.round(s.overall_score || 0))),
        el('td', {}, el('span', { class: `status-pill ${status.toLowerCase()}` }, status)),
      ]));
    }
    table.appendChild(tbody);
    resultEl.appendChild(table);
  });

  wrap.appendChild(el('div', { class: 'filter-row' }, [
    el('div', {}, [el('label', { class: 'field-label' }, 'Branch'), branchSel]),
    el('div', {}, [el('label', { class: 'field-label' }, 'Year'), yearSel]),
    el('div', {}, [el('label', { class: 'field-label' }, 'Section'), sectionSel]),
  ]));
  wrap.appendChild(resultEl);
  return wrap;
}

async function renderLeaderboard(app) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'Leaderboard'));
  wrap.appendChild(el('p', { class: 'muted' }, 'Top 10 students ranked by overall AI score.'));
  const { data: students } = await supabase.from('students').select('*').order('overall_score', { ascending: false }).limit(10);
  if (!students || students.length === 0) {
    wrap.appendChild(el('p', { class: 'muted' }, 'No students yet.'));
    return wrap;
  }
  const list = el('div', { class: 'leaderboard' });
  students.forEach((s, i) => {
    list.appendChild(el('div', { class: `leaderboard-item rank-${i + 1 <= 3 ? i + 1 : 'rest'}` }, [
      el('div', { class: 'rank-badge' }, i + 1 === 1 ? '🥇' : i + 1 === 2 ? '🥈' : i + 1 === 3 ? '🥉' : `#${i + 1}`),
      el('div', { class: 'lb-avatar' }, (s.full_name || 'S').charAt(0).toUpperCase()),
      el('div', { class: 'lb-info' }, [
        el('div', { class: 'lb-name' }, s.full_name),
        el('div', { class: 'muted small' }, `${s.branch} • ${s.year} • ${s.section}`),
      ]),
      el('div', { class: 'lb-score' }, `${Math.round(s.overall_score || 0)}`),
    ]));
  });
  wrap.appendChild(list);
  return wrap;
}
