import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Cấu hình NextAuth (Auth.js v4) dùng Google OAuth 2.0.
 *
 * User Data Isolation: mọi bản ghi trong DB (PPCT đã upload, KHDH đã tạo)
 * đều được lưu kèm `owner_email` = email đăng nhập Google của giáo viên.
 * Mọi truy vấn đọc/ghi trong các API route đều lọc theo email của session
 * hiện tại, đảm bảo giáo viên A không bao giờ nhìn thấy hay ghi đè dữ liệu
 * của giáo viên B.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ''
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/'
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    }
  }
};
