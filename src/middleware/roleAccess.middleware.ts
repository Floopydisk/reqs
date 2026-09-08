import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/enums";

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const normalizedAllowedRoles = roles.map((role) =>
      role.toString().trim().toLowerCase()
    );
    const currentRole = req.user.role
      ? req.user.role.toString().trim().toLowerCase()
      : "";

    if (!normalizedAllowedRoles.includes(currentRole)) {
      res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
      return;
    }

    next();
  };
};
