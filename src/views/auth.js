import { el, clear, toast } from '../ui.js';
import { BRANCHES, YEARS, SECTIONS } from '../constants.js';
import { signUpStudent, signInStudent, verifyAdmin } from '../auth.js';
import { renderStudentApp } from '../student.js';
import { renderAdminApp } from '../admin.js';

export function renderLanding(app) {
  clear(app);
  app.appendChild(el('div', { class: 'auth-bg' }));
  const card = el('div', { class: 'glass auth-card' });
  card.appendChild(el('div', { class: 'brand' }, [
    el('div', { class: 'brand-mark' }, 'AI'),
    el('div', {}, [
      el('h1', { class: 'brand-title' }, 'AI Student Assessment'),
      el('p', { class: 'brand-sub' }, 'Powered by Google Gemini 2.5 Flash'),
    ]),
  ]));
  card.appendChild(el('p', { class: 'auth-tagline' }, 'Sign in to access your assessment dashboard, AI interviews, and personalized reports.'));
  const btnRow = el('div', { class: 'auth-btn-row' }, [
    el('button', { class: 'btn btn-primary', onclick: () => renderStudentLogin(app) }, 'Student Login'),
    el('button', { class: 'btn btn-ghost', onclick: () => renderAdminLogin(app) }, 'Admin Login'),
    el('button', { class: 'btn btn-outline', onclick: () => renderStudentRegister(app) }, 'Register'),
  ]);
  card.appendChild(btnRow);
  app.appendChild(card);
}

export function renderStudentLogin(app) {
  clear(app);
  app.appendChild(el('div', { class: 'auth-bg' }));
  const card = el('div', { class: 'glass auth-card' });
  card.appendChild(el('h2', { class: 'auth-title' }, 'Student Login'));
  const emailInput = el('input', { class: 'input', type: 'email', placeholder: 'Email', autocomplete: 'email' });
  const passInput = el('input', { class: 'input', type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
  const submit = el('button', { class: 'btn btn-primary btn-block', onclick: async () => {
    submit.disabled = true;
    submit.textContent = 'Signing in...';
    try {
      await signInStudent({ email: emailInput.value, password: passInput.value });
      await renderStudentApp(app);
    } catch (e) {
      toast(e.message, 'error');
      submit.disabled = false;
      submit.textContent = 'Sign In';
    }
  } }, 'Sign In');
  passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit.click(); });
  card.append(
    el('label', { class: 'field-label' }, 'Email'),
    emailInput,
    el('label', { class: 'field-label' }, 'Password'),
    passInput,
    submit,
    el('div', { class: 'auth-links' }, [
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderStudentRegister(app); } }, 'New student? Register'),
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderLanding(app); } }, 'Back'),
    ]),
  );
  app.appendChild(card);
}

export function renderStudentRegister(app) {
  clear(app);
  app.appendChild(el('div', { class: 'auth-bg' }));
  const card = el('div', { class: 'glass auth-card' });
  card.appendChild(el('h2', { class: 'auth-title' }, 'Student Registration'));
  const fields = {};
  const makeField = (label, type, placeholder) => {
    const input = el('input', { class: 'input', type, placeholder });
    fields[label] = input;
    return [el('label', { class: 'field-label' }, label), input];
  };
  const branchSel = el('select', { class: 'input' }, [el('option', { value: '' }, 'Select Branch'), ...BRANCHES.map(b => el('option', { value: b }, b))]);
  const yearSel = el('select', { class: 'input' }, [el('option', { value: '' }, 'Select Year'), ...YEARS.map(y => el('option', { value: y }, y))]);
  const sectionSel = el('select', { class: 'input' }, [el('option', { value: '' }, 'Select Section'), ...SECTIONS.map(s => el('option', { value: s }, s))]);
  fields['Branch'] = branchSel;
  fields['Year'] = yearSel;
  fields['Section'] = sectionSel;
  const submit = el('button', { class: 'btn btn-primary btn-block', onclick: async () => {
    if (!fields['Full Name'].value || !fields['Roll Number'].value || !branchSel.value || !yearSel.value || !sectionSel.value || !fields['Email'].value || !fields['Password'].value) {
      toast('Please fill all fields', 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Creating account...';
    try {
      await signUpStudent({
        fullName: fields['Full Name'].value,
        rollNumber: fields['Roll Number'].value,
        branch: branchSel.value,
        year: yearSel.value,
        section: sectionSel.value,
        email: fields['Email'].value,
        password: fields['Password'].value,
      });
      toast('Account created! Please sign in.', 'success');
      renderStudentLogin(app);
    } catch (e) {
      toast(e.message, 'error');
      submit.disabled = false;
      submit.textContent = 'Register';
    }
  } }, 'Register');
  card.append(
    ...makeField('Full Name', 'text', 'Your full name'),
    ...makeField('Roll Number', 'text', 'e.g. 21A91A0501'),
    el('label', { class: 'field-label' }, 'Branch'),
    branchSel,
    el('label', { class: 'field-label' }, 'Year'),
    yearSel,
    el('label', { class: 'field-label' }, 'Section'),
    sectionSel,
    ...makeField('Email', 'email', 'you@college.edu'),
    ...makeField('Password', 'password', 'Min 6 characters'),
    submit,
    el('div', { class: 'auth-links' }, [
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderStudentLogin(app); } }, 'Already registered? Login'),
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderLanding(app); } }, 'Back'),
    ]),
  );
  app.appendChild(card);
}

export function renderAdminLogin(app) {
  clear(app);
  app.appendChild(el('div', { class: 'auth-bg' }));
  const card = el('div', { class: 'glass auth-card' });
  card.appendChild(el('h2', { class: 'auth-title' }, 'Admin Login'));
  const u = el('input', { class: 'input', type: 'text', placeholder: 'Username', autocomplete: 'username' });
  const p = el('input', { class: 'input', type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
  const submit = el('button', { class: 'btn btn-primary btn-block', onclick: () => {
    if (verifyAdmin(u.value, p.value)) {
      sessionStorage.setItem('admin_session', '1');
      renderAdminApp(app);
    } else {
      toast('Invalid admin credentials', 'error');
    }
  } }, 'Sign In');
  p.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit.click(); });
  card.append(
    el('label', { class: 'field-label' }, 'Username'),
    u,
    el('label', { class: 'field-label' }, 'Password'),
    p,
    submit,
    el('div', { class: 'auth-links' }, [
      el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderLanding(app); } }, 'Back'),
    ]),
  );
  app.appendChild(card);
}
