'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: '/' })}>
      Đăng xuất
    </button>
  );
}
