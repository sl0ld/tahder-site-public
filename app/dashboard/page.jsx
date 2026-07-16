import LegacyScripts from '../_components/LegacyScripts';
import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'لوحة المعلم | تحضيري' };
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const page = readLegacyPage('dashboard.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/config.js', '/api-client.js?v=mysql-api-1', '/dashboard.js?v=dashboard-saas-1']} />
    </>
  );
}
