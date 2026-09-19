import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SignInButton from '@/components/SignInButton';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          Trợ lý số KHDH <span className="badge">Form V11-2</span>
        </div>
      </div>
      <div className="hero">
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
