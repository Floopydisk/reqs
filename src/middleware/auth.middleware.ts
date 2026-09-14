import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// Extend Request interface to include user
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

interface JwtPayload {
  id: string; // Changed from userId to id to match token generation
  iat: number;
  exp: number;
}

/**
 * @desc    Protect routes - verify JWT token
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }
    // Make sure token exists
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
      return;
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };
      // Get user from token
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
        with: { department: true }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: "User account is inactive",
        });
        return;
      }

      req.user = {
        _id: user.id,
        ...user,
        department: user.department ? { _id: user.department.id, ...user.department } : null
      };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

/**
 * @desc    Grant access to specific roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
      return;
    }

    const userRole = (req.user.role || "").toLowerCase();
    const allowed = roles.some((r) => r.toLowerCase() === userRole);

    if (!allowed) {
      res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
      return;
    }

    next();
  };
};
