'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setSession } from '@/lib/useAuth';

export default function SSOCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing SSO token');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/sso/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data.error || 'SSO login failed');
          return;
        }

        // Store session using the existing oj_session helper
        setSession(data.user);

        if (data.user.forcePasswordChange) {
          router.replace('/change-password');
        } else {
          router.replace('/');
        }
      } catch {
        setError('Network error during SSO login');
      }
    })();
  }, [searchParams, router]);

  if (error) {
    const hubUrl = process.env.NEXT_PUBLIC_IRAM_HUB_URL || 'https://iram-hub.vercel.app';
    return (
      <div className="min-h-screen flex items-center justify-center bg-oj-bg px-4">
        <div className="max-w-sm w-full bg-oj-white rounded-xl shadow-sm border border-oj-border p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h2 className="text-lg font-bold text-oj-dark mb-2">SSO Login Failed</h2>
          <p className="text-sm text-oj-muted mb-6">{error}</p>
          <a
            href={hubUrl}
            className="inline-block bg-oj-blue hover:bg-oj-blue-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm"
          >
            Back to iRam Hub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-oj-bg">
      <div className="text-oj-muted text-sm">Signing in...</div>
    </div>
  );
}
