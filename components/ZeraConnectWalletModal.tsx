'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Apple, ChevronDown, Download, Link2, Loader2, Wallet, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export type ZeraConnectOption = 'vision-hub' | 'walletconnect' | 'adapter';

export interface ZeraConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEmbedded?: boolean;
  connecting?: boolean;
  walletConnectPending?: boolean;
  walletConnectUri?: string;
  adapterError?: string;
  walletConnectError?: string;
  callbackUrl?: string;
  onConnectAdapter: (option: Extract<ZeraConnectOption, 'vision-hub' | 'adapter'>) => Promise<void> | void;
  onConnectWalletConnect: () => Promise<void> | void;
  onClearWalletConnectUri: () => void;
}

const VISION_HUB_IOS_URL = 'https://apps.apple.com/app/vision-hub/id6758921523';
const VISION_HUB_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.visiondynamics.visionhub';

function isMobilePlatform() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

function getCurrentCallbackUrl(callbackUrl?: string) {
  if (callbackUrl) return callbackUrl;
  return typeof window !== 'undefined' ? window.location.href : '';
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildConnectUrl(scheme: 'visionhub' | 'zera-wallet', requestId: string, callbackUrl?: string) {
  const callback = getCurrentCallbackUrl(callbackUrl);
  return `${scheme}://connect?callback=${encodeURIComponent(callback)}&requestId=${requestId}`;
}

function buildVisionHubBrowseLink(url: string) {
  return `visionhub://browse?url=${encodeURIComponent(url.trim())}`;
}

/**
 * Copyable ZERA connect modal.
 *
 * This component owns the modal UI state and leaves wallet behavior to the
 * callbacks passed by the app. Copy this file with the "wallet modal styles"
 * block in app/globals.css and public/visionhub-icon.png.
 */
export function ZeraConnectWalletModal({
  open,
  onOpenChange,
  isEmbedded = false,
  connecting = false,
  walletConnectPending = false,
  walletConnectUri = '',
  adapterError = '',
  walletConnectError = '',
  callbackUrl,
  onConnectAdapter,
  onConnectWalletConnect,
  onClearWalletConnectUri,
}: ZeraConnectWalletModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [activeConnectOption, setActiveConnectOption] = useState<ZeraConnectOption>('vision-hub');
  const [visionHubHelpOpen, setVisionHubHelpOpen] = useState(false);
  const [visionHubQrOpen, setVisionHubQrOpen] = useState(false);
  const [adapterQrOpen, setAdapterQrOpen] = useState(false);
  const [connectRequestId] = useState(createRequestId);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setRendered(true);
    setClosing(false);
    setVisionHubHelpOpen(false);
    setVisionHubQrOpen(false);
    setAdapterQrOpen(false);
    setActiveConnectOption('vision-hub');
  }, [open]);

  useEffect(() => {
    if (open || !rendered) return;

    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setRendered(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 180);
  }, [open, rendered]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!rendered) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !walletConnectPending) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange, rendered, walletConnectPending]);

  if (!rendered) return null;

  const requestClose = () => {
    if (walletConnectPending) return;
    onOpenChange(false);
  };

  const handleVisionHubConnect = () => {
    setActiveConnectOption('vision-hub');

    if (isEmbedded) {
      void onConnectAdapter('vision-hub');
      return;
    }

    if (isMobilePlatform()) {
      window.location.href = buildConnectUrl('visionhub', connectRequestId, callbackUrl);
      return;
    }

    setVisionHubQrOpen((current) => !current);
  };

  const handleWalletConnect = () => {
    setActiveConnectOption('walletconnect');

    if (walletConnectUri) {
      onClearWalletConnectUri();
      return;
    }

    void onConnectWalletConnect();
  };

  const handleOtherZeraConnect = () => {
    setActiveConnectOption('adapter');

    if (isMobilePlatform()) {
      window.location.href = buildConnectUrl('zera-wallet', connectRequestId, callbackUrl);
      return;
    }

    setAdapterQrOpen((current) => !current);
  };

  const openInVisionHub = () => {
    onOpenChange(false);
    window.location.assign(buildVisionHubBrowseLink(getCurrentCallbackUrl(callbackUrl)));
  };

  return (
    <div
      className="modal-backdrop"
      data-state={closing ? 'closed' : 'open'}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        className="wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-state={closing ? 'closed' : 'open'}
      >
        <div className="wallet-modal-head">
          <div className="wallet-modal-title">
            <Wallet aria-hidden="true" />
            <h2 id={titleId}>Connect Wallet</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close" disabled={walletConnectPending} onClick={requestClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <p id={descriptionId} className="wallet-modal-copy">
          Choose a wallet provider to connect.
        </p>

        <div className="wallet-option-list">
          <div className="wallet-option-group">
            <div className="animated-border wallet-option-animated">
              <span className="recommended-badge">Recommended</span>
              <button
                type="button"
                className="wallet-option"
                onClick={handleVisionHubConnect}
                disabled={connecting || walletConnectPending}
              >
                <span className="wallet-option-icon vision">
                  <Image src="/visionhub-icon.png" width={40} height={40} alt="Vision Hub" priority />
                </span>
                <span className="wallet-option-copy">
                  <strong>Vision Hub</strong>
                  <small>The leading ZERA Network wallet</small>
                </span>
                {connecting && activeConnectOption === 'vision-hub' ? (
                  <Loader2 className="spin wallet-option-chevron" aria-hidden="true" />
                ) : (
                  <ChevronDown
                    className={`wallet-option-chevron ${visionHubQrOpen && !isEmbedded ? 'open' : 'closed'}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            {!isEmbedded ? (
              <div className={`smooth-expand ${visionHubQrOpen ? 'expanded' : ''}`}>
                <div>
                  <div className="wallet-qr-card">
                    <div className="qr-wrap">
                      <QRCodeSVG
                        value={buildConnectUrl('visionhub', connectRequestId, callbackUrl)}
                        size={160}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <p>Open Vision Hub on your phone, scan this QR code, then approve to connect.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="wallet-help-toggle"
            aria-expanded={visionHubHelpOpen}
            onClick={() => setVisionHubHelpOpen((current) => !current)}
          >
            <Download aria-hidden="true" />
            <span>Don&apos;t have Vision Hub?</span>
            <ChevronDown className={visionHubHelpOpen ? 'open' : ''} aria-hidden="true" />
          </button>

          {visionHubHelpOpen ? (
            <div className="wallet-downloads animate-slide-down">
              <p>Download Vision Hub</p>
              <div>
                <a href={VISION_HUB_IOS_URL} target="_blank" rel="noreferrer">
                  <Apple aria-hidden="true" />
                  App Store
                </a>
                <a href={VISION_HUB_ANDROID_URL} target="_blank" rel="noreferrer">
                  <Download aria-hidden="true" />
                  Google Play
                </a>
                <button type="button" onClick={openInVisionHub}>
                  Open in Vision Hub
                </button>
              </div>
            </div>
          ) : null}

          <div className="wallet-option-group inset">
            <div className="wallet-option-shell">
              <button
                type="button"
                className="wallet-option"
                onClick={handleWalletConnect}
                disabled={walletConnectPending && !walletConnectUri}
              >
                <span className="wallet-option-icon walletconnect">
                  <Link2 aria-hidden="true" />
                </span>
                <span className="wallet-option-copy">
                  <span>
                    <strong>WalletConnect</strong>
                    <em>Cross-device</em>
                  </span>
                  <small>Scan QR code from your phone wallet</small>
                </span>
                {walletConnectPending && activeConnectOption === 'walletconnect' ? (
                  <Loader2 className="spin wallet-option-chevron" aria-hidden="true" />
                ) : (
                  <ChevronDown className={`wallet-option-chevron ${walletConnectUri ? 'open' : 'closed'}`} aria-hidden="true" />
                )}
              </button>
            </div>

            {walletConnectUri ? (
              <div className="smooth-expand expanded">
                <div>
                  <div className="wallet-qr-card">
                    <div className="qr-wrap">
                      <QRCodeSVG value={walletConnectUri} size={180} level="M" bgColor="#ffffff" fgColor="#000000" />
                    </div>
                    <p>Open Vision Hub on your phone, go to WalletConnect, then scan this QR code.</p>
                    {walletConnectPending ? <p className="wallet-pending">Waiting for wallet approval...</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="wallet-option-group inset">
            <div className="wallet-option-shell">
              <button type="button" className="wallet-option" onClick={handleOtherZeraConnect}>
                <span className="wallet-option-icon adapter">
                  <Wallet aria-hidden="true" />
                </span>
                <span className="wallet-option-copy">
                  <span>
                    <strong>Other ZERA-Wallet Connect</strong>
                  </span>
                  <small>Connect any ZERA-compatible wallet via ZERA Wallet Adapter</small>
                </span>
                <ChevronDown className={`wallet-option-chevron ${adapterQrOpen ? 'open' : 'closed'}`} aria-hidden="true" />
              </button>
            </div>

            <div className={`smooth-expand ${adapterQrOpen ? 'expanded' : ''}`}>
              <div>
                <div className="wallet-qr-card">
                  <div className="qr-wrap">
                    <QRCodeSVG
                      value={buildConnectUrl('zera-wallet', connectRequestId, callbackUrl)}
                      size={160}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <p>Open your ZERA-compatible wallet, scan this QR code, then approve to connect.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {adapterError ? <div className="notice danger modal-notice">{adapterError}</div> : null}
        {walletConnectError ? <div className="notice danger modal-notice">{walletConnectError}</div> : null}
      </div>
    </div>
  );
}
