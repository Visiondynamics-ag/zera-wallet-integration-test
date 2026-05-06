'use client';

import { useState } from 'react';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LinkVariantCardProps {
  title: string;
  description: string;
  href: string;
  tone?: 'neutral' | 'vision' | 'success';
}

export function LinkVariantCard({ title, description, href, tone = 'neutral' }: LinkVariantCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="link-card">
      <div>
        <span className={`pill ${tone}`}>{tone === 'vision' ? 'Vision Hub' : tone === 'success' ? 'Launcher' : 'Neutral'}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <code className="link-value">{href}</code>

      <div className="actions">
        <button type="button" className="button primary" onClick={() => window.location.assign(href)}>
          <ExternalLink aria-hidden="true" />
          Open
        </button>
        <button type="button" className="button secondary" onClick={handleCopy}>
          <Copy aria-hidden="true" />
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="button secondary" onClick={() => setShowQr((value) => !value)}>
          <QrCode aria-hidden="true" />
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {showQr && (
        <div className="qr-wrap">
          <QRCodeSVG value={href} size={176} level="M" bgColor="#ffffff" fgColor="#000000" />
        </div>
      )}
    </article>
  );
}
