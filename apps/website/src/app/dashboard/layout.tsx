import type { Metadata } from 'next';
import { DashboardProvider } from '@/components/dashboard/state/DashboardProvider';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import './dashboard.css';
export const metadata: Metadata = {
  title: 'Dashboard | AgendAI',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
