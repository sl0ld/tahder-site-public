import fs from 'fs';
import path from 'path';

const siteRoot = process.cwd();

function normalizeLinks(html) {
  return html
    .replace(/\r\n?/g, '\n')
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="index.html#', 'href="/#')
    .replaceAll('href="tools.html"', 'href="/tools"')
    .replaceAll('href="review.html"', 'href="/review"')
    .replaceAll('href="signup.html"', 'href="/signup"')
    .replace(/href="signup\.html\?/g, 'href="/signup?')
    .replaceAll('href="admin.html"', 'href="/admin"')
    .replaceAll('href="dashboard.html"', 'href="/dashboard"')
    .replaceAll('href="developer-installation.html"', 'href="/developer-installation"');
}

export function readLegacyPage(filename) {
  const source = fs.readFileSync(path.join(siteRoot, filename), 'utf8');
  const bodyMatch = source.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const bodyAttrs = bodyMatch?.[1] || '';
  const body = bodyMatch?.[2] || source;
  const className = bodyAttrs.match(/class="([^"]*)"/i)?.[1] || '';
  const htmlWithoutScripts = body.replace(/<script\b[\s\S]*?<\/script>/gi, '');

  return {
    className,
    html: normalizeLinks(htmlWithoutScripts),
  };
}
