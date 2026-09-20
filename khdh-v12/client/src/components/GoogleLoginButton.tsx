import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleLoginButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    function render() {
      if (cancelled || !window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => onCredential(resp.credential)
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'vi'
      });
    }

    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="warn-box">
        Chưa cấu hình <code>VITE_GOOGLE_CLIENT_ID</code> trong <code>client/.env</code> — xem
        hướng dẫn trong <code>RUN_LOCAL.md</code> để tạo Google OAuth Client ID.
      </div>
    );
  }

  return <div ref={divRef} />;
}
