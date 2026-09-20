import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import DashboardApp from '@/components/DashboardApp';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          Trợ lý số KHDH <span className="badge">Form V11-2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="muted">{session.user.email}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="container">
        <DashboardApp userEmail={session.user.email ?? ''} />
      </div>
    </div>
  );
}
