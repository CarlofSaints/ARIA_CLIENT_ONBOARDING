import { Suspense } from 'react';
import SSOCallbackClient from './SSOCallbackClient';

export const dynamic = 'force-dynamic';

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-oj-bg"><div className="text-oj-muted text-sm">Signing in...</div></div>}>
      <SSOCallbackClient />
    </Suspense>
  );
}
