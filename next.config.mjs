// Ensure NEXTAUTH_URL is always a valid URL and never empty string
const getValidUrl = () => {
  const url = process.env.NEXTAUTH_URL?.trim();
  if (url) {
    return url.startsWith('http') ? url : `https://${url}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return 'http://localhost:3000';
};

const validNextAuthUrl = getValidUrl();
process.env.NEXTAUTH_URL = validNextAuthUrl;

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = 'build-fallback-secret-at-least-32-chars-long';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: validNextAuthUrl
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'mathjax-full', 'mathml2omml-plus']
  }
};

export default nextConfig;

