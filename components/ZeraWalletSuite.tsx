'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Unplug,
  Wallet,
} from 'lucide-react';
import { buildCoinTXN, submitTransaction } from '@zera-os/zera.js';

import { CopyableValue } from '@/components/CopyableValue';
import { DeepLinkLab } from '@/components/DeepLinkLab';
import { ZeraConnectWalletModal, type ZeraConnectOption } from '@/components/ZeraConnectWalletModal';
import { useZeraWallet } from '@/lib/zera-wallet-provider';
import { getGrpcConfig } from '@/lib/network';

type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

const logClass: Record<LogLevel, string> = {
  info: 'log-info',
  warn: 'log-warn',
  error: 'log-error',
  success: 'log-success',
};

function isMobilePlatform() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

export function ZeraWalletSuite() {
  const {
    adapter,
    connected,
    publicKey,
    address,
    connectionMode,
    state,
    connectAdapter,
    connectWalletConnect,
    disconnect,
    signZeraTransaction,
    deepLinkSignedTxn,
    consumeDeepLinkResult,
  } = useZeraWallet();
  const [wcUri, setWcUri] = useState('');
  const [wcPending, setWcPending] = useState(false);
  const [wcError, setWcError] = useState('');
  const [adapterError, setAdapterError] = useState('');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedTxn, setSignedTxn] = useState<unknown>(null);
  const [txHash, setTxHash] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastArmed, setBroadcastArmed] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const log = useCallback((level: LogLevel, message: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs((current) => [...current, { id: logIdRef.current++, time, level, message }].slice(-120));
  }, []);

  useEffect(() => {
    if (!logPanelRef.current) return;
    logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!deepLinkSignedTxn) return;
    setSignedTxn(deepLinkSignedTxn.signed);
    setSigning(false);
    log('success', 'Deep-link signing result restored after wallet redirect.');
    consumeDeepLinkResult();
  }, [consumeDeepLinkResult, deepLinkSignedTxn, log]);

  const handleConnectAdapter = async (
    option: Extract<ZeraConnectOption, 'vision-hub' | 'adapter'> = 'adapter',
  ) => {
    setAdapterError('');
    setWcError('');
    log('info', option === 'vision-hub' ? 'Starting Vision Hub adapter connection.' : 'Starting ZeraWalletAdapter connection.');

    try {
      const key = await connectAdapter();
      setConnectModalOpen(false);
      log('success', `Connected with public key ${key.slice(0, 16)}...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet adapter connection failed.';
      setAdapterError(message);
      log('error', message);
    }
  };

  const handleConnectWalletConnect = async () => {
    setWcPending(true);
    setWcError('');
    setAdapterError('');
    setWcUri('');
    log('info', 'Starting WalletConnect session proposal.');

    try {
      const { uri, approval } = await connectWalletConnect();

      if (isMobilePlatform()) {
        window.location.href = uri;
      } else {
        setWcUri(uri);
      }

      approval()
        .then((session) => {
          setWcPending(false);
          setWcUri('');
          setConnectModalOpen(false);
          log('success', `WalletConnect session approved: ${session.topic.slice(0, 12)}...`);
        })
        .catch((error) => {
          const message = error?.message || 'WalletConnect session rejected.';
          setWcError(message);
          setWcPending(false);
          setWcUri('');
          log('error', message);
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start WalletConnect.';
      setWcError(message);
      setWcPending(false);
      log('error', message);
    }
  };

  const handleSignSelfTransfer = async () => {
    setSigning(true);
    setTxHash('');
    setSignedTxn(null);

    try {
      const currentKey = publicKey || adapter.publicKey;
      const currentAddress = address || adapter.address;

      if (!currentKey) throw new Error('Connect a ZERA wallet before building a transaction.');
      if (!currentAddress) throw new Error('Connected wallet did not expose a ZERA address.');

      log('info', 'Building unsigned 0.01 $ZRA+0000 self-transfer.');
      const unsigned = await buildCoinTXN(
        [{ publicKey: currentKey, amount: '0.01' }],
        [{ to: currentAddress, amount: '0.01' }],
        '$ZRA+0000',
        { grpcConfig: getGrpcConfig() },
      );

      log('success', 'Unsigned transaction built. Asking wallet to sign.');
      const signed = await signZeraTransaction(unsigned, log);
      setSignedTxn(signed);
      log('success', 'Signed transaction is held locally. It has not been broadcast.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign self-transfer.';
      log('error', message);
    } finally {
      setSigning(false);
    }
  };

  const handleBroadcast = async () => {
    if (!signedTxn) return;
    setBroadcasting(true);
    setTxHash('');
    log('warn', 'Broadcasting the signed self-transfer. This is a real network submission.');

    try {
      const hash = await submitTransaction(signedTxn as any, getGrpcConfig());
      setTxHash(hash);
      log('success', `Broadcast complete: ${hash}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Broadcast failed.';
      log('error', message);
    } finally {
      setBroadcasting(false);
    }
  };

  const copyLogs = async () => {
    const serialized = logs.map((entry) => `[${entry.time}] ${entry.level.toUpperCase()}: ${entry.message}`).join('\n');
    await navigator.clipboard.writeText(serialized);
    setCopiedLog(true);
    window.setTimeout(() => setCopiedLog(false), 1500);
  };

  const openConnectModal = () => {
    setConnectModalOpen(true);
  };

  return (
    <section className="stack">
      <div className="panel">
        <div className="panel-title">
          <Wallet aria-hidden="true" />
          <div>
            <h2>Connect ZERA Wallet</h2>
            <p>
              The adapter uses <code>window.zera</code> when this page runs inside Vision Hub, and a generic{' '}
              <code>zera-wallet://</code> deep-link fallback outside the wallet browser.
            </p>
          </div>
        </div>

        <div className="status-grid">
          <div>
            <span>Status</span>
            <strong>{connected ? 'Connected' : state === 'connecting' ? 'Connecting' : 'Disconnected'}</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>{connectionMode || 'None'}</strong>
          </div>
          <div>
            <span>Injected provider</span>
            <strong>{adapter.isEmbedded ? 'Detected' : 'Not detected'}</strong>
          </div>
        </div>

        <CopyableValue label="Public key" value={publicKey || adapter.publicKey || ''} />
        <CopyableValue label="Address" value={address || adapter.address || ''} />

        <div className="actions">
          <button
            type="button"
            className="button primary"
            onClick={openConnectModal}
            disabled={connected || state === 'connecting' || wcPending}
          >
            {state === 'connecting' || wcPending ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <Wallet aria-hidden="true" />
            )}
            {connected ? 'Wallet Connected' : state === 'connecting' || wcPending ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {connected ? (
            <button type="button" className="button danger" onClick={() => void disconnect()}>
              <Unplug aria-hidden="true" />
              Disconnect
            </button>
          ) : null}
        </div>
      </div>

      <ZeraConnectWalletModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        isEmbedded={adapter.isEmbedded}
        connecting={state === 'connecting'}
        walletConnectPending={wcPending}
        walletConnectUri={wcUri}
        adapterError={adapterError}
        walletConnectError={wcError}
        onConnectAdapter={handleConnectAdapter}
        onConnectWalletConnect={handleConnectWalletConnect}
        onClearWalletConnectUri={() => setWcUri('')}
      />

      <div className="panel">
        <div className="panel-title compact">
          <ArrowRightLeft aria-hidden="true" />
          <div>
            <h2>Build and Sign a ZERA Transaction</h2>
            <p>
              This builds a 0.01 <code>$ZRA+0000</code> self-transfer. Signing is safe by itself; broadcasting is a
              separate explicit step because it submits a real transaction.
            </p>
          </div>
        </div>

        <div className="actions">
          <button type="button" className="button primary" onClick={handleSignSelfTransfer} disabled={signing || !connected}>
            {signing ? <Loader2 className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            Build + Sign Only
          </button>
          <label className="check-row">
            <input
              type="checkbox"
              checked={broadcastArmed}
              onChange={(event) => setBroadcastArmed(event.target.checked)}
            />
            I understand broadcast submits a real self-transfer.
          </label>
          <button
            type="button"
            className="button danger"
            onClick={handleBroadcast}
            disabled={!signedTxn || !broadcastArmed || broadcasting}
          >
            {broadcasting ? <Loader2 className="spin" aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
            Broadcast Signed Transaction
          </button>
        </div>

        {signedTxn ? <div className="notice success">Signed transaction is ready locally.</div> : null}
        {txHash ? (
          <a className="inline-link" href={`https://zerascan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            View transaction in explorer
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <div className="panel log-panel">
        <div className="panel-title compact">
          <Copy aria-hidden="true" />
          <div>
            <h2>Flow Log</h2>
            <p>Useful when comparing embedded provider, deep-link, and WalletConnect behavior.</p>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="button secondary" onClick={copyLogs} disabled={!logs.length}>
            <Copy aria-hidden="true" />
            {copiedLog ? 'Copied' : 'Copy Logs'}
          </button>
          <button type="button" className="button secondary" onClick={() => setLogs([])} disabled={!logs.length}>
            Clear
          </button>
        </div>
        <div ref={logPanelRef} className="log-output">
          {logs.length ? (
            logs.map((entry) => (
              <div key={entry.id}>
                <span>{entry.time}</span>
                <code className={logClass[entry.level]}>{entry.message}</code>
              </div>
            ))
          ) : (
            <p>Run a connection or signing flow to capture output here.</p>
          )}
        </div>
      </div>

      <DeepLinkLab
        chain="zera"
        title="ZERA Deep-Link Lab"
        description="Generate wallet-neutral ZERA send/action links next to Vision Hub-specific send, action, and browser links."
        preferredRecipient={address || adapter.address || ''}
        initialToken="$ZRA+0000"
        initialMemo="ZERA wallet adapter example"
        initialBrowseUrl="https://zerascan.io/governance"
        initialActionUrl="/api/actions/zera/self-transfer"
        actionHint="The bundled action endpoint returns a real unsigned self-transfer envelope for Vision Hub preview and signing."
      />
    </section>
  );
}
