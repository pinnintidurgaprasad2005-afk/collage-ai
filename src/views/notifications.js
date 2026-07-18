import { el } from '../ui.js';
import { supabase } from '../supabase.js';

export async function renderNotificationsView(app, student, onDone) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'Notifications'));
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', student.user_id)
    .order('created_at', { ascending: false });
  if (!notifs || notifs.length === 0) {
    wrap.appendChild(el('div', { class: 'glass card' }, [el('p', { class: 'muted' }, 'No notifications yet.')]));
    return wrap;
  }
  const list = el('div', { class: 'notif-list' });
  for (const n of notifs) {
    const item = el('div', { class: `notif-item ${n.read ? '' : 'unread'}` }, [
      el('div', { class: 'notif-icon' }, notifIcon(n.type)),
      el('div', { class: 'notif-body' }, [
        el('div', { class: 'notif-msg' }, n.message),
        el('div', { class: 'muted small' }, new Date(n.created_at).toLocaleString()),
      ]),
      n.read ? null : el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => {
        await supabase.from('notifications').update({ read: true }).eq('id', n.id);
        onDone();
      } }, 'Mark read'),
    ]);
    list.appendChild(item);
  }
  wrap.appendChild(list);
  return wrap;
}

function notifIcon(type) {
  const map = { new_test: '📝', report_ready: '📄', badge_earned: '🏅', streak_reminder: '🔥' };
  return map[type] || '🔔';
}
