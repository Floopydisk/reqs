import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain, body } from "express-validator";

// Validation chain for vendor login
export const validateVendorLoginInput = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Validation chain for vendor registration
export const validateVendorRegistrationInput = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Company name must be between 2 and 200 characters"),
  body("contactPerson")
    .trim()
    .notEmpty()
    .withMessage("Contact person name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Contact person name must be between 2 and 100 characters"),
  body("contactPersonDesignation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Designation must not exceed 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[\d\s\-+()]+$/)
    .withMessage("Please enter a valid phone number"),
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 5, max: 500 })
    .withMessage("Address must be between 5 and 500 characters"),
  body("website")
    .optional()
    .trim()
    .isURL({ require_protocol: false })
    .withMessage("Please enter a valid website URL"),
  body("dateOfIncorporation")
    .optional()
    .isISO8601()
    .withMessage("Please enter a valid date (YYYY-MM-DD)")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      if (date > today) {
        throw new Error("Date of incorporation cannot be in the future");
      }
      return true;
    }),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("categories")
    .custom((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (e) {
          return false;
        }
      }
      return Array.isArray(value) && value.length > 0;
    })
    .withMessage(
      "At least one business category is required and must be a valid array."
    ),
];

export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors: { [key: string]: string } = {};
    errors.array().forEach((error) => {
      if (error.type === "field" && error.path) {
        formattedErrors[error.path] = error.msg;
      }
    });

    res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: formattedErrors,
    });
  };
};
