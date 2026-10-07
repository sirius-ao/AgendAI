import type { Metadata } from 'next';
import { TurnstileRegisterReturn } from '@/components/common/TurnstileRegisterReturn';

export const metadata: Metadata = {
  title: 'Verificação de segurança',
  robots: { index: false, follow: false },
};

export default function MobileRegistrationVerificationPage() {
  return <TurnstileRegisterReturn />;
}
