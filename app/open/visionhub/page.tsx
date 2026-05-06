'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRightLeft, Compass, ExternalLink, Globe, Link2 } from 'lucide-react';

import {
  buildVisionHubActionLink,
  buildVisionHubBrowseLink,
  buildVisionHubSendLink,
  isHttpUrl,
  isSupportedVisionHubChain,
} from '@/lib/visionhub-links';

type RedirectMode = 'send' | 'action' | 'browse';

type RedirectConfig =
  | {
      mode: RedirectMode;
      deepLink: string;
      title: string;
      description: string;
      fallbackHref: string;
      fallbackLabel: string;
    }
  | null;

function decodeQueryValue(rawValue: string, preservePlus = false): string {
  const prepared = preservePlus ? rawValue : rawValue.replace(/\+/g, '%20');
  try {
    return decodeURIComponent(prepared);
  } catch {
    return preservePlus ? rawValue : rawValue.replace(/\+/g, ' ');
  }
}

function getRawQueryParam(rawSearch: string, key: string, preservePlus = false): string | null {
  const input = rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch;
  if (!input) return null;

  const normalizedKey = key.toLowerCase();
  for (const part of input.split('&')) {
    if (!part) continue;
    const equalsIndex = part.indexOf('=');
    const rawKey = equalsIndex >= 0 ? part.slice(0, equalsIndex) : part;
    const rawValue = equalsIndex >= 0 ? part.slice(equalsIndex + 1) : '';

    if (decodeQueryValue(rawKey).toLowerCase() === normalizedKey) {
      return decodeQueryValue(rawValue, preservePlus);
    }
  }

  return null;
}

function getSearchParam(
  searchParams: ReturnType<typeof useSearchParams>,
  rawSearch: string,
  key: string,
  preservePlus = false,
): string | null {
  return getRawQueryParam(rawSearch, key, preservePlus) ?? searchParams.get(key);
}

function buildRedirectConfig(searchParams: ReturnType<typeof useSearchParams>, rawSearch: string): RedirectConfig {
  const recipient = getSearchParam(searchParams, rawSearch, 'to');
  const chain = getSearchParam(searchParams, rawSearch, 'chain');
  const amount = getSearchParam(searchParams, rawSearch, 'amount') || undefined;
  const token = getSearchParam(searchParams, rawSearch, 'token', true) || undefined;
  const memo = getSearchParam(searchParams, rawSearch, 'memo') || undefined;
  const actionUrl = getSearchParam(searchParams, rawSearch, 'action');
  const url = getSearchParam(searchParams, rawSearch, 'url');

  if (recipient && isSupportedVisionHubChain(chain)) {
    return {
      mode: 'send',
      deepLink: buildVisionHubSendLink({ chain, recipient, amount, token, memo }),
      title: 'Open ZERA Send Flow',
      description: 'Launching Vision Hub with recipient, amount, token, and memo already filled in.',
      fallbackHref: '/',
      fallbackLabel: 'Back to ZERA Example',
    };
  }

  if (actionUrl && isHttpUrl(actionUrl) && isSupportedVisionHubChain(chain)) {
    return {
      mode: 'action',
      deepLink: buildVisionHubActionLink(chain, actionUrl),
      title: 'Open ZERA Action',
      description: 'Launching Vision Hub to fetch the action metadata and show a wallet approval flow.',
      fallbackHref: actionUrl,
      fallbackLabel: 'Open action endpoint in browser',
    };
  }

  if (isHttpUrl(url)) {
    return {
      mode: 'browse',
      deepLink: buildVisionHubBrowseLink(url),
      title: 'Open in Vision Hub Browser',
      description: 'Launching Vision Hub and passing the page into its in-app browser.',
      fallbackHref: url,
      fallbackLabel: 'Open URL in this browser',
    };
  }

  return null;
}

function ModeIcon({ mode }: { mode: RedirectMode }) {
  if (mode === 'send') return <ArrowRightLeft aria-hidden="true" />;
  if (mode === 'action') return <Link2 aria-hidden="true" />;
  return <Compass aria-hidden="true" />;
}

function VisionHubRedirectInner() {
  const searchParams = useSearchParams();
  const [rawSearch, setRawSearch] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const lastAutoLaunchedRef = useRef<string | null>(null);
  const config = useMemo(() => buildRedirectConfig(searchParams, rawSearch), [rawSearch, searchParams]);

  useEffect(() => {
    setRawSearch(window.location.search);
  }, []);

  const launch = useCallback(() => {
    if (!config) return undefined;

    setShowFallback(false);
    window.location.replace(config.deepLink);
    const timer = window.setTimeout(() => setShowFallback(true), 1200);
    return () => window.clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!config || lastAutoLaunchedRef.current === config.deepLink) return undefined;
    lastAutoLaunchedRef.current = config.deepLink;
    return launch();
  }, [config, launch]);

  if (!config) {
    return (
      <main className="shell">
        <section className="panel redirect-panel">
          <Globe aria-hidden="true" />
          <h1>Unsupported Vision Hub Launch Link</h1>
          <p>This launcher expects a send target, an action URL, or an HTTPS browser URL.</p>
          <Link className="button primary" href="/">
            Go to Wallet Example
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel redirect-panel">
        <ModeIcon mode={config.mode} />
        <h1>{showFallback ? 'Vision Hub did not open automatically' : config.title}</h1>
        <p>{showFallback ? 'Retry the deep link below, or use the browser fallback.' : config.description}</p>
        {!showFallback ? <p className="eyebrow">Opening Vision Hub</p> : null}
        {showFallback ? (
          <div className="actions">
            <button type="button" className="button primary" onClick={launch}>
              Retry Vision Hub
            </button>
            <a className="button secondary" href={config.fallbackHref} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              {config.fallbackLabel}
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function VisionHubRedirectPage() {
  return (
    <Suspense fallback={null}>
      <VisionHubRedirectInner />
    </Suspense>
  );
}
