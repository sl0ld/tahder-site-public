import LegacyScripts from '../_components/LegacyScripts';
import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'لوحة الأدمن | تحضيري' };
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const page = readLegacyPage('admin.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/config.js', '/api-client.js', '/admin.js?v=admin-reference-redesign-1']} />
    </>
  );
}
