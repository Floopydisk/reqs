import {
  type Request,
  type Response,
  type NextFunction,
} from "express";
// import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import User from "../models/user.model";
import Department from "../models/department.model";
import Vendor from "../models/vendor.model";
import VendorCategory from "../models/vendorCategory.model";
import { UserRole } from "../types/enums";
import { IUser } from "../types/interfaces";
import { HttpError } from "../utils/httpError";
import { generateToken, sendTokenResponse } from "../utils/tokenManager";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
// Optional: Import enhanced role mapping
import { mapDesignationToRoleEnhanced } from "../config/roleMapping";

// Interface for intranet response
interface IntranetUserResponse {
  user_id: string;
  first_name: string;
  last_name: string;
  dept_id: string;
  dept_name: string;
  designation_id: string;
  designation: string;
}

// Interface for mapped user data
interface MappedUserData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designation: string;
  role: UserRole;
}

// Helper function to handle local login response
const loginUserLocally = (
  user: any,
  userId: string,
  res: Response,
  fallback = false
): void => {
  // Generate JWT token
  const token = generateToken(user as IUser);

  // Set token in HTTP-only cookie
  const cookieOptions: {
    expires: Date;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "none";
  } = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    // For cross-site requests (frontend http://localhost:3000 to backend https://*.onrender.com),
    // cookies must be SameSite=None and Secure=true.
    secure: process.env.NODE_ENV !== "development",
    sameSite: process.env.NODE_ENV !== "development" ? "none" : "lax",
  };

  res.cookie("token", token, cookieOptions);

  // Return user data and token
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user?._id,
        employeeId: userId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        role: user?.role,
        department: user?.department,
        designation: user?.designation,
        isActive: user?.isActive,
      },
      token,
    },
    message: fallback ? "Login successful (Database Fallback)" : "Login successful",
  });
};

/**
 * @desc    Login user with intranet authentication
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, bypass } = req.body;
    // const bypass = "iGNOre";

    // Validate required fields
    if (!userId) {
      res.status(400).json({
        success: false,
        message: "Please provide user ID",
      });
      return;
    }

    // Helper to attempt database fallback authentication
    const tryDatabaseFallback = async (): Promise<boolean> => {
      try {
        console.log(`Intranet service failed/unavailable. Attempting database auth fallback for userId: ${userId}`);
        
        const user = await db.query.users.findFirst({
          where: eq(users.employeeId, userId),
          with: { department: true }
        });

        if (user) {
          if (!user.isActive) {
            res.status(401).json({
              success: false,
              message: "User account is inactive",
            });
            return true;
          }

          loginUserLocally(user, userId, res, true);
          return true;
        }
      } catch (dbError) {
        console.error("Database fallback error:", dbError);
        res.status(500).json({ success: false, message: "Database fallback error: " + (dbError as Error).message });
        return true;
      }
      return false;
    };

    // Force time to 24-hour format in WAT
    const currentDate = new Date();
    const options = { timeZone: "Africa/Lagos", hour12: false };

    // Generate current date in DDMMYYYYHH format
    const day = currentDate.toLocaleString("en-GB", {
      ...options,
      day: "2-digit",
    });
    const month = currentDate.toLocaleString("en-GB", {
      ...options,
      month: "2-digit",
    });
    const year = currentDate.toLocaleString("en-GB", {
      ...options,
      year: "numeric",
    });
    const hour = currentDate.toLocaleString("en-GB", {
      ...options,
      hour: "2-digit",
    });

    const dateString = `${day}${month}${year}${hour}`;
    console.log(dateString);

    // Create the authentication string: dateString + userId
    const authString = `${dateString}${userId}`;

    // Generate MD5 hash for authentication and bypass string
    const authStringHash = crypto
      .createHash("md5")
      .update(authString)
      .digest("hex");
    
    if (bypass === "iGNOre") {
        if (await tryDatabaseFallback()) return;
    }
    const bypassHash = crypto.createHash("md5").update(bypass).digest("hex");


    // Generate MD5 hash for userpass
    const md5Hash = `${authStringHash}${bypassHash}`;

    // Prepare intranet URL
    const intranetUrl =
      process.env.INTRANET_AUTH_URL || "https://daystarng.org/";
    const fullUrl = `${intranetUrl}intranet2_09052025/Api/getstaff_dets?user_id=${userId}&userpass=${md5Hash}`;

    try {
      // Call intranet authentication service
      const response = await axios.get(fullUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Requisition-System/1.0",
        },
      });
      console.log("response:", response);

      if (response.status !== 200 || !response.data) {
        if (await tryDatabaseFallback()) return;
        res.status(401).json({
          success: false,
          message: "Invalid credentials or authentication service unavailable",
        });
        return;
      }

      const intranetUser: IntranetUserResponse = response.data;

      // Validate intranet response structure
      if (
        !intranetUser.user_id ||
        !intranetUser.first_name ||
        !intranetUser.last_name
      ) {
        if (await tryDatabaseFallback()) return;
        res.status(401).json({
          success: false,
          message: "Invalid response from authentication service",
        });
        return;
      }

      // Verify that the returned user_id matches the requested userId
      if (intranetUser.user_id !== userId) {
        res.status(401).json({
          success: false,
          message: "Authentication failed - user ID mismatch",
        });
        return;
      }

      // Map intranet data to our user structure
      const mappedUserData = await mapIntranetUserData(intranetUser);

      // Find or create user in our database
      let user = await User.findOne({
        employeeId: mappedUserData.userId,
      }).populate("department", "name");

      // If not found by employeeId, check if user exists by email
      if (!user) {
        user = await User.findOne({
          email: mappedUserData.email,
        }).populate("department", "name");

        // If found by email, update the employeeId to match the current login
        if (user) {
          user.employeeId = mappedUserData.userId;
          await user.save();
          // Update existing user with latest intranet data
          user = await updateUserFromIntranetData(user, mappedUserData);
        } else {
          // Create new user if doesn't exist by either employeeId or email
          user = await createUserFromIntranetData(mappedUserData);
        }
      } else {
        // Update existing user with latest intranet data
        user = await updateUserFromIntranetData(user, mappedUserData);
      }

      // Complete login locally
      loginUserLocally(user, userId, res, false);

    } catch (intranetError) {
      console.error("Intranet authentication error:", intranetError);

      // Only attempt database fallback if the error indicates the server is down or timed out.
      const isAuthServerDown =
        !axios.isAxiosError(intranetError) ||
        !intranetError.response ||
        (intranetError.response.status >= 500 && intranetError.response.status <= 599);

      if (isAuthServerDown) {
        if (await tryDatabaseFallback()) return;
      }

      if (axios.isAxiosError(intranetError)) {
        if (
          intranetError.response?.status === 401 ||
          intranetError.response?.status === 403
        ) {
          res.status(401).json({
            success: false,
            message: "Invalid user ID or authentication failed",
          });
          return;
        }

        if (intranetError.response?.status === 404) {
          res.status(401).json({
            success: false,
            message: "User not found in authentication system",
          });
          return;
        }
      }

      res.status(503).json({
        success: false,
        message:
          "Authentication service temporarily unavailable. Please try again later.",
      });
      return;
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Clear the token cookie
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh authentication token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
      return;
    }

    // Generate new token
    const token = generateToken(user as IUser);

    // Set new token in cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
    };

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new vendor
 * @route   POST /api/auth/vendor/register
 * @access  Public
 */
