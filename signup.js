const signupForm = document.getElementById('signup-form');
const signupMessage = document.getElementById('signup-message');
const sessionKey = 'tahder-site-session';

const messages = {
  creating: '\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628...',
  localCreated: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062a\u062c\u0631\u0628\u0629 \u0645\u062d\u0644\u064a. \u0633\u064a\u062a\u0645 \u0646\u0642\u0644\u0643 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628.',
  notConfigured: '\u0644\u0645 \u064a\u062a\u0645 \u0631\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0639\u062f.',
  createdWithTrial: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u062c\u0631\u0628\u0629. \u0633\u064a\u062a\u0645 \u0646\u0642\u0644\u0643 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628.',
  createdNeedsActivation: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u062d\u062a\u0627\u062c \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0625\u0644\u0649 \u062a\u0641\u0639\u064a\u0644 \u0645\u0646 \u0627\u0644\u0625\u062f\u0627\u0631\u0629.',
  confirmEmail: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u0625\u0630\u0627 \u0643\u0627\u0646 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0641\u0639\u0644\u0627\u060c \u0631\u0627\u062c\u0639 \u0628\u0631\u064a\u062f\u0643 \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0633\u0627\u0628 \u062b\u0645 \u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.',
  localFallback: '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u060c \u0641\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062a\u062c\u0631\u0628\u0629 \u0645\u062d\u0644\u064a. \u0633\u064a\u062a\u0645 \u0646\u0642\u0644\u0643 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628.',
  failed: '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
};

function isLocalHost() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function showMessage(message, tone = 'info') {
  signupMessage.textContent = message;
  signupMessage.dataset.tone = tone;
  signupMessage.hidden = false;
}

function saveSiteSession(email, subscription = 'demo') {
  localStorage.setItem(sessionKey, JSON.stringify({ email, subscription }));
}

function goToAccount() {
  window.location.href = 'index.html#account';
}

async function activateTrialIfPossible(session) {
  try {
    const existing = await globalThis.TahderSupabase.getActiveSubscription(session);
    if (existing) return existing;
  } catch (_) {
    // New accounts may not be allowed to read subscriptions yet.
  }

  try {
    const rows = await globalThis.TahderSupabase.createTrialSubscription(session);
    return Array.isArray(rows) ? rows[0] : rows;
  } catch (_) {
    return null;
  }
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const phone = String(formData.get('phone') || '').trim();
  const displayName = String(formData.get('display_name') || '').trim();

  showMessage(messages.creating, 'info');

  try {
    if (!globalThis.TahderSupabase?.isConfigured()) {
      if (isLocalHost()) {
        saveSiteSession(email, 'demo');
        showMessage(messages.localCreated, 'success');
        window.setTimeout(goToAccount, 700);
        return;
      }

      throw new Error(messages.notConfigured);
    }

    const result = await globalThis.TahderSupabase.signUp(email, password, {
      display_name: displayName || email.split('@')[0],
      phone,
    });

    if (result?.session) {
      await globalThis.TahderSupabase.updateProfile(result.session, {
        phone,
        display_name: displayName || email.split('@')[0],
      }).catch(() => {});

      const subscription = await activateTrialIfPossible(result.session);
      saveSiteSession(email, subscription?.status || (isLocalHost() ? 'demo' : 'pending'));
      showMessage(subscription ? messages.createdWithTrial : messages.createdNeedsActivation, 'success');
      signupForm.reset();
      window.setTimeout(goToAccount, 900);
      return;
    }

    showMessage(messages.confirmEmail, 'success');
    signupForm.reset();
  } catch (error) {
    if (isLocalHost()) {
      saveSiteSession(email, 'demo');
      showMessage(messages.localFallback, 'success');
      signupForm.reset();
      window.setTimeout(goToAccount, 900);
      return;
    }

    showMessage(error.message || messages.failed, 'error');
  }
});
