const sessionKey = 'tahder-site-session';
const dialog = document.getElementById('login-dialog');
const loginForm = document.getElementById('login-form');
const accountEmpty = document.getElementById('account-empty');
const accountActive = document.getElementById('account-active');
const accountEmail = document.getElementById('account-email');
const accountPlan = document.getElementById('account-plan');
const accountPreps = document.getElementById('account-preps');
const accountIdentity = document.getElementById('account-devices');
const accountDevices = accountIdentity;
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');
const siteHeader = document.querySelector('.clean-header');
const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.getElementById('primary-nav');
const navBackdrop = document.querySelector('[data-nav-close]');

function setMobileNav(open) {
  if (!siteHeader || !navToggle || !primaryNav) return;

  siteHeader.classList.toggle('is-menu-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  if (navBackdrop) navBackdrop.hidden = !open;
  document.body.classList.toggle('nav-open', open);
}

navToggle?.addEventListener('click', () => {
  setMobileNav(!siteHeader?.classList.contains('is-menu-open'));
});

navBackdrop?.addEventListener('click', () => setMobileNav(false));

primaryNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    setMobileNav(false);

    if (!href) return;

    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', href);
      return;
    }

    event.preventDefault();
    window.location.href = href;
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMobileNav(false);
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) setMobileNav(false);
});

function isLocalHost() {
  return location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '127.0.0.1.nip.io';
}

function readSession() {
  const stored = localStorage.getItem(sessionKey);
  let session = null;

  try {
    session = stored ? JSON.parse(stored) : null;
  } catch (_) {
    localStorage.removeItem(sessionKey);
    return null;
  }

  const isLocalDemo = isLocalHost() && session?.subscription === 'demo';

  if (globalThis.TahderApi?.isConfigured() && !globalThis.TahderApi.readSession() && !isLocalDemo) {
    localStorage.removeItem(sessionKey);
    return null;
  }

  return session;
}

async function ensureSignupSubscription(authSession) {
  let subscription = await globalThis.TahderApi.getActiveSubscription(authSession);
  if (subscription) return subscription;

  const selectedPlanId = authSession.user?.user_metadata?.selected_plan || 'trial';

  if (!globalThis.TahderApi.activateSignupSubscription) {
    return null;
  }

  try {
    const rows = await globalThis.TahderApi.activateSignupSubscription(selectedPlanId, authSession);
    subscription = Array.isArray(rows) ? rows[0] : rows;
    return subscription || null;
  } catch (_) {
    return null;
  }
}

async function renderSession() {
  const session = readSession();
  accountEmpty.hidden = Boolean(session);
  accountActive.hidden = !session;

  if (!session) {
    accountEmail.textContent = '';
    accountPlan.textContent = '';
    accountPreps.textContent = '';
    accountIdentity.textContent = '';
    return;
  }

  if (session) {
    accountEmail.textContent = session.email;
    accountPlan.textContent = `الخطة: ${session.subscription}`;
    accountPreps.textContent = 'بنك التحاضير: جار التحديث';
    accountDevices.textContent = 'الأجهزة المرتبطة: جار التحديث';

    if (globalThis.TahderApi?.isConfigured()) {
      try {
        const preparations = await globalThis.TahderApi.listPreparations();
        accountPreps.textContent = `بنك التحاضير: ${preparations.length} تحضير`;
      } catch (_) {
        accountPreps.textContent = 'بنك التحاضير: تعذر التحديث';
      }

      try {
        const devices = await globalThis.TahderApi.listLinkedDevices();
        const activeDevices = devices.filter((device) => device.is_active);
        const latestDevice = activeDevices[0] || devices[0];
        const latestText = latestDevice?.last_seen_at
          ? ` · آخر نشاط ${new Date(latestDevice.last_seen_at).toLocaleDateString('ar-SA')}`
          : '';
        accountDevices.textContent = `الأجهزة المرتبطة: ${activeDevices.length || devices.length} جهاز${latestText}`;
      } catch (_) {
        accountDevices.textContent = 'الأجهزة المرتبطة: تعذر التحديث';
      }
      accountIdentity.textContent = 'تحقق مدرستي: الحساب يعمل فقط مع نفس المعلم داخل المنصة';
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
    if (globalThis.TahderApi?.isConfigured()) {
      const authSession = await globalThis.TahderApi.signIn(email, password);
      const subscription = await ensureSignupSubscription(authSession);

      if (!subscription) {
        await globalThis.TahderApi.signOut();
        throw new Error('الحساب صحيح، لكنه لا يملك اشتراكاً فعالاً حالياً.');
      }

      await globalThis.TahderApi.recordActivity(authSession, 'site_login');
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
    if (isLocalHost()) {
      await globalThis.TahderApi?.signOut?.().catch(() => {});
      localStorage.setItem(sessionKey, JSON.stringify({ email, subscription: 'demo' }));
      dialog.hidden = true;
      await renderSession();
      document.getElementById('account').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    await globalThis.TahderApi?.signOut?.().catch(() => {});
    localStorage.removeItem(sessionKey);
    await renderSession();
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutButton.addEventListener('click', async () => {
  loginError.hidden = true;
  dialog.hidden = true;

  if (globalThis.TahderApi?.isConfigured()) {
    await globalThis.TahderApi.signOut();
  }
  localStorage.removeItem(sessionKey);
  await renderSession();
});

renderSession();
