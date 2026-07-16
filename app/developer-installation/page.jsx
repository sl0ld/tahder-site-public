import { readLegacyPage } from '../../lib/legacy-page.mjs';

export const metadata = { title: 'Developer Installation | تحضيري' };
export const dynamic = 'force-dynamic';

export default function DeveloperInstallationPage() {
  const page = readLegacyPage('developer-installation.html');

  return <div className={page.className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />;
}
