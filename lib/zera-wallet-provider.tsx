'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  deserializeTransaction,
  serializeTransaction,
  signAndFinalize,
  signCoinTXN,
  WalletConnectSigner,
  WalletSigner,
  ZeraWalletAdapter,
  type WalletAdapterState,
  type WalletConnectionMode,
} from '@zera-os/zera.js';
import type { SessionTypes } from '@walletconnect/types';

import { getWalletConnectClient, type WCConnectResult } from '@/lib/walletconnect';

type LogLevel = 'info' | 'warn' | 'error' | 'success';
type FlowLogger = (level: LogLevel, message: string) => void;

interface SerializedTransactionEnvelope {
  type: string;
  data: string;
  version: 1;
}

interface ZeraWalletContextValue {
  adapter: ZeraWalletAdapter;
  connected: boolean;
  publicKey: string | null;
  address: string | null;
  state: WalletAdapterState;
  connectionMode: WalletConnectionMode | 'walletconnect' | null;
  isEmbedded: boolean;
  walletConnectReady: boolean;
  walletConnectProjectId: string;
  wcSession: SessionTypes.Struct | null;
  connectAdapter: () => Promise<string>;
  connectWalletConnect: () => Promise<WCConnectResult>;
  disconnect: () => Promise<void>;
  signZeraTransaction: (unsignedTxn: unknown, logger?: FlowLogger) => Promise<unknown>;
  deepLinkSignedTxn: { signed: unknown; isCoinTXN: boolean } | null;
  consumeDeepLinkResult: () => void;
}

const ZeraWalletContext = createContext<ZeraWalletContextValue | null>(null);
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';
const DEEP_LINK_URL = process.env.NEXT_PUBLIC_ZERA_DEEPLINK_URL || 'zera-wallet://';

function isSerializedTransactionEnvelope(value: unknown): value is SerializedTransactionEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as SerializedTransactionEnvelope).type === 'string' &&
    typeof (value as SerializedTransactionEnvelope).data === 'string' &&
    (value as SerializedTransactionEnvelope).version === 1
  );
}

function normalizeZeraPublicKey(value: string | null): string | null {
  if (!value) return null;
  return value.includes('_') ? value : `A_${value}`;
}

function isCoinTransaction(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'auth' in value && 'inputTransfers' in value;
}

export function useZeraWallet() {
  const context = useContext(ZeraWalletContext);
  if (!context) {
    throw new Error('useZeraWallet must be used within <ZeraWalletProvider>.');
  }
  return context;
}

