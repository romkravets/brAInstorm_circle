'use client';
import dynamic from 'next/dynamic';

const BrainstormApp = dynamic(() => import('./BrainstormApp'), { ssr: false });

export default function ClientLoader() {
  return <BrainstormApp />;
}
