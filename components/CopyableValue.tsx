'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';

interface CopyableValueProps {
  value: string;
  label?: string;
  emptyLabel?: string;
}

export function CopyableValue({ value, label, emptyLabel = 'Not set' }: CopyableValueProps) {
  const [copied, setCopied] = useState(false);
  const displayValue = value || emptyLabel;

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="copyable">
      {label && <span className="copyable-label">{label}</span>}
      <code>{displayValue}</code>
      <button type="button" onClick={handleCopy} disabled={!value} aria-label={`Copy ${label || 'value'}`}>
        <Copy aria-hidden="true" />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