export function ZeraWalletProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<ZeraWalletAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new ZeraWalletAdapter({
      autoConnect: false,
      deepLinkUrl: DEEP_LINK_URL,
    });
  }

  const adapter = adapterRef.current;
  const [connected, setConnected] = useState(adapter.connected);
  const [publicKey, setPublicKey] = useState<string | null>(normalizeZeraPublicKey(adapter.publicKey));
  const [address, setAddress] = useState<string | null>(adapter.address);
  const [state, setState] = useState<WalletAdapterState>(adapter.state);
  const [connectionMode, setConnectionMode] = useState<WalletConnectionMode | 'walletconnect' | null>(
    adapter.connectionMode,
  );
  const [isEmbedded, setIsEmbedded] = useState(adapter.isEmbedded);
  const [walletConnectReady, setWalletConnectReady] = useState(false);
  const [wcSession, setWcSession] = useState<SessionTypes.Struct | null>(null);
  const [deepLinkSignedTxn, setDeepLinkSignedTxn] = useState<{ signed: unknown; isCoinTXN: boolean } | null>(
    null,
  );
  const wcSessionRef = useRef<SessionTypes.Struct | null>(null);
  const publicKeyRef = useRef<string | null>(publicKey);
  const connectedRef = useRef(connected);
  const deepLinkHandledRef = useRef(false);
  const injectedProviderBoundRef = useRef(false);

  useEffect(() => {
    wcSessionRef.current = wcSession;
  }, [wcSession]);

  useEffect(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (!WC_PROJECT_ID) return;

    let active = true;
    const client = getWalletConnectClient();
    let unsubscribe = () => {};

    client
      .init(WC_PROJECT_ID)
      .then(() => {
        if (!active) return;
        setWalletConnectReady(true);
        const existing = client.getActiveSession();
        if (!existing || connectedRef.current) return;

        const zeraAddress = client.getZeraAddress(existing);
        if (!zeraAddress) {
          setWcSession(existing);
          return;
        }

        const formattedPublicKey = normalizeZeraPublicKey(zeraAddress);
        setWcSession(existing);
        setConnected(true);
        setPublicKey(formattedPublicKey);
        setAddress(zeraAddress);
        setState('connected');
        setConnectionMode('walletconnect');
      })
      .catch((error) => {
        console.error('[WalletConnect] init failed:', error);
      });

    unsubscribe = client.onEvent((event) => {
      if (event.type !== 'session_delete') return;
      if (wcSessionRef.current?.topic !== event.topic) return;

      setWcSession(null);
      setConnected(false);
      setPublicKey(null);
      setAddress(null);
      setState('disconnected');
      setConnectionMode(null);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onConnect = (data: unknown) => {
      const event = data as { publicKey?: string; address?: string | null; mode?: WalletConnectionMode };
      const nextPublicKey = normalizeZeraPublicKey(event.publicKey || adapter.publicKey);
      const provider = typeof window !== 'undefined' ? (window as any).zera : undefined;
      const nextAddress = event.address || adapter.address || provider?.address || null;

      setConnected(true);
      setPublicKey(nextPublicKey);
      setAddress(nextAddress);
      setState('connected');
      setConnectionMode(event.mode || adapter.connectionMode);
      setIsEmbedded(adapter.isEmbedded);
      setWcSession(null);
    };

    const onDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
      setAddress(null);
      setState('disconnected');
      setConnectionMode(null);
      setIsEmbedded(false);
    };

    const onError = (error: unknown) => {
      console.error('[ZeraWalletAdapter]', error);
      setState('disconnected');
    };

    adapter.on('connect', onConnect);
    adapter.on('disconnect', onDisconnect);
    adapter.on('error', onError);

    const bindInjectedProvider = () => {
      if (typeof window === 'undefined') return;
      const provider = (window as any).zera;
      if (!provider || typeof provider.on !== 'function') return;
      if (injectedProviderBoundRef.current) return;

      injectedProviderBoundRef.current = true;

      provider.on('connect', (info: { publicKey?: string; address?: string | null }) => {
        if (info?.publicKey) {
          onConnect({ publicKey: info.publicKey, address: info.address || provider.address, mode: 'embedded' });
        }
      });
      provider.on('disconnect', onDisconnect);
    };

    bindInjectedProvider();
    const interval = window.setInterval(bindInjectedProvider, 500);
    window.setTimeout(() => window.clearInterval(interval), 3000);

    if (adapter.connected) {
      onConnect({ publicKey: adapter.publicKey, address: adapter.address, mode: adapter.connectionMode || undefined });
    }

    return () => {
      window.clearInterval(interval);
      adapter.off('connect', onConnect);
      adapter.off('disconnect', onDisconnect);
      adapter.off('error', onError);
    };
  }, [adapter]);

  useEffect(() => {
    const handleDeepLinkResume = async (...args: unknown[]) => {
      if (deepLinkHandledRef.current) return;
      deepLinkHandledRef.current = true;

      const pendingRaw =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('zera-example-pending-sign-context') : null;
      if (!pendingRaw) return;

      try {
        const result = args[0] as { signature: Uint8Array; requestId: string };
        const pending = JSON.parse(pendingRaw) as {
          envelope: SerializedTransactionEnvelope;
          isCoinTXN: boolean;
          publicKey: string;
        };

        sessionStorage.removeItem('zera-example-pending-sign-context');
        const unsigned = deserializeTransaction(pending.envelope) as unknown;
        const preSignedSigner = {
          publicKey: pending.publicKey,
          sign: async () => result.signature,
        };

        const signed = pending.isCoinTXN
          ? await signCoinTXN(unsigned as any, [preSignedSigner])
          : await signAndFinalize(unsigned as any, preSignedSigner);

        setDeepLinkSignedTxn({ signed, isCoinTXN: pending.isCoinTXN });
      } catch (error) {
        console.error('[ZeraWalletProvider] Deep-link signing resume failed:', error);
      }
    };

    adapter.on('signResult', handleDeepLinkResume);
    const buffered = adapter.consumePendingSignResult?.();
    if (buffered) {
      void handleDeepLinkResume(buffered);
    }

    return () => {
      adapter.off('signResult', handleDeepLinkResume);
    };
  }, [adapter]);

  const connectAdapter = useCallback(async () => {
    setState('connecting');
    const key = await adapter.connect();
    return normalizeZeraPublicKey(key) || key;
  }, [adapter]);

  const connectWalletConnect = useCallback(
    async (): Promise<WCConnectResult> => {
      if (!WC_PROJECT_ID) {
        throw new Error('Set NEXT_PUBLIC_WC_PROJECT_ID in .env.local before using WalletConnect.');
      }

      const client = getWalletConnectClient();
      if (!client.initialized) {
        await client.init(WC_PROJECT_ID);
        setWalletConnectReady(true);
      }

      setState('connecting');
      const result = await client.connect();
      const originalApproval = result.approval;

      return {
        uri: result.uri,
        approval: async () => {
          const session = await originalApproval();
          setWcSession(session);

          const zeraAddress = client.getZeraAddress(session);
          if (zeraAddress) {
            const formattedPublicKey = normalizeZeraPublicKey(zeraAddress);
            setConnected(true);
            setPublicKey(formattedPublicKey);
            setAddress(zeraAddress);
            setState('connected');
            setConnectionMode('walletconnect');
          }

          return session;
        },
      };
    },
    [],
  );

  const disconnect = useCallback(async () => {
    const session = wcSessionRef.current;
    if (session && getWalletConnectClient().initialized) {
      try {
        await getWalletConnectClient().disconnect(session);
      } catch (error) {
        console.warn('[WalletConnect] disconnect failed:', error);
      }
    }

    setWcSession(null);
    adapter.disconnect();
    setConnected(false);
    setPublicKey(null);
    setAddress(null);
    setState('disconnected');
    setConnectionMode(null);
  }, [adapter]);

  const signZeraTransaction = useCallback(
    async (unsignedTxn: unknown, logger?: FlowLogger): Promise<unknown> => {
      const log = logger || (() => undefined);
      const txnToSign = isSerializedTransactionEnvelope(unsignedTxn)
        ? deserializeTransaction(unsignedTxn)
        : unsignedTxn;

      if (!connectedRef.current && !adapter.connected) {
        log('info', 'No ZERA wallet connected. Starting adapter connection.');
        await connectAdapter();
      }

      const activePublicKey = publicKeyRef.current || normalizeZeraPublicKey(adapter.publicKey);
      const mode = connectionMode || adapter.connectionMode;
      let signer: unknown = null;

      if (mode === 'walletconnect') {
        const session = wcSessionRef.current;
        if (!session || !activePublicKey) {
          throw new Error('WalletConnect session is missing. Reconnect and try again.');
        }

        signer = new WalletConnectSigner(getWalletConnectClient().getClient(), session, activePublicKey, 'zera:mainnet');
        log('info', 'Signing through WalletConnect.');
      } else if (adapter.signer) {
        signer = adapter.signer;
        log('info', `Signing through ZeraWalletAdapter (${adapter.connectionMode || 'provider'}).`);
      } else {
        const provider = typeof window !== 'undefined' ? (window as any).zera : undefined;
        if (provider?.isZeraWallet && activePublicKey) {
          signer = new WalletSigner(activePublicKey, provider);
          log('info', 'Hydrated signer from the injected Vision Hub provider.');
        }
      }

      if (!signer) {
        throw new Error('No signing route is available. Reconnect inside Vision Hub or with WalletConnect.');
      }

      const coinTxn = isCoinTransaction(txnToSign);
      if (adapter.connectionMode === 'deeplink') {
        const envelope = isSerializedTransactionEnvelope(unsignedTxn)
          ? unsignedTxn
          : serializeTransaction(txnToSign as any);
        try {
          sessionStorage.setItem(
            'zera-example-pending-sign-context',
            JSON.stringify({
              envelope,
              isCoinTXN: coinTxn,
              publicKey: activePublicKey || '',
            }),
          );
        } catch {
          log('warn', 'Could not persist the deep-link signing context in sessionStorage.');
        }
      }

      const signed = coinTxn
        ? await signCoinTXN(txnToSign as any, [signer as any])
        : await signAndFinalize(txnToSign as any, signer as any);

      try {
        sessionStorage.removeItem('zera-example-pending-sign-context');
      } catch {
        // sessionStorage may be unavailable inside some WebViews.
      }

      log('success', 'Transaction signed.');
      return signed;
    },
    [adapter, connectAdapter, connectionMode],
  );

  const consumeDeepLinkResult = useCallback(() => setDeepLinkSignedTxn(null), []);

  const value = useMemo<ZeraWalletContextValue>(
    () => ({
      adapter,
      connected,
      publicKey,
      address,
      state,
      connectionMode,
      isEmbedded,
      walletConnectReady,
      walletConnectProjectId: WC_PROJECT_ID,
      wcSession,
      connectAdapter,
      connectWalletConnect,
      disconnect,
      signZeraTransaction,
      deepLinkSignedTxn,
      consumeDeepLinkResult,
    }),
    [
      adapter,
      connected,
      publicKey,
      address,
      state,
      connectionMode,
      isEmbedded,
      walletConnectReady,
      wcSession,
      connectAdapter,
      connectWalletConnect,
      disconnect,
      signZeraTransaction,
      deepLinkSignedTxn,
      consumeDeepLinkResult,
    ],
  );

  return <ZeraWalletContext.Provider value={value}>{children}</ZeraWalletContext.Provider>;
}
