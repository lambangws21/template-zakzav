import { Client, Account, Databases, Storage } from "appwrite";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || "";
const projectName =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME || process.env.VITE_APPWRITE_PROJECT_NAME || "";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || "";
const templateCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_COLLECTION_ID ||
  process.env.VITE_APPWRITE_TEMPLATE_COLLECTION_ID ||
  "";
const templateBucketId =
  process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_BUCKET_ID ||
  process.env.VITE_APPWRITE_TEMPLATE_BUCKET_ID ||
  "";
const templateBucketName =
  process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_BUCKET_NAME ||
  process.env.VITE_APPWRITE_TEMPLATE_BUCKET_NAME ||
  "";

const client = new Client();
if (endpoint) {
  client.setEndpoint(endpoint);
}
if (projectId) {
  client.setProject(projectId);
}

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

const isAppwriteConfigured = Boolean(endpoint && projectId);
const hasTemplateCollectionConfig = Boolean(
  isAppwriteConfigured && databaseId && templateCollectionId,
);
const hasTemplateStorageConfig = Boolean(isAppwriteConfigured && templateBucketId);
const appwriteConfig = {
  endpoint,
  projectId,
  projectName,
  databaseId,
  templateCollectionId,
  templateBucketId,
  templateBucketName,
};

export {
  account,
  appwriteConfig,
  client,
  databases,
  hasTemplateCollectionConfig,
  hasTemplateStorageConfig,
  isAppwriteConfigured,
  storage,
};
