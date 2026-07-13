import LegacyScripts from '../_components/LegacyScripts';
import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'المراجعة والتقارير | تحضيري' };
export const dynamic = 'force-dynamic';

export default function ReviewPage() {
  const page = readLegacyPage('review.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/config.js', '/api-client.js', '/review.js?v=next-server-1']} />
    </>
  );
}
