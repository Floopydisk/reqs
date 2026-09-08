import multer from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

// File filter for strict file uploads (original)
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept images and documents
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file format. Only JPEG, PNG, JPG, PDF, DOC, DOCX, XLS, XLSX are allowed.",
      ),
    );
  }
};

// Lenient file filter for mixed multipart forms (text + optional files)
const lenientFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Known file upload field names
  const fileFields = ["uploadImage", "file", "attachment", "image", "document"];
  const isIndexedItemImage = /^uploadImage_\d+$/.test(file.fieldname);

  // If it's a known file field, validate the mimetype
  if (fileFields.includes(file.fieldname) || isIndexedItemImage) {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file format. Only JPEG, PNG, JPG, PDF, DOC, DOCX, XLS, XLSX are allowed.",
        ),
      );
    }
  } else {
    // For unknown fields (text fields), accept them
    cb(null, true);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadItemImage = multer({
  storage,
  fileFilter: lenientFileFilter, // Use lenient filter for mixed multipart forms
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).any();
