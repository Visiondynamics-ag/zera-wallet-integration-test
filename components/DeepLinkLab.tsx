'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe, Link2, Wallet } from 'lucide-react';

import { LinkVariantCard } from '@/components/LinkVariantCard';
import {
  buildProtocolActionLink,
  buildProtocolLauncherPath,
  buildProtocolSendLink,
  buildVisionHubActionLink,
  buildVisionHubBrowseLink,
  buildVisionHubLauncherPath,
  buildVisionHubSendLink,
  isHttpUrl,
  type VisionHubChain,
} from '@/lib/visionhub-links';

interface DeepLinkLabProps {
  chain: VisionHubChain;
  title: string;
  description: string;
  preferredRecipient?: string;
  initialAmount?: string;
  initialToken?: string;
  initialMemo?: string;
  initialBrowseUrl?: string;
  initialActionUrl?: string;
  actionHint?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function DeepLinkLab({
  chain,
  title,
  description,
  preferredRecipient,
  initialAmount = '0.01',
  initialToken = '$ZRA+0000',
  initialMemo = 'Vision Hub ZERA test send',
  initialBrowseUrl = 'https://zerascan.io',
  initialActionUrl = '',
  actionHint,
}: DeepLinkLabProps) {
  const [recipient, setRecipient] = useState(preferredRecipient || '');
  const [amount, setAmount] = useState(initialAmount);
  const [token, setToken] = useState(initialToken);
  const [memo, setMemo] = useState(initialMemo);
  const [browseUrl, setBrowseUrl] = useState(initialBrowseUrl);
  const [actionUrl, setActionUrl] = useState(initialActionUrl);
  const [clientOrigin, setClientOrigin] = useState('');

  useEffect(() => {
    if (!recipient && preferredRecipient) {
      setRecipient(preferredRecipient);
    }
  }, [preferredRecipient, recipient]);

  useEffect(() => {
    setClientOrigin(window.location.origin);
  }, []);

  const trimmedRecipient = recipient.trim();
  const trimmedToken = token.trim();
  const trimmedBrowseUrl = browseUrl.trim();
  const trimmedActionUrl = actionUrl.trim();
  const chainLabel = 'ZERA';
  const tokenLabel = 'Token / contract ID';
  const resolvedActionUrl = useMemo(() => {
    if (/^https?:\/\//i.test(trimmedActionUrl)) return trimmedActionUrl;
    if (trimmedActionUrl.startsWith('/') && clientOrigin) return `${clientOrigin}${trimmedActionUrl}`;
    return '';
  }, [clientOrigin, trimmedActionUrl]);

  const withOrigin = (path: string) => (path && clientOrigin ? `${clientOrigin}${path}` : path);

  const standardSendLink = trimmedRecipient
    ? buildProtocolSendLink({
        chain,
        recipient: trimmedRecipient,
        amount,
        token: trimmedToken || undefined,
        memo,
      })
    : '';

  const rawTokenSendLink =
    trimmedRecipient && trimmedToken
      ? buildProtocolSendLink({
          chain,
          recipient: trimmedRecipient,
          amount,
          token: trimmedToken,
          memo,
          tokenEncoding: 'raw',
        })
      : '';

  const neutralSendLauncherLink = trimmedRecipient
    ? withOrigin(
        buildProtocolLauncherPath({
          type: 'send',
          chain,
          recipient: trimmedRecipient,
          amount,
          token: trimmedToken || undefined,
          memo,
        }),
      )
    : '';

  const visionHubSendLink = trimmedRecipient
    ? buildVisionHubSendLink({
        chain,
        recipient: trimmedRecipient,
        amount,
        token: trimmedToken || undefined,
        memo,
      })
    : '';

  const visionHubSendLauncherLink = trimmedRecipient
    ? withOrigin(
        buildVisionHubLauncherPath({
          type: 'send',
          chain,
          recipient: trimmedRecipient,
          amount,
          token: trimmedToken || undefined,
          memo,
        }),
      )
    : '';

  const standardActionLink = resolvedActionUrl ? buildProtocolActionLink(chain, resolvedActionUrl) : '';
  const neutralActionLauncherLink = resolvedActionUrl
    ? withOrigin(buildProtocolLauncherPath({ type: 'action', chain, actionUrl: resolvedActionUrl }))
    : '';
  const visionHubActionLink = resolvedActionUrl ? buildVisionHubActionLink(chain, resolvedActionUrl) : '';
  const visionHubActionLauncherLink = resolvedActionUrl
    ? withOrigin(buildVisionHubLauncherPath({ type: 'action', chain, actionUrl: resolvedActionUrl }))
    : '';
  const visionHubBrowseLink = isHttpUrl(trimmedBrowseUrl) ? buildVisionHubBrowseLink(trimmedBrowseUrl) : '';
  const visionHubBrowseLauncherLink = isHttpUrl(trimmedBrowseUrl)
    ? withOrigin(buildVisionHubLauncherPath({ type: 'browse', url: trimmedBrowseUrl }))
    : '';

  return (
    <section className="stack">
      <div className="panel">
        <div className="panel-title">
          <Link2 aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="notice">
          <strong>Pattern:</strong> neutral links use <code>{chain}:</code> or <code>{chain}-action:</code>. Vision Hub
          specific links use <code>visionhub://</code> or the HTTPS launcher pages in this repo.
        </div>
      </div>

      <div className="panel">
        <div className="panel-title compact">
          <Wallet aria-hidden="true" />
          <div>
            <h2>Send Links</h2>
            <p>Recipient, amount, token, and memo are only used by the send builders.</p>
          </div>
        </div>

        <div className="summary-grid">
          <div>
            <span>Recipient</span>
            <code>{trimmedRecipient || 'Connect first or paste one below'}</code>
          </div>
          <div>
            <span>Amount</span>
            <code>{amount || '0.01'}</code>
          </div>
          <div>
            <span>{tokenLabel}</span>
            <code>{trimmedToken || 'None'}</code>
          </div>
          <div>
            <span>Memo</span>
            <code>{memo || 'None'}</code>
          </div>
        </div>

        <details className="details-box">
          <summary>Customize send fields</summary>
          <div className="form-grid">
            <Field
              id={`${chain}-recipient`}
              label="Recipient"
              value={recipient}
              onChange={setRecipient}
              placeholder="ZERA address"
            />
            <Field id={`${chain}-amount`} label="Amount" value={amount} onChange={setAmount} placeholder="0.01" />
            <Field id={`${chain}-token`} label={tokenLabel} value={token} onChange={setToken} />
            <Field id={`${chain}-memo`} label="Memo" value={memo} onChange={setMemo} />
          </div>
        </details>

        {standardSendLink ? (
          <div className="card-grid three">
            <LinkVariantCard
              title={`Standard ${chain}: send`}
              description={`Wallet-neutral ${chainLabel} send link. The OS may show a wallet chooser.`}
              href={standardSendLink}
            />
            {rawTokenSendLink && (
              <LinkVariantCard
                title={`Raw-token ${chain}: send`}
                description="Legacy normalization check for unencoded token values such as $ZRA+0000."
                href={rawTokenSendLink}
              />
            )}
            <LinkVariantCard
              title="Neutral HTTPS launcher"
              description="A browser-safe wrapper that still opens the neutral protocol link."
              href={neutralSendLauncherLink}
              tone="success"
            />
            <LinkVariantCard
              title="Vision Hub direct send"
              description="Targets Vision Hub directly instead of leaving wallet selection to the OS."
              href={visionHubSendLink}
              tone="vision"
            />
            <LinkVariantCard
              title="Vision Hub HTTPS launcher"
              description="Browser-safe wrapper that opens Vision Hub and keeps a fallback page."
              href={visionHubSendLauncherLink}
              tone="success"
            />
          </div>
        ) : (
          <div className="empty-state">Connect a wallet or paste a recipient to generate send links.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title compact">
          <Link2 aria-hidden="true" />
          <div>
            <h2>Action Links</h2>
            <p>Action links use only an HTTPS action endpoint. They do not read the send fields above.</p>
          </div>
        </div>

        {actionHint && <div className="notice">{actionHint}</div>}

        <details className="details-box" open={!resolvedActionUrl}>
          <summary>Customize action URL</summary>
          <div className="form-grid one">
            <Field
              id={`${chain}-action-url`}
              label="Action URL"
              value={actionUrl}
              onChange={setActionUrl}
              placeholder="https://action.example.com"
            />
          </div>
        </details>

        {resolvedActionUrl ? (
          <div className="card-grid two">
            <LinkVariantCard
              title={`Standard ${chain}-action`}
              description="Wallet-neutral action link. Compatible clients fetch metadata from the HTTPS endpoint."
              href={standardActionLink}
            />
            <LinkVariantCard
              title="Neutral action launcher"
              description="Browser-safe wrapper that opens the neutral action protocol."
              href={neutralActionLauncherLink}
              tone="success"
            />
            <LinkVariantCard
              title="Vision Hub direct action"
              description="Targets Vision Hub action preview and signing directly."
              href={visionHubActionLink}
              tone="vision"
            />
            <LinkVariantCard
              title="Vision Hub action launcher"
              description="HTTPS wrapper that opens Vision Hub for the action flow."
              href={visionHubActionLauncherLink}
              tone="success"
            />
          </div>
        ) : (
          <div className="empty-state">Paste an HTTPS action URL to generate action links.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title compact">
          <Globe aria-hidden="true" />
          <div>
            <h2>Vision Hub Browser Links</h2>
            <p>Browser handoff is app-specific, so there is no wallet-neutral browser variant.</p>
          </div>
        </div>

        <details className="details-box">
          <summary>Customize browser URL</summary>
          <div className="form-grid one">
            <Field
              id={`${chain}-browse-url`}
              label="Page URL"
              value={browseUrl}
              onChange={setBrowseUrl}
              placeholder="https://example.com"
            />
          </div>
        </details>

        {visionHubBrowseLink ? (
          <div className="card-grid two">
            <LinkVariantCard
              title="Vision Hub direct browse"
              description="Opens the URL inside Vision Hub's in-app browser."
              href={visionHubBrowseLink}
              tone="vision"
            />
            <LinkVariantCard
              title="Vision Hub browse launcher"
              description="HTTPS wrapper that opens Vision Hub and keeps a browser fallback."
              href={visionHubBrowseLauncherLink}
              tone="success"
            />
          </div>
        ) : (
          <div className="empty-state">Paste an HTTP or HTTPS page URL to generate Vision Hub browser links.</div>
        )}
      </div>
    </section>
  );
}
