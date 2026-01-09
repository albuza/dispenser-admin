import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pass environment variables to server runtime
  env: {
    APP_REGION: process.env.APP_REGION,
    APP_ACCESS_KEY_ID: process.env.APP_ACCESS_KEY_ID,
    APP_SECRET_ACCESS_KEY: process.env.APP_SECRET_ACCESS_KEY,
    IOT_ENDPOINT: process.env.IOT_ENDPOINT,
  },
};

export default nextConfig;
