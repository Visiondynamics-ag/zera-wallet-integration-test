# ZERA Wallet Integration Test

Standalone example for connecting a web dApp to [Vision Hub](https://visionhub.ch), the ZERA wallet adapter, ZERA WalletConnect, and ZERA/Vision Hub launch links.

This repo is intentionally small. It was split out from an internal wallet test page so builders can copy the ZERA wallet integration patterns without pulling in an explorer application.

## zera.js source

The suite uses the published remote npm package, not a local copy of the adapter implementation. `@zera-os/zera.js` is pinned in `package.json` and resolved in `package-lock.json` from:

```txt
https://registry.npmjs.org/@zera-os/zera.js/-/zera.js-1.0.2.tgz
```

The React provider in [lib/zera-wallet-provider.tsx](./lib/zera-wallet-provider.tsx) is only a thin app wrapper around the remote `ZeraWalletAdapter`, signing helpers, and transaction builders exported by `@zera-os/zera.js`.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

WalletConnect is optional. To enable it, create your own project in the [WalletConnect Dashboard](https://dashboard.walletconnect.com/) and add:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id
```

Use the WalletConnect dashboard allowlist for deployed domains. `localhost` is permitted for local development.

## What is included

- ZERA wallet adapter connection through `@zera-os/zera.js`
- Vision Hub injected provider detection through `window.zera`
- ZERA deep-link fallback through `zera-wallet://`
- Optional ZERA WalletConnect session proposal
- ZERA self-transfer builder and signer
- Explicit opt-in broadcast button for a signed self-transfer
- Wallet-neutral `zera:` and `zera-action:` link builders
- Vision Hub direct `visionhub://send`, `visionhub://action`, and `visionhub://browse` link builders
- HTTPS launcher pages at `/open/wallet` and `/open/visionhub`
- Example ZERA action endpoint at `/api/actions/zera/self-transfer`

## Reusable connect modal

The Zerascan-style connect modal is isolated in [components/ZeraConnectWalletModal.tsx](./components/ZeraConnectWalletModal.tsx). It is the component to copy into another dApp.

The modal owns only UI behavior:

- open and close animation
- Escape and backdrop close handling
- Vision Hub QR toggle
- WalletConnect QR display
- generic `zera-wallet://connect` QR toggle
- Vision Hub download disclosure
- request ID and connect URL generation

It does not own wallet state. Your app passes wallet state and connection callbacks into the component.

Minimal usage:

```tsx
'use client';

import { useState } from 'react';
import { ZeraConnectWalletModal } from '@/components/ZeraConnectWalletModal';
import { useZeraWallet } from '@/lib/zera-wallet-provider';

export function ConnectWalletButton() {
  const [open, setOpen] = useState(false);
  const [wcUri, setWcUri] = useState('');
  const [wcPending, setWcPending] = useState(false);
  const [adapterError, setAdapterError] = useState('');
  const [wcError, setWcError] = useState('');
  const { adapter, state, connectAdapter, connectWalletConnect } = useZeraWallet();

  async function connectViaAdapter() {
    setAdapterError('');
    const publicKey = await connectAdapter();
    console.log('connected', publicKey);
    setOpen(false);
  }

  async function startWalletConnect() {
    setWcPending(true);
    setWcError('');

    try {
      const { uri, approval } = await connectWalletConnect();
      setWcUri(uri);
      await approval();
      setOpen(false);
    } catch (error) {
      setWcError(error instanceof Error ? error.message : 'WalletConnect failed');
    } finally {
      setWcPending(false);
      setWcUri('');
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Connect Wallet
      </button>

      <ZeraConnectWalletModal
        open={open}
        onOpenChange={setOpen}
        isEmbedded={adapter.isEmbedded}
        connecting={state === 'connecting'}
        walletConnectPending={wcPending}
        walletConnectUri={wcUri}
        adapterError={adapterError}
        walletConnectError={wcError}
        onConnectAdapter={() => connectViaAdapter()}
        onConnectWalletConnect={startWalletConnect}
        onClearWalletConnectUri={() => setWcUri('')}
      />
    </>
  );
}
```

To copy the modal cleanly:

1. Copy [components/ZeraConnectWalletModal.tsx](./components/ZeraConnectWalletModal.tsx).
2. Copy [public/visionhub-icon.png](./public/visionhub-icon.png).
3. Copy the `Wallet modal styles` block from [app/globals.css](./app/globals.css).
4. Install `lucide-react`, `next`, `react`, and `qrcode.react`.
5. Wire `onConnectAdapter` to `ZeraWalletAdapter.connect()` or this repo's `connectAdapter()` provider helper.
6. Wire `onConnectWalletConnect` only if you configure your own WalletConnect project ID.

The copied CSS block uses this repo's theme variables such as `--text`, `--muted`, `--border`, and `--red-soft`; either copy the matching variables from [app/globals.css](./app/globals.css) or replace them with your app's design tokens.

If your app does not use the `@/*` TypeScript path alias, change the import path to wherever you place the component. If your app does not use Next Image, replace the `next/image` import with a normal `<img>`.

## Important warning

The page can build, sign, and optionally broadcast a real 0.01 `$ZRA+0000` self-transfer. Signing alone does not submit the transaction. Broadcasting is disabled until the user explicitly checks the confirmation box.

Do not wire automatic broadcasts into production UI. Always show the user what they are signing and what network action will happen.

## ZERA Wallet Adapter

Use the adapter when you are building a ZERA dApp and want the normal Vision Hub experience.

```ts
import { ZeraWalletAdapter } from '@zera-os/zera.js';

const adapter = new ZeraWalletAdapter();
await adapter.connect();
```

In this example, [lib/zera-wallet-provider.tsx](./lib/zera-wallet-provider.tsx) wraps the adapter for React.

How it works:

- Inside Vision Hub's dApp browser, the wallet injects `window.zera`.
- The adapter calls the injected provider to request accounts and signatures.
- Outside a wallet browser, the adapter can use a deep-link redirect such as `zera-wallet://connect?...`.
- Signed transaction results can return through URL parameters, so the provider stores temporary signing context in `sessionStorage` before redirecting.

Use it for:

- ZERA account connection
- ZERA transaction signing
- Vision Hub dApp browser support
- Mobile deep-link fallback for ZERA-compatible wallets

Limitations:

- It is a ZERA wallet adapter, not a generic wallet adapter for other chains.
- Deep-link signing can navigate away from the page and return later.
- Browser storage restrictions can make deep-link resume flows more fragile than injected provider signing.
- Desktop browsers without a wallet extension or wallet browser need QR, deep-link, or WalletConnect fallback UX.

## WalletConnect

WalletConnect is useful when the dApp and wallet are not in the same browser context, especially desktop browser to mobile wallet.

This repo uses `@walletconnect/sign-client` directly in [lib/walletconnect.ts](./lib/walletconnect.ts). It proposes only the ZERA namespace:

```ts
{
  zera: {
    chains: ['zera:mainnet'],
    methods: ['zera_getAccounts', 'zera_signTransaction', 'zera_signMessage'],
    events: ['accountsChanged']
  }
}
```

Use it for:

- Desktop browser to mobile wallet QR flows
- Cross-device pairing
- Wallet sessions that should survive page navigation
- ZERA namespace negotiation

Limitations:

- You need your own WalletConnect project ID.
- You should configure an origin allowlist in the WalletConnect dashboard before deployment.
- The wallet must support the ZERA namespace and requested methods.
- WalletConnect is a relay/session protocol. It is not the same as an injected provider.
- Session approval can be interrupted by mobile OS backgrounding or network conditions, so production UI should handle rejection and timeout states.

## Link choices

### Wallet-neutral ZERA links

Use these when any compatible ZERA wallet should be allowed to handle the request:

```txt
zera:<recipient>?amount=0.01&token=%24ZRA%2B0000&memo=hello
zera-action:https%3A%2F%2Fexample.com%2Faction
```

These are interoperable but may show an OS chooser when multiple wallets can handle the scheme.

### Vision Hub direct links

Use these when you specifically want Vision Hub:

```txt
visionhub://send?chain=zera&to=<address>&amount=0.01&token=%24ZRA%2B0000
visionhub://action?chain=zera&url=https%3A%2F%2Fexample.com%2Faction
visionhub://browse?url=https%3A%2F%2Fexample.com
```

Direct links are app-specific. They are correct when product requirements say "open Vision Hub", but they are not wallet-neutral.

### HTTPS launchers

The launcher routes are browser-friendly wrappers:

- `/open/wallet` builds and opens a wallet-neutral ZERA protocol link.
- `/open/visionhub` builds and opens a Vision Hub-specific link.

These routes provide a fallback screen if the OS does not open an installed wallet.

## Example action endpoint

The endpoint at `/api/actions/zera/self-transfer` exposes a minimal action flow:

- `GET` returns action metadata.
- `POST` expects `account` and `publicKey`.
- The endpoint returns a serialized unsigned ZERA self-transfer transaction.
- Vision Hub can fetch the metadata, request the transaction, show a preview, and ask the user to sign.

This is intentionally simple and should not be treated as a full production action server.

## Files to copy into another app

For only the connect modal:

- [components/ZeraConnectWalletModal.tsx](./components/ZeraConnectWalletModal.tsx)
- the `Wallet modal styles` block from [app/globals.css](./app/globals.css)
- [public/visionhub-icon.png](./public/visionhub-icon.png)

For the full test suite behavior:

- [lib/zera-wallet-provider.tsx](./lib/zera-wallet-provider.tsx)
- [lib/walletconnect.ts](./lib/walletconnect.ts)
- [lib/visionhub-links.ts](./lib/visionhub-links.ts)
- [lib/network.ts](./lib/network.ts)
- [components/ZeraConnectWalletModal.tsx](./components/ZeraConnectWalletModal.tsx)
- [components/ZeraWalletSuite.tsx](./components/ZeraWalletSuite.tsx)
- [components/DeepLinkLab.tsx](./components/DeepLinkLab.tsx)

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WC_PROJECT_ID` | No | Enables WalletConnect pairing. Required for the WC demo. |
| `NEXT_PUBLIC_ZERA_GRPC_ENDPOINT` | No | Optional ZERA gRPC endpoint override. Empty uses the SDK default. |
| `NEXT_PUBLIC_ZERA_DEEPLINK_URL` | No | Generic ZERA wallet deep-link scheme. Defaults to `zera-wallet://`. |

## Security notes

- The dApp never receives private keys.
- Treat all action endpoints as untrusted until your wallet has previewed the transaction.
- Never auto-submit a transaction immediately after signing unless the user explicitly approved that product behavior.
- Do not hard-code a shared WalletConnect project ID in an open-source template.
- Keep WalletConnect project IDs origin-restricted for deployed apps.
- Do not request broad WalletConnect namespaces if your dApp only needs ZERA.
- Validate and encode user-controlled deep-link values.

## References

- [ZERA SDK on npm](https://www.npmjs.com/package/@zera-os/zera.js)
- [Vision Hub](https://visionhub.ch)
- [WalletConnect App SDK overview](https://docs.walletconnect.network/app-sdk/overview)
- [WalletConnect JavaScript setup](https://docs.walletconnect.network/app-sdk/javascript/installation)

## License

Apache-2.0. See [LICENSE](./LICENSE).
