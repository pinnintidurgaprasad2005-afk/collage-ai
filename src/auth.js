import { supabase } from './supabase.js';
import { ADMIN_CREDENTIALS } from './constants.js';

export async function signUpStudent({ fullName, rollNumber, branch, year, section, email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);

  const userId = data.user.id;
  const { error: profileErr } = await supabase.from('students').insert({
    user_id: userId,
    full_name: fullName,
    roll_number: rollNumber,
    branch,
    year,
    section,
    email,
    badges: ['first_login'],
  });
  if (profileErr) throw new Error(profileErr.message);

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'badge_earned',
    message: 'Welcome! You earned the "First Login" badge.',
  });

  return { userId, email };
}

export async function signInStudent({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentStudent() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('students').select('*').eq('user_id', user.id).maybeSingle();
  return data;
}

export async function updateLoginStreak(student) {
  const today = new Date().toISOString().slice(0, 10);
  if (student.last_login_date === today) return student;
  let streak = student.login_streak || 0;
  if (student.last_login_date) {
    const last = new Date(student.last_login_date);
    const diff = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
    streak = diff === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }
  const badges = new Set(student.badges || []);
  if (streak >= 7) badges.add('streak_7');
  if (streak >= 30) badges.add('streak_30');
  if (streak >= 100) badges.add('streak_100');
  const newBadges = [...badges].filter(b => !(student.badges || []).includes(b));
  const { data } = await supabase.from('students').update({
    login_streak: streak,
    last_login_date: today,
    badges: [...badges],
  }).eq('user_id', student.user_id).select().maybeSingle();
  if (newBadges.length) {
    for (const b of newBadges) {
      await supabase.from('notifications').insert({
        user_id: student.user_id,
        type: 'badge_earned',
        message: `Congratulations! You earned a streak badge (${b}).`,
      });
    }
  }
  return data || { ...student, login_streak: streak, last_login_date: today, badges: [...badges] };
}

export function verifyAdmin(username, password) {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}
