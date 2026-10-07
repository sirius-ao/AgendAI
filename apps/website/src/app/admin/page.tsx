import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin/AdminConsole';

export const metadata: Metadata = {
  title: 'Administração da plataforma',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
