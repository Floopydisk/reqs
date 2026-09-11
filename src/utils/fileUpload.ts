import fs from "fs";
import path from "path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

type S3RuntimeConfig = {
  region: string;
  bucket: string;
  publicBaseUrl?: string;
};

let s3Client: S3Client | null = null;

const getS3Config = (): S3RuntimeConfig => {
  const region = process.env.AWS_S3_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");

  if (!region || !bucket) {
    throw new Error("AWS_S3_REGION and AWS_S3_BUCKET must be configured");
  }

  return { region, bucket, publicBaseUrl };
};

const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  const { region } = getS3Config();
  s3Client = new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  return s3Client;
};

// Define interfaces
interface UploadedFile {
  name: string;
  url: string;
  uploadedAt: Date;
}

/**
 * Upload file from multer memory storage to S3.
 * @param file - Express multer file object
 * @param folder - S3 key prefix/folder
 * @returns Promise with upload result
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder = "uploads",
): Promise<UploadedFile> => {
  if (!file.buffer) {
    throw new Error("Expected multer memory storage file buffer");
  }

  const extension = path.extname(file.originalname || "");
  const baseName = path.basename(file.originalname || "file", extension);
  const safeName = `${baseName.replace(/[^a-zA-Z0-9-_]/g, "_")}${extension}`;
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${uuidv4()}-${safeName}`;
  const { bucket } = getS3Config();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    }),
  );

  return {
    name: file.originalname,
    url: buildS3FileUrl(key),
    uploadedAt: new Date(),
  };
};

/**
 * Upload a local file path to S3.
 * Used for internally-generated files (e.g. generated PDFs).
 */
export const uploadFilePathToS3 = async (
  filePath: string,
  folder = "uploads",
  sourceFileName?: string,
  mimeType = "application/octet-stream",
): Promise<UploadedFile> => {
  const fileName = sourceFileName || path.basename(filePath);
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const safeName = `${baseName.replace(/[^a-zA-Z0-9-_]/g, "_")}${extension}`;
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${uuidv4()}-${safeName}`;
  const { bucket } = getS3Config();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: mimeType,
    }),
  );

  return {
    name: fileName,
    url: buildS3FileUrl(key),
    uploadedAt: new Date(),
  };
};

/**
 * Delete object from S3 by key
 * @param key - S3 object key
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const { bucket } = getS3Config();

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};

const buildS3FileUrl = (key: string): string => {
  const { bucket, region, publicBaseUrl } = getS3Config();

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Extract S3 object key from URL
 * @param url - S3 URL
 * @returns S3 object key or null
 */
export const getS3KeyFromUrl = (url: string): string | null => {
  try {
    const { publicBaseUrl } = getS3Config();
    const parsedUrl = new URL(url);
    let keyPath = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));

    if (publicBaseUrl) {
      const basePath = new URL(publicBaseUrl).pathname
        .replace(/^\//, "")
        .replace(/\/+$/, "");
      if (basePath && keyPath.startsWith(`${basePath}/`)) {
        keyPath = keyPath.slice(basePath.length + 1);
      }
    }

    return keyPath || null;
  } catch (error) {
    console.error("Error extracting S3 key from URL:", error);
    return null;
  }
};

/**
 * Delete file from storage using URL
 * @param url - S3 URL of the file
 * @returns Promise<boolean> - Success status
 */
export const deleteFileByUrl = async (url: string): Promise<boolean> => {
  try {
    const key = getS3KeyFromUrl(url);
    if (!key) return false;

    await deleteFromS3(key);
    return true;
  } catch (error) {
    console.error("Error deleting file by URL:", error);
    return false;
  }
};

/**
 * Upload file from Multer to storage
 * @param file - Express multer file object
 * @param folder - Storage folder path
 * @returns Promise with upload result
 */
export const uploadToStorage = async (
  file: Express.Multer.File,
  folder = "uploads",
): Promise<UploadedFile> => {
  try {
    return await uploadToS3(file, folder);
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("File upload to S3 failed");
  }
};

// Configure multer storage
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Define allowed file types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, documents, and archives are allowed.",
      ),
    );
  }
};

// Export configured multer middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter,
});
