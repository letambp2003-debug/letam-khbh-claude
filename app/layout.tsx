import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Trợ lý số soạn KHDH - Chuẩn 5512',
  description:
    'Webapp tự động hoá soạn Kế hoạch dạy học (KHDH) chuẩn Công văn 5512, Form V11-2, từ dữ liệu Phụ lục I/PPCT.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
