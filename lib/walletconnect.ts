import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';

const ZERA_WC_REQUIRED_NAMESPACES = {
  zera: {
    chains: ['zera:mainnet'],
    methods: ['zera_getAccounts', 'zera_signTransaction', 'zera_signMessage'],
    events: ['accountsChanged'],
  },
};

export interface WCConnectResult {
  uri: string;
  approval: () => Promise<SessionTypes.Struct>;
}

export type WCClientEvent = { type: 'session_delete'; topic: string };

export class WalletConnectClient {
  private static instance: WalletConnectClient;
  private client: SignClient | null = null;
  private initPromise: Promise<void> | null = null;
  private listeners: Array<(event: WCClientEvent) => void> = [];
  private initializedValue = false;

  static getInstance(): WalletConnectClient {
    if (!WalletConnectClient.instance) {
      WalletConnectClient.instance = new WalletConnectClient();
    }

    return WalletConnectClient.instance;
  }

  get initialized(): boolean {
    return this.initializedValue;
  }

  async init(projectId: string): Promise<void> {
    if (this.initializedValue) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
      const client = await SignClient.init({
        projectId,
        metadata: {
          name: 'ZERA Wallet Integration Test',
          description: 'Standalone example for Vision Hub, ZERA wallet adapter, and WalletConnect.',
          url: origin,
          icons: [`${origin}/icon.svg`],
        },
      });

      client.on('session_delete', (event: { topic: string }) => {
        this.listeners.forEach((listener) => listener({ type: 'session_delete', topic: event.topic }));
      });

      this.client = client;
      this.initializedValue = true;
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  onEvent(listener: (event: WCClientEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  async connect(): Promise<WCConnectResult> {
    if (!this.client) throw new Error('WalletConnect is not initialized.');

    const { uri, approval } = await this.client.connect({
      requiredNamespaces: ZERA_WC_REQUIRED_NAMESPACES,
    });
    if (!uri) throw new Error('WalletConnect did not return a pairing URI.');

    return { uri, approval };
  }

  getClient(): SignClient {
    if (!this.client) throw new Error('WalletConnect is not initialized.');
    return this.client;
  }

  getActiveSession(): SessionTypes.Struct | null {
    if (!this.client) return null;
    const sessions = this.client.session.getAll();
    return sessions.length > 0 ? sessions[sessions.length - 1]! : null;
  }

  getZeraAddress(session: SessionTypes.Struct): string | null {
    return this.getAccountAddress(session, 'zera');
  }

  async disconnect(session: SessionTypes.Struct): Promise<void> {
    if (!this.client) throw new Error('WalletConnect is not initialized.');
    await this.client.disconnect({
      topic: session.topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  }

  private getAccountAddress(session: SessionTypes.Struct, namespace: 'zera'): string | null {
    const accounts = session.namespaces[namespace]?.accounts;
    if (!accounts?.length) return null;

    const parts = accounts[0]!.split(':');
    return parts.length >= 3 ? parts.slice(2).join(':') : null;
  }
}

export const getWalletConnectClient = () => WalletConnectClient.getInstance();
