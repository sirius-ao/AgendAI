import { AccessPreview } from '@/components/common/AccessPreview';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Contacto',
  'Conheça a proposta AgendAKI para a sua escola.',
  '/contacto',
);
export default function Contact() {
  return <AccessPreview mode="contacto" />;
}
