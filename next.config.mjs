/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BYPASS_TADABBUR_TIMER: process.env.BYPASS_TADABBUR_TIMER || "false",
  },
};

export default nextConfig;
