'use client';

import { useEffect } from 'react';

const loadedScripts = new Set();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${CSS.escape(src)}"]`);
    if (existing || loadedScripts.has(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.legacySrc = src;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function LegacyScripts({ scripts = [] }) {
  useEffect(() => {
    let cancelled = false;

    scripts.reduce(
      (chain, src) => chain.then(() => (cancelled ? undefined : loadScript(src))),
      Promise.resolve(),
    ).catch((error) => {
      console.error('[Tahder] Legacy script loading failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [scripts]);

  return null;
}
