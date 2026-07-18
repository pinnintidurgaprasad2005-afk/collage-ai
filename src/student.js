import { el, clear, toast, gradeFromScore, formatDate } from './ui.js';
import { supabase } from './supabase.js';
import { signOut, getCurrentStudent, updateLoginStreak } from './auth.js';
import { BADGE_DEFINITIONS, MOTIVATIONAL_QUOTES, NOTIFICATION_TYPES } from './constants.js';
import { renderLanding } from './views/auth.js';
import { renderInterview } from './views/interview.js';
import { renderTest } from './views/test.js';
import { renderReportsView } from './views/reports.js';
import { renderChartsView } from './views/charts.js';
import { renderNotificationsView } from './views/notifications.js';

let currentStudent = null;

export async function renderStudentApp(app) {
  currentStudent = await getCurrentStudent();
  if (!currentStudent) {
    toast('Student profile not found', 'error');
    await signOut();
    renderLanding(app);
    return;
  }
  currentStudent = await updateLoginStreak(currentStudent);
  await renderStudentDashboard(app, 'dashboard');
}

export function getCurrentStudentData() {
  return currentStudent;
}

export function setCurrentStudentData(s) {
  currentStudent = s;
}

export async function refreshStudent() {
  currentStudent = await getCurrentStudent();
  return currentStudent;
}

export async function renderStudentDashboard(app, view = 'dashboard', extra = {}) {
  clear(app);
  const s = currentStudent;
  const layout = el('div', { class: 'app-layout' });
  layout.appendChild(renderSidebar(app, view));
  const main = el('main', { class: 'main-content' });
  main.appendChild(renderTopbar(app));
  const content = el('div', { class: 'content-area' });
  if (view === 'dashboard') content.appendChild(await renderDashboardHome(app));
  else if (view === 'interview') content.appendChild(renderInterview(app, currentStudent, () => renderStudentApp(app)));
  else if (view === 'aptitude') content.appendChild(renderTest(app, currentStudent, 'aptitude', () => renderStudentApp(app)));
  else if (view === 'vocabulary') content.appendChild(renderTest(app, currentStudent, 'vocabulary', () => renderStudentApp(app)));
  else if (view === 'technical') content.appendChild(renderTest(app, currentStudent, 'technical', () => renderStudentApp(app)));
  else if (view === 'reports') content.appendChild(await renderReportsView(app, currentStudent, () => renderStudentApp(app)));
  else if (view === 'charts') content.appendChild(await renderChartsView(app, currentStudent));
  else if (view === 'notifications') content.appendChild(await renderNotificationsView(app, currentStudent, () => renderStudentDashboard(app, 'notifications')));
  main.appendChild(content);
  layout.appendChild(main);
  app.appendChild(layout);
}

function renderSidebar(app, view) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'interview', label: 'AI Interview', icon: 'mic' },
    { id: 'aptitude', label: 'Aptitude Test', icon: 'brain' },
    { id: 'vocabulary', label: 'Vocabulary Test', icon: 'book' },
    { id: 'technical', label: 'Technical Test', icon: 'code' },
    { id: 'reports', label: 'AI Reports', icon: 'doc' },
    { id: 'charts', label: 'Performance Charts', icon: 'chart' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
  ];
  const nav = el('nav', { class: 'sidebar' }, [
    el('div', { class: 'sidebar-brand' }, [
      el('div', { class: 'brand-mark' }, 'AI'),
      el('span', { class: 'sidebar-brand-text' }, 'AssessAI'),
    ]),
    el('div', { class: 'sidebar-nav' }, items.map(it =>
      el('button', {
        class: `nav-item ${view === it.id ? 'active' : ''}`,
        onclick: () => renderStudentDashboard(app, it.id),
      }, [
        el('span', { class: `nav-icon icon-${it.icon}` }),
        el('span', {}, it.label),
      ])
    )),
    el('div', { class: 'sidebar-footer' }, [
      el('button', { class: 'btn btn-ghost btn-block', onclick: async () => {
        await signOut();
        renderLanding(app);
      } }, 'Sign Out'),
    ]),
  ]);
  return nav;
}

function renderTopbar(app) {
  const s = currentStudent;
  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  return el('header', { class: 'topbar' }, [
    el('div', { class: 'topbar-left' }, [
      el('h2', {}, `Welcome, ${s.full_name.split(' ')[0]}`),
      el('p', { class: 'topbar-sub' }, `"${quote.text}" — ${quote.author}`),
    ]),
    el('div', { class: 'topbar-right' }, [
      el('div', { class: 'streak-badge' }, [
        el('span', { class: 'streak-icon' }, '🔥'),
        el('div', {}, [
          el('div', { class: 'streak-num' }, `${s.login_streak || 0}`),
          el('div', { class: 'streak-label' }, 'Day Streak'),
        ]),
      ]),
      el('div', { class: 'user-chip' }, [
        el('div', { class: 'avatar' }, (s.full_name || 'S').charAt(0).toUpperCase()),
        el('div', {}, [
          el('div', { class: 'user-name' }, s.full_name),
          el('div', { class: 'user-meta' }, `${s.branch} • ${s.year} • ${s.section}`),
        ]),
      ]),
    ]),
  ]);
}

