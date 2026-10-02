import { EmailVerification } from '@/components/common/EmailVerification';

export const metadata = { title: 'Confirmar email', robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const value = (await searchParams).token;
  return <EmailVerification token={Array.isArray(value) ? value[0] : value} />;
}
