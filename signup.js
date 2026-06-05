const signupForm = document.getElementById('signup-form');
const signupMessage = document.getElementById('signup-message');

function showMessage(message, tone = 'info') {
  signupMessage.textContent = message;
  signupMessage.dataset.tone = tone;
  signupMessage.hidden = false;
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const phone = String(formData.get('phone') || '').trim();
  const displayName = String(formData.get('display_name') || '').trim();

  showMessage('جاري إنشاء الحساب...', 'info');

  try {
    if (!globalThis.TahderSupabase?.isConfigured()) {
      throw new Error('لم يتم ربط الموقع بقاعدة البيانات بعد.');
    }

    const result = await globalThis.TahderSupabase.signUp(email, password, {
      display_name: displayName,
      phone,
    });

    if (result?.session) {
      await globalThis.TahderSupabase.updateProfile(result.session, {
        phone,
        display_name: displayName || email.split('@')[0],
      });
      showMessage('تم إنشاء الحساب وتسجيل الدخول. الخطوة التالية تفعيل الاشتراك التجريبي من لوحة الإدارة.', 'success');
    } else {
      showMessage('تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً، راجع بريدك لتأكيد الحساب ثم سجل الدخول.', 'success');
    }

    signupForm.reset();
  } catch (error) {
    showMessage(error.message || 'تعذر إنشاء الحساب. حاول مرة أخرى.', 'error');
  }
});
