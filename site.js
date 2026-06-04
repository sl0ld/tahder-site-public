const sessionKey = 'tahder-site-session';
const dialog = document.getElementById('login-dialog');
const loginForm = document.getElementById('login-form');
const accountEmpty = document.getElementById('account-empty');
const accountActive = document.getElementById('account-active');
const accountEmail = document.getElementById('account-email');
const accountPlan = document.getElementById('account-plan');
const accountPreps = document.getElementById('account-preps');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');

function readSession() {
  const stored = localStorage.getItem(sessionKey);
  const session = stored ? JSON.parse(stored) : null;

  if (globalThis.TahderSupabase?.isConfigured() && !globalThis.TahderSupabase.readSession()) {
    localStorage.removeItem(sessionKey);
    return null;
  }

  return session;
}

async function renderSession() {
  const session = readSession();
  accountEmpty.hidden = Boolean(session);
  accountActive.hidden = !session;

  if (session) {
    accountEmail.textContent = session.email;
    accountPlan.textContent = `الخطة: ${session.subscription}`;
    accountPreps.textContent = 'بنك التحاضير: جار التحديث';

    if (globalThis.TahderSupabase?.isConfigured()) {
      try {
        const preparations = await globalThis.TahderSupabase.listPreparations();
        accountPreps.textContent = `بنك التحاضير: ${preparations.length} تحضير`;
      } catch (_) {
        accountPreps.textContent = 'بنك التحاضير: تعذر التحديث';
      }
    }
  }
}

document.querySelectorAll('[data-open-login]').forEach((button) => {
  button.addEventListener('click', () => {
    dialog.hidden = false;
  });
});

document.querySelector('.dialog-close').addEventListener('click', () => {
  dialog.hidden = true;
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  loginError.hidden = true;

  try {
    if (globalThis.TahderSupabase?.isConfigured()) {
      const authSession = await globalThis.TahderSupabase.signIn(email, password);
      const subscription = await globalThis.TahderSupabase.getActiveSubscription(authSession);

      if (!subscription) {
        await globalThis.TahderSupabase.signOut();
        throw new Error('الحساب صحيح، لكنه لا يملك اشتراكاً فعالاً حالياً.');
      }

      await globalThis.TahderSupabase.recordActivity(authSession, 'site_login');
      localStorage.setItem(sessionKey, JSON.stringify({ email, subscription: subscription.status }));
    } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      localStorage.setItem(sessionKey, JSON.stringify({ email, subscription: 'demo' }));
    } else {
      throw new Error('لم يتم ربط الموقع بقاعدة البيانات بعد.');
    }

    dialog.hidden = true;
    await renderSession();
    document.getElementById('account').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutButton.addEventListener('click', async () => {
  if (globalThis.TahderSupabase?.isConfigured()) {
    await globalThis.TahderSupabase.signOut();
  }
  localStorage.removeItem(sessionKey);
  await renderSession();
});

renderSession();
