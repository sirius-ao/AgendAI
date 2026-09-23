'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
export function SiteFrame({children}:{children:ReactNode}){const pathname=usePathname();if(pathname==='/dashboard'||pathname.startsWith('/dashboard/'))return children;return <><Header/><main id="main">{children}</main><Footer/></>;}