async function renderDashboardHome(app) {
  const s = currentStudent;
  const wrap = el('div', { class: 'dashboard-grid' });

  // Welcome card
  wrap.appendChild(el('div', { class: 'glass card welcome-card' }, [
    el('div', { class: 'welcome-greeting' }, [
      el('h2', {}, `Hi, ${s.full_name}!`),
      el('p', { class: 'muted' }, `${s.roll_number} • ${s.branch} • ${s.year} • Section ${s.section}`),
    ]),
    el('div', { class: 'welcome-cta' }, [
      el('button', { class: 'btn btn-primary', onclick: () => renderStudentDashboard(app, 'interview') }, 'Start AI Interview'),
      el('button', { class: 'btn btn-outline', onclick: () => renderStudentDashboard(app, 'reports') }, 'View Reports'),
    ]),
  ]));

  // Top performer card
  const { data: topStudent } = await supabase
    .from('students')
    .select('full_name, branch, overall_score')
    .order('overall_score', { ascending: false })
    .limit(1)
    .maybeSingle();
  wrap.appendChild(el('div', { class: 'glass card top-performer-card' }, [
    el('div', { class: 'card-head' }, [
      el('span', { class: 'card-icon trophy' }, '🏆'),
      el('h3', {}, "Today's Top Performer"),
    ]),
    topStudent ? el('div', { class: 'top-perf-body' }, [
      el('div', { class: 'top-perf-name' }, topStudent.full_name),
      el('div', { class: 'top-perf-meta' }, topStudent.branch),
      el('div', { class: 'top-perf-score' }, `${Math.round(topStudent.overall_score || 0)} / 100`),
    ]) : el('p', { class: 'muted' }, 'No data yet'),
  ]));

  // Today's goal
  wrap.appendChild(el('div', { class: 'glass card goal-card' }, [
    el('div', { class: 'card-head' }, [el('span', { class: 'card-icon' }, '🎯'), el('h3', {}, "Today's Goal")]),
    el('p', {}, 'Complete at least one assessment today to maintain your streak and improve your AI score.'),
  ]));

  // Progress cards
  const [{ count: interviewCount }, { count: aptCount }, { count: vocabCount }, { count: techCount }] = await Promise.all([
    supabase.from('interview_reports').select('*', { count: 'exact', head: true }).eq('user_id', s.user_id),
    supabase.from('aptitude_reports').select('*', { count: 'exact', head: true }).eq('user_id', s.user_id),
    supabase.from('vocabulary_reports').select('*', { count: 'exact', head: true }).eq('user_id', s.user_id),
    supabase.from('technical_reports').select('*', { count: 'exact', head: true }).eq('user_id', s.user_id),
  ]);
  const completed = (interviewCount || 0) + (aptCount || 0) + (vocabCount || 0) + (techCount || 0);
  const pending = Math.max(0, 4 - completed);

  wrap.appendChild(el('div', { class: 'glass card stat-card' }, [
    el('div', { class: 'stat-label' }, 'Overall AI Score'),
    el('div', { class: 'stat-value' }, `${Math.round(s.overall_score || 0)}`),
    el('div', { class: 'stat-sub' }, `Grade: ${gradeFromScore(Number(s.overall_score || 0))}`),
  ]));
  wrap.appendChild(el('div', { class: 'glass card stat-card success' }, [
    el('div', { class: 'stat-label' }, 'Completed Tests'),
    el('div', { class: 'stat-value' }, `${completed}`),
  ]));
  wrap.appendChild(el('div', { class: 'glass card stat-card warning' }, [
    el('div', { class: 'stat-label' }, 'Pending Tests'),
    el('div', { class: 'stat-value' }, `${pending}`),
  ]));
  wrap.appendChild(el('div', { class: 'glass card stat-card accent' }, [
    el('div', { class: 'stat-label' }, 'Login Streak'),
    el('div', { class: 'stat-value' }, `${s.login_streak || 0} 🔥`),
  ]));

  // Badges
  const earnedBadges = BADGE_DEFINITIONS.filter(b => (s.badges || []).includes(b.id));
  wrap.appendChild(el('div', { class: 'glass card badges-card' }, [
    el('div', { class: 'card-head' }, [el('h3', {}, 'Achievement Badges')]),
    el('div', { class: 'badges-grid' }, [
      ...BADGE_DEFINITIONS.map(b => {
        const earned = earnedBadges.some(e => e.id === b.id);
        return el('div', { class: `badge ${earned ? 'earned' : 'locked'}`, title: b.desc }, [
          el('div', { class: 'badge-icon' }, badgeEmoji(b.id)),
          el('div', { class: 'badge-label' }, b.label),
        ]);
      }),
    ]),
  ]));

  // Recent activity
  const { data: recent } = await supabase
    .from('final_reports')
    .select('created_at, overall_score, grade')
    .eq('user_id', s.user_id)
    .order('created_at', { ascending: false })
    .limit(5);
  wrap.appendChild(el('div', { class: 'glass card recent-card' }, [
    el('div', { class: 'card-head' }, [el('h3', {}, 'Recent Activity')]),
    recent && recent.length ? el('div', { class: 'recent-list' }, recent.map(r =>
      el('div', { class: 'recent-item' }, [
        el('div', {}, `AI Report generated — Score ${Math.round(r.overall_score)} (${r.grade})`),
        el('div', { class: 'muted small' }, formatDate(r.created_at)),
      ])
    )) : el('p', { class: 'muted' }, 'No recent activity. Take a test to get started!'),
  ]));

  return wrap;
}

function badgeEmoji(id) {
  const map = { first_login: '⭐', streak_7: '🔥', streak_30: '🔥', streak_100: '🔥', interview_done: '🎤', top_performer: '🏆', fast_learner: '⚡', perfect_score: '👑' };
  return map[id] || '🏅';
}
