'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRightLeft, ExternalLink, Globe, Link2 } from 'lucide-react';

import {
  buildProtocolActionLink,
  buildProtocolSendLink,
  isHttpUrl,
  isSupportedVisionHubChain,
} from '@/lib/visionhub-links';

type RedirectMode = 'send' | 'action';

type RedirectConfig =
  | {
      mode: RedirectMode;
      protocolLink: string;
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
  const type = getSearchParam(searchParams, rawSearch, 'type');
  const chain = getSearchParam(searchParams, rawSearch, 'chain');
  const recipient = getSearchParam(searchParams, rawSearch, 'to');
  const amount = getSearchParam(searchParams, rawSearch, 'amount') || undefined;
  const token = getSearchParam(searchParams, rawSearch, 'token', true) || undefined;
  const memo = getSearchParam(searchParams, rawSearch, 'memo') || undefined;
  const actionUrl = getSearchParam(searchParams, rawSearch, 'action');

  if (type === 'send' && recipient && isSupportedVisionHubChain(chain)) {
    return {
      mode: 'send',
      protocolLink: buildProtocolSendLink({ chain, recipient, amount, token, memo }),
      title: 'Open ZERA Wallet',
      description: `Launching a wallet-neutral ${chain}: send link. The OS may show a wallet chooser.`,
      fallbackHref: '/',
      fallbackLabel: 'Back to ZERA Example',
    };
  }

  if (type === 'action' && actionUrl && isHttpUrl(actionUrl) && isSupportedVisionHubChain(chain)) {
    return {
      mode: 'action',
      protocolLink: buildProtocolActionLink(chain, actionUrl),
      title: 'Open ZERA Action',
      description: `Launching a wallet-neutral ${chain}-action link for a compatible wallet.`,
      fallbackHref: actionUrl,
      fallbackLabel: 'Open action endpoint in browser',
    };
  }

  return null;
}

function ModeIcon({ mode }: { mode: RedirectMode }) {
  return mode === 'send' ? <ArrowRightLeft aria-hidden="true" /> : <Link2 aria-hidden="true" />;
}

function WalletRedirectInner() {
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
    window.location.replace(config.protocolLink);
    const timer = window.setTimeout(() => setShowFallback(true), 1200);
    return () => window.clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!config || lastAutoLaunchedRef.current === config.protocolLink) return undefined;
    lastAutoLaunchedRef.current = config.protocolLink;
    return launch();
  }, [config, launch]);

  if (!config) {
    return (
      <main className="shell">
        <section className="panel redirect-panel">
          <Globe aria-hidden="true" />
          <h1>Unsupported Wallet Launch Link</h1>
          <p>This launcher expects a wallet-neutral send or action payload.</p>
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
        <h1>{showFallback ? 'Wallet did not open automatically' : config.title}</h1>
        <p>{showFallback ? 'Retry the protocol link below, or use the browser fallback.' : config.description}</p>
        {!showFallback ? <p className="eyebrow">Opening wallet protocol</p> : null}
        {showFallback ? (
          <div className="actions">
            <button type="button" className="button primary" onClick={launch}>
              Retry Wallet
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

export default function WalletRedirectPage() {
  return (
    <Suspense fallback={null}>
      <WalletRedirectInner />
    </Suspense>
  );
}
