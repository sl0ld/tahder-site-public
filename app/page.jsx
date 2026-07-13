import LegacyScripts from './_components/LegacyScripts';
import { readLegacyPage } from '../lib/legacy-page.mjs';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const page = readLegacyPage('index.html');

  return (
    <>
      <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <LegacyScripts scripts={['/config.js', '/api-client.js', '/site.js?v=pricing-section-1']} />
    </>
  );
}
