import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SignInButton from '@/components/SignInButton';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect('/dashboard');
  }

  const error = searchParams?.error;

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          Trợ lý số KHDH <span className="badge">Form V11-2</span>
        </div>
      </div>
      <div className="hero">
        {error && (
          <div
            style={{
              maxWidth: 580,
              margin: '0 auto 24px',
              padding: '14px 18px',
              backgroundColor: '#fff1f0',
              border: '1px solid #ffccc7',
              borderRadius: 8,
              textAlign: 'left',
              color: '#cf1322',
              fontSize: 14,
              lineHeight: 1.6
            }}
          >
            <strong>⚠️ Đăng nhập chưa thành công ({error}):</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {error === 'OAuthSignin' && (
                <>
                  <li>Vercel chưa được điền biến môi trường <code>GOOGLE_CLIENT_ID</code> hoặc <code>GOOGLE_CLIENT_SECRET</code>.</li>
                  <li>Hoặc Client ID/Secret trong Vercel Environment Variables không trùng khớp với Google Cloud Console.</li>
                </>
              )}
              {error === 'OAuthCallback' && (
                <>
                  <li>Chưa thêm đường dẫn Redirect URI vào Google Cloud Console.</li>
                  <li>Cần thêm: <code>https://&lt;domain-cua-ban&gt;/api/auth/callback/google</code></li>
                </>
              )}
              {error !== 'OAuthSignin' && error !== 'OAuthCallback' && (
                <li>Vui lòng kiểm tra lại cấu hình Google OAuth trong Google Cloud Console và biến môi trường trên Vercel.</li>
              )}
            </ul>
          </div>
        )}
        <h1>Soạn Kế hoạch dạy học chuẩn 5512 chỉ trong vài phút</h1>
        <p>
          Tải lên Phụ lục I / PPCT của tổ chuyên môn, hệ thống tự động bóc tách Tuần - Tiết -
          Tên bài học - Yêu cầu cần đạt, sau đó dùng AI soạn KHDH đầy đủ 4 hoạt động theo
          Công văn 5512 và xuất file Word chuẩn Form V11-2 để nộp duyệt.
        </p>
        <SignInButton />
        <p className="muted" style={{ marginTop: 24 }}>
          Đăng nhập bằng email Google công vụ của trường. Dữ liệu của mỗi giáo viên được cách ly
          hoàn toàn, không bị lẫn với giáo viên môn khác hoặc trường khác.
        </p>
      </div>
    </div>
  );
}
