import { AccessPreview } from '@/components/common/AccessPreview';
export const metadata = { title: 'Entrar', robots: { index: false, follow: true } };
export default function Login() {
  return <AccessPreview mode="entrar" />;
}
