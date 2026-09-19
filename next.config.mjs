/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'mathjax-full', 'mathml2omml-plus']
  }
};

export default nextConfig;
