import LegacyScripts from '../_components/LegacyScripts';
import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'الأدوات | تحضيري' };
export const dynamic = 'force-dynamic';

export default function ToolsPage() {
  const page = readLegacyPage('tools.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/tools.js?v=next-server-1']} />
    </>
  );
}
