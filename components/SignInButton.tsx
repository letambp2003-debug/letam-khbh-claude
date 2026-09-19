'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button className="btn btn-google" onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11.3 0 20.5-9.2 20.5-20.5 0-1.4-.1-2.7-.4-4z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5c-7.4 0-13.8 4.1-17.1 10.2z"
        />
        <path
          fill="#4CAF50"
          d="M24 45.5c5.5 0 10.4-1.9 14.2-5l-6.5-5.5C29.6 36.6 27 37.5 24 37.5c-5.3 0-9.8-3.1-11.3-7.9l-6.6 5.1C9.1 41.3 16 45.5 24 45.5z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.5 5.5C41.4 36.3 44.5 31.1 44.5 25c0-1.4-.1-2.7-.4-4z"
        />
      </svg>
      Đăng nhập bằng Google
    </button>
  );
}
