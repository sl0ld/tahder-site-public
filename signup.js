const signupForm = document.getElementById('signup-form');
const signupMessage = document.getElementById('signup-message');
const planOptions = document.getElementById('plan-options');
const sessionKey = 'tahder-site-session';
const requestedPlanId = new URLSearchParams(window.location.search).get('plan') || 'trial';
const steps = Array.from(document.querySelectorAll('.signup-step'));
const progressSteps = Array.from(document.querySelectorAll('[data-progress-step]'));
let currentStep = 1;

const messages = {
  creating: 'جاري إنشاء الحساب وبدء التجربة...',
  localCreated: 'تم إنشاء حساب تجربة محلي. سيتم نقلك إلى صفحة الحساب.',
  notConfigured: '\u0644\u0645 \u064a\u062a\u0645 \u0631\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0639\u062f.',
  createdWithTrial: 'تم إنشاء الحساب وتفعيل الباقة. سيتم نقلك إلى صفحة الحساب.',
  createdNeedsActivation: 'تم إنشاء الحساب. يحتاج الاشتراك إلى تفعيل من الإدارة.',
  confirmEmail: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u0625\u0630\u0627 \u0643\u0627\u0646 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0641\u0639\u0644\u0627\u060c \u0631\u0627\u062c\u0639 \u0628\u0631\u064a\u062f\u0643 \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0633\u0627\u0628 \u062b\u0645 \u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.',
  plansFallback: '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0627\u0642\u0627\u062a\u060c \u0648\u0633\u0646\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0642\u0629 \u0627\u0644\u062a\u062c\u0631\u0628\u0629 \u0645\u0624\u0642\u062a\u0627\u064b.',
  emailRateLimit: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u062d\u0633\u0627\u0628\u060c \u0644\u0643\u0646 \u0627\u0644\u062e\u0627\u062f\u0645 \u0623\u0648\u0642\u0641 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0645\u0624\u0642\u062a\u0627\u064b \u0628\u0633\u0628\u0628 \u0643\u062b\u0631\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0627\u062a. \u0627\u0646\u062a\u0638\u0631 \u0642\u0644\u064a\u0644\u0627\u064b \u062b\u0645 \u062c\u0631\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648 \u0623\u0639\u062f \u0627\u0644\u062a\u0633\u062c\u064a\u0644.',
  localFallback: '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u060c \u0641\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062a\u062c\u0631\u0628\u0629 \u0645\u062d\u0644\u064a. \u0633\u064a\u062a\u0645 \u0646\u0642\u0644\u0643 \u0625\u0644\u0649 \u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628.',
  failed: '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
  stepRequired: 'أكمل الحقول المطلوبة قبل المتابعة.',
};

