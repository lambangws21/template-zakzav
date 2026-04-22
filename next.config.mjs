/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    VITE_APPWRITE_ENDPOINT: process.env.VITE_APPWRITE_ENDPOINT,
    VITE_APPWRITE_PROJECT_ID: process.env.VITE_APPWRITE_PROJECT_ID,
    VITE_APPWRITE_PROJECT_NAME: process.env.VITE_APPWRITE_PROJECT_NAME,
    VITE_APPWRITE_DATABASE_ID: process.env.VITE_APPWRITE_DATABASE_ID,
    VITE_APPWRITE_TEMPLATE_COLLECTION_ID:
      process.env.VITE_APPWRITE_TEMPLATE_COLLECTION_ID,
    VITE_APPWRITE_TEMPLATE_BUCKET_ID:
      process.env.VITE_APPWRITE_TEMPLATE_BUCKET_ID,
    VITE_APPWRITE_TEMPLATE_BUCKET_NAME:
      process.env.VITE_APPWRITE_TEMPLATE_BUCKET_NAME,
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MESSAGING_SENDER_ID:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
  turbopack: {},
};

export default nextConfig;
