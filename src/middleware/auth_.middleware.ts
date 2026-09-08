import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { IUser } from "../types/interfaces";

// Extend Express Request interface to include user
// declare global {
//   namespace Express {
//     interface Request {
//       user?: IUser;
//     }
//   }
// }

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
      // Check if token exists in cookies
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // Get user from the token
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.isActive) {
      res
        .status(401)
        .json({ success: false, message: "User account is deactivated" });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Not authorized to access this route" });
  }
};
