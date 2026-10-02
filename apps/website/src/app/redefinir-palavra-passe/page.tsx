import { PasswordRecovery } from '@/components/common/PasswordRecovery';

export const metadata = { title: 'Nova palavra-passe', robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tokenValue = (await searchParams).token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;
  return <PasswordRecovery token={token} />;
}
