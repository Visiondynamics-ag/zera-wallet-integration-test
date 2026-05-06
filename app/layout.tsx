import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';

import { ZeraWalletProvider } from '@/lib/zera-wallet-provider';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'ZERA Wallet Integration Test',
  description: 'Standalone Vision Hub, ZERA wallet adapter, and WalletConnect integration example.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <ZeraWalletProvider>{children}</ZeraWalletProvider>
      </body>
    </html>
  );
}
