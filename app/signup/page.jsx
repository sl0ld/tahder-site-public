import LegacyScripts from '../_components/LegacyScripts';
import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'إنشاء حساب | تحضيري' };
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const page = readLegacyPage('signup.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/config.js', '/api-client.js', '/signup.js?v=signup-steps-1']} />
    </>
  );
}
