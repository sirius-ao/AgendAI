import { MessagesPage } from '@/components/dashboard/pages/MessagesPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <MessagesPage key={query.conversa || ''} initialConversation={query.conversa} />;
}
