'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[][];
  }
}

function privateRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/') || [
    '/entrar', '/comecar', '/contacto', '/convites/aceitar', '/verificar-email',
    '/redefinir-palavra-passe', '/recuperar-palavra-passe', '/partilha/plano',
    '/newsletter/confirmar', '/newsletter/cancelar', '/turnstile/register',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function PrivacyAnalytics() {
  const pathname = usePathname();
  const restricted = privateRoute(pathname);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    if (restricted) {
      document.documentElement.setAttribute('data-clarity-mask', 'true');
      window.clarity?.('consent', false);
      window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' });
    } else {
      document.documentElement.removeAttribute('data-clarity-mask');
    }
  }, [restricted]);

  useEffect(() => {
    if (!restricted && analyticsReady) {
      window.gtag?.('event', 'page_view', { page_path: pathname, page_location: `${window.location.origin}${pathname}` });
    }
  }, [analyticsReady, pathname, restricted]);

  if (restricted) return null;
  return (
    <>
      <Script id="microsoft-clarity-init" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","ytnlp7xs6s");`}
      </Script>
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','G-W1GXHX9HDK',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-W1GXHX9HDK" strategy="afterInteractive" onReady={() => setAnalyticsReady(true)} />
    </>
  );
}