function isLocalHost() {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function showMessage(message, tone = 'info') {
  signupMessage.textContent = message;
  signupMessage.dataset.tone = tone;
  signupMessage.hidden = false;
}

function hideMessage() {
  signupMessage.hidden = true;
  signupMessage.textContent = '';
  delete signupMessage.dataset.tone;
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach((error) => {
    error.textContent = '';
  });
  signupForm.querySelectorAll('.input-error').forEach((input) => {
    input.classList.remove('input-error');
  });
}

function fieldMessage(field) {
  if (field.validity.valueMissing) return 'هذا الحقل مطلوب.';
  if (field.validity.typeMismatch) return 'اكتب بريدًا إلكترونيًا صحيحًا.';
  if (field.validity.tooShort) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
  return 'تحقق من قيمة هذا الحقل.';
}

function setFieldError(field) {
  const name = field.name;
  const error = document.querySelector(`[data-error-for="${name}"]`);
  field.classList.add('input-error');
  if (error) error.textContent = fieldMessage(field);
}

function setStep(stepNumber) {
  currentStep = stepNumber;
  steps.forEach((step) => {
    const isActive = Number(step.dataset.step) === currentStep;
    step.hidden = !isActive;
    step.classList.toggle('active', isActive);
  });
  progressSteps.forEach((step) => {
    const number = Number(step.dataset.progressStep);
    step.classList.toggle('active', number === currentStep);
    step.classList.toggle('done', number < currentStep);
  });
  hideMessage();
  clearFieldErrors();
}

function activeStepFields() {
  const activeStep = document.querySelector(`.signup-step[data-step="${currentStep}"]`);
  return Array.from(activeStep?.querySelectorAll('input, select, textarea') || [])
    .filter((field) => field.type !== 'radio' || field.required);
}

function validateCurrentStep() {
  clearFieldErrors();
  const invalidFields = activeStepFields().filter((field) => !field.checkValidity());

  if (invalidFields.length) {
    invalidFields.forEach(setFieldError);
    showMessage(messages.stepRequired, 'error');
    invalidFields[0].focus();
    return false;
  }

  hideMessage();
  return true;
}

function normalizeSignupError(error) {
  const text = String(error?.message || error || '').toLowerCase();

  if (text.includes('email rate limit exceeded') || text.includes('rate limit')) {
    return { message: messages.emailRateLimit, tone: 'info' };
  }

  return { message: error?.message || messages.failed, tone: 'error' };
}

function saveSiteSession(email, subscription = 'demo') {
  localStorage.setItem(sessionKey, JSON.stringify({ email, subscription }));
}

function formatPlanPrice(plan) {
  const price = Number(plan.price_sar || 0);
  return price ? `${price.toLocaleString('ar-SA')} ريال` : '\u0645\u062c\u0627\u0646\u064a';
}

function formatPlanMeta(plan) {
  const days = Number(plan.duration_days || 0);
  const features = plan.features || {};
  const parts = [];

  if (days) parts.push(`${days.toLocaleString('ar-SA')} \u064a\u0648\u0645`);
  if (features.ai_generations) parts.push(`${Number(features.ai_generations).toLocaleString('ar-SA')} \u062a\u0648\u0644\u064a\u062f AI`);

  return parts.join(' \u00b7 ') || '\u0628\u0627\u0642\u0629 \u062a\u062d\u0636\u064a\u0631\u064a';
}

function renderPlans(plans) {
  if (!planOptions || !Array.isArray(plans) || !plans.length) return;
  const hasRequestedPlan = plans.some((plan) => plan.id === requestedPlanId);

  planOptions.innerHTML = plans.map((plan, index) => `
    <label class="plan-option">
      <input name="plan_id" type="radio" value="${plan.id}" ${(hasRequestedPlan ? plan.id === requestedPlanId : index === 0) ? 'checked' : ''}>
      <span>
        <b>${plan.name_ar || plan.id}</b>
        <small>${formatPlanMeta(plan)}</small>
      </span>
      <strong>${formatPlanPrice(plan)}</strong>
    </label>
  `).join('');
}

async function loadPlans() {
  if (!globalThis.TahderApi?.isConfigured()) return;

  try {
    const plans = await globalThis.TahderApi.listPlans();
    renderPlans(plans);
  } catch (_) {
    showMessage(messages.plansFallback, 'info');
  }
}

function goToAccount() {
  window.location.href = location.pathname.endsWith('.html') ? 'dashboard.html' : '/dashboard';
}

async function activateTrialIfPossible(session) {
  const selectedPlanId = signupForm.elements.plan_id?.value || 'trial';

  try {
    const existing = await globalThis.TahderApi.getActiveSubscription(session);
    if (existing) return existing;
  } catch (_) {
    // New accounts may not be allowed to read subscriptions yet.
  }

  try {
    const rows = globalThis.TahderApi.activateSignupSubscription
      ? await globalThis.TahderApi.activateSignupSubscription(selectedPlanId, session)
      : await globalThis.TahderApi.createTrialSubscription(session);
    return Array.isArray(rows) ? rows[0] : rows;
  } catch (_) {
    return null;
  }
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;

  const formData = new FormData(signupForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const phone = String(formData.get('phone') || '').trim();
  const displayName = String(formData.get('display_name') || '').trim();
  const selectedPlanId = String(formData.get('plan_id') || 'trial');

  showMessage(messages.creating, 'info');

  try {
    if (!globalThis.TahderApi?.isConfigured()) {
      if (isLocalHost()) {
        saveSiteSession(email, 'demo');
        showMessage(messages.localCreated, 'success');
        window.setTimeout(goToAccount, 700);
        return;
      }

      throw new Error(messages.notConfigured);
    }

    const result = await globalThis.TahderApi.signUp(email, password, {
      display_name: displayName || email.split('@')[0],
      phone,
      selected_plan: selectedPlanId,
    });

    if (result?.session) {
      await globalThis.TahderApi.updateProfile(result.session, {
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

    const normalized = normalizeSignupError(error);
    showMessage(normalized.message, normalized.tone);
  }
});

document.querySelectorAll('[data-next-step]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    setStep(Math.min(currentStep + 1, steps.length));
  });
});

document.querySelectorAll('[data-prev-step]').forEach((button) => {
  button.addEventListener('click', () => {
    setStep(Math.max(currentStep - 1, 1));
  });
});

signupForm.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLElement) || !field.matches('input, select, textarea')) return;
  const error = document.querySelector(`[data-error-for="${field.name}"]`);
  field.classList.remove('input-error');
  if (error) error.textContent = '';
});

setStep(1);
loadPlans();
