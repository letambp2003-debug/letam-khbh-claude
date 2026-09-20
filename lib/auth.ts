import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Cấu hình NextAuth (Auth.js v4):
 * - Hỗ trợ đăng nhập trực tiếp bằng Email giáo viên (không phụ thuộc Google Cloud Console).
 * - Hỗ trợ đăng nhập Google OAuth 2.0 (nếu có GOOGLE_CLIENT_ID & SECRET).
 *
 * User Data Isolation: mọi bản ghi trong DB (PPCT đã upload, KHDH đã tạo)
 * đều được lưu kèm `owner_email` = email đăng nhập của giáo viên.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'build-fallback-secret-at-least-32-chars-long',
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email giáo viên',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'giaovien@gmail.com' }
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email?.trim();
        const email = rawEmail && rawEmail.length > 0 ? rawEmail : 'giaovien@demo.edu.vn';
        return {
          id: email,
          name: email.split('@')[0],
          email: email
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/'
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.email) {
        token.email = user.email;
      } else if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    }
  }
};

