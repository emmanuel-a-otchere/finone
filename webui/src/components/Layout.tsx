import { type NavId } from '../NavId';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: NavId;
  onNavigate: (id: NavId) => void;
  pageTitle?: string;
}

export function Layout({ children, currentPage, onNavigate, pageTitle }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Header currentPage={currentPage} onNavigate={onNavigate} pageTitle={pageTitle} />
      {/*
        Shell layout — index.html .shell spec:
        - grid(208px 1fr) — positioned directly below header (top:56px)
        - sidebar is direct grid child, sticky at top:56px so it scrolls WITH header
        - main overflow-y:auto — independent scroll
        Breakpoints: ≥1024px full sidebar | 768-1023 icon rail | <768px sidebar hidden + tabbar
      */}
      <div className="shell">
        {/* Sidebar — direct grid child, sticky scrolls with header */}
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        {/* Main — scrollable content area */}
        <main style={{ overflowY: 'auto', overflowX: 'hidden', minWidth: 0, padding: 20 }}>
          {children}
        </main>
      </div>
      {/* Mobile tab bar — only below 1024px */}
      <div className="lg:hidden">
        <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
