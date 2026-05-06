import { TestWalletLayout } from '@/components/TestWalletLayout';
import { ZeraWalletSuite } from '@/components/ZeraWalletSuite';

export default function HomePage() {
  return (
    <TestWalletLayout
      title="ZERA Wallet Integration Test"
      description="Connect to Vision Hub through the ZERA wallet adapter, fall back to WalletConnect when configured, and test real ZERA signing plus send/action/browser launch links."
    >
      <ZeraWalletSuite />
    </TestWalletLayout>
  );
}
