import { PasswordRecovery } from '@/components/common/PasswordRecovery';

export const metadata = { title: 'Recuperar palavra-passe', robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <PasswordRecovery />;
}
