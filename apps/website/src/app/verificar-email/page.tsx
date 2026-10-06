import { EmailVerification } from '@/components/common/EmailVerification';

export const metadata = { title: 'Confirmar email', robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = params.token;
  const email = params.email;
  return <EmailVerification token={Array.isArray(token) ? token[0] : token} initialEmail={Array.isArray(email) ? email[0] : email} />;
}
