import { ArrowRightLeft, FlaskConical, Smartphone } from 'lucide-react';

interface TestWalletLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function TestWalletLayout({ title, description, children }: TestWalletLayoutProps) {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-heading-row">
            <div className="hero-icon">
              <FlaskConical aria-hidden="true" />
            </div>
            <div>
              <span className="badge warning">ZERA Wallet Lab</span>
              <h1>{title}</h1>
            </div>
          </div>
          <p>{description}</p>
          <div className="hero-badges" aria-label="Included wallet surfaces">
            <span>
              <ArrowRightLeft aria-hidden="true" />
              Wallet-neutral protocol links
            </span>
            <span>
              <Smartphone aria-hidden="true" />
              Vision Hub direct launch links
            </span>
          </div>
        </div>
      </section>

      {children}
    </main>
  );
}