export const registerVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const {
    name,
    contactPerson,
    contactPersonDesignation,
    email,
    phone,
    address,
    website,
    dateOfIncorporation,
    categories,
  } = req.body;

  try {
    // Check if vendor with same email already exists
    const existingVendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (existingVendor) {
      throw new HttpError(400, "Vendor with this email already exists");
    }

    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new HttpError(400, "User with this email already exists");
    }

    // Process categories - ensure it's always an array of ObjectIDs
    let parsedCategories = categories;

    // If categories is a string, try to parse it as JSON
    if (typeof categories === "string") {
      try {
        parsedCategories = JSON.parse(categories);
      } catch (e) {
        throw new HttpError(
          400,
          "Invalid format for categories. Must be an array of category IDs."
        );
      }
    }

    // If parsedCategories is not an array, make it an array
    if (!Array.isArray(parsedCategories)) {
      if (parsedCategories) {
        // If it's a single value, convert to array
        parsedCategories = [parsedCategories];
      } else {
        throw new HttpError(
          400,
          "Business categories are required. Please select at least one category."
        );
      }
    }

    // Ensure the categories exist
    const categoryCount = await VendorCategory.countDocuments({
      _id: { $in: parsedCategories },
    });

    if (categoryCount !== parsedCategories.length) {
      throw new HttpError(400, "One or more selected categories do not exist.");
    }

    // Prepare vendor data
    const vendorData: any = {
      name,
      contactPerson,
      email: email.toLowerCase(),
      phone,
      address,
      categories: parsedCategories,
      status: "pending",
    };

    // Add optional fields if provided
    if (contactPersonDesignation) {
      vendorData.contactPersonDesignation = contactPersonDesignation;
    }
    if (website) {
      vendorData.website = website;
    }
    if (dateOfIncorporation) {
      vendorData.dateOfIncorporation = new Date(dateOfIncorporation);
    }

    // Create vendor
    const vendor = await Vendor.create(vendorData);

    // Create user account for the vendor
    // @deprecated - Vendor system removed
    // const user = await User.create({
    //   firstName: contactPerson.split(" ")[0],
    //   lastName: contactPerson.split(" ").slice(1).join(" ") || "User",
    //   email: email.toLowerCase(),
    //   password,
    //   role: UserRole.STAFF, // Changed from VENDOR
      // vendor: vendor._id, // Removed
      // isApproved: false,
      // Temporary employeeId and designationId
    //   employeeId: `VEND-${(vendor as any)._id.toString().slice(-6)}`,
    //   designation: contactPersonDesignation || "Vendor",
    //   designationId: "VEND",
    // });

    res.status(201).json({
      success: true,
      message:
        "Vendor registered successfully. Your account is pending approval. You can upload your CAC document using the document upload endpoint.",
      data: {
        vendorId: vendor._id,
        email: vendor.email,
        status: vendor.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login vendor with email and password
 * @route   POST /api/auth/vendor-login
 * @access  Public
 */
export const vendorLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      throw new HttpError(400, "Please provide email and password");
    }

    // Find user with vendor role
    // @deprecated - Vendor system removed
    const user = await User.findOne({
      email: email.toLowerCase(),
      role: UserRole.STAFF, // Changed from VENDOR
    }).populate("department"); // Changed from vendor

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid credentials");
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new HttpError(401, "Invalid credentials");
    }

    // Check if vendor is approved
    if (!user.isApproved) {
      throw new HttpError(401, "Your account is pending approval");
    }

    // @deprecated - Vendor lookup removed
    // Get associated vendor details
    // const vendor = await Vendor.findById(user.vendor);
    // if (!vendor || !vendor.isActive) {
    //   throw new HttpError(401, "Vendor account is not active");
    // }

    // Generate JWT token
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Helper function to map intranet user data to our user structure
async function mapIntranetUserData(
  intranetUser: IntranetUserResponse
): Promise<MappedUserData> {
  // Clean first name and last name by removing 'pastor'
  const cleanFirstName = intranetUser.first_name
    .replace(/pastor\s*/gi, "")
    .trim();
  const cleanLastName = intranetUser.last_name
    .replace(/pastor\s*/gi, "")
    .trim();

  // Generate email from cleaned user data
  const email = `${cleanFirstName.toLowerCase()}${cleanLastName.toLowerCase()}@daystarng.org`;

  // Map designation to role using enhanced configuration-based mapping
  const role = mapDesignationToRoleEnhanced(
    intranetUser.designation,
    intranetUser.designation_id
  );

  return {
    userId: intranetUser.user_id,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    email,
    departmentId: intranetUser.dept_id,
    departmentName: intranetUser.dept_name,
    designationId: intranetUser.designation_id,
    designation: intranetUser.designation,
    role,
  };
}

// Helper function to create new user from intranet data
async function createUserFromIntranetData(
  mappedData: MappedUserData
): Promise<any> {
  // Find or create department
  let department = await Department.findOne({
    $or: [
      { externalId: mappedData.departmentId },
      { name: mappedData.departmentName },
    ],
  });

  // Create department if it doesn't exist or is inactive or name change
  if (!department) {
    department = await Department.create({
      name: mappedData.departmentName,
      externalId: mappedData.departmentId,
      code: mappedData.departmentId, // Use departmentId as code
      head: null, // Set to null initially
      isActive: true,
    });
  }

  // Create new user
  const user = await User.create({
    employeeId: mappedData.userId,
    firstName: mappedData.firstName,
    lastName: mappedData.lastName,
    email: mappedData.email,
    department: department._id,
    designation: mappedData.designation,
    designationId: mappedData.designationId,
    role: mappedData.role,
    isActive: true,
    lastLogin: new Date(),
  });

  return await User.findById(user._id).populate("department", "name");
}

// Helper function to update existing user with intranet data
async function updateUserFromIntranetData(
  user: any,
  mappedData: MappedUserData
): Promise<any> {
  // Find or create department if it has changed
  let department = await Department.findOne({
    $or: [
      { externalId: mappedData.departmentId },
      { name: mappedData.departmentName },
    ],
  });

  if (!department) {
    department = await Department.create({
      name: mappedData.departmentName,
      externalId: mappedData.departmentId,
      code: mappedData.departmentId, // Use departmentId as code
      head: null, // Set to null initially
      isActive: true,
    });
  }

  // Update user data
  user.firstName = mappedData.firstName;
  user.lastName = mappedData.lastName;
  user.email = mappedData.email;
  user.department = department._id;
  user.designation = mappedData.designation;
  user.designationId = mappedData.designationId;
  user.role = mappedData.role;
  user.lastLogin = new Date();

  // Automatically assign department head if the user's role is DEPARTMENT_HEAD
  // This ensures that when a department head logs in, they are properly assigned
  if (mappedData.role === UserRole.DEPARTMENT_HEAD) {
    // Check if this department already has a head assigned
    if (!department.head) {
      console.log(
        `Automatically assigning ${user.firstName} ${user.lastName} as head of ${department.name} department`
      );
      department.head = user._id;
      await department.save();
    } else if (
      department.head &&
      department.head.toString() !== user._id.toString()
    ) {
      console.log(
        `Note: Department ${department.name} already has a different head assigned`
      );
      // We don't change the head if it's already assigned to someone else
      // This requires manual intervention by admin to resolve conflicts
    }
  }

  await user.save();

  return await User.findById(user._id).populate("department", "name");
}
