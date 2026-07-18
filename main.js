import './style.css';
import { supabase } from './src/supabase.js';
import { renderLanding } from './src/views/auth.js';
import { renderStudentApp } from './src/student.js';
import { renderAdminApp } from './src/admin.js';

const app = document.getElementById('app');

async function bootstrap() {
  const adminSession = sessionStorage.getItem('admin_session') === '1';
  if (adminSession) {
    renderAdminApp(app);
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    try {
      await renderStudentApp(app);
    } catch (e) {
      console.error(e);
      renderLanding(app);
    }
  } else {
    renderLanding(app);
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  (async () => {
    if (event === 'SIGNED_OUT') {
      sessionStorage.removeItem('admin_session');
      renderLanding(app);
    }
  })();
});

bootstrap();
