import jwt from "jsonwebtoken";
import { Response } from "express";
import { IUser } from "../types/interfaces";

// Generate JWT token
export const generateToken = (user: IUser): string => {
  return jwt.sign({ id: user.id || user._id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE
      ? parseInt(process.env.JWT_EXPIRE)
      : "12hrs",
  });
};

// Set token in cookie
export const sendTokenResponse = (
  user: IUser,
  statusCode: number,
  res: Response
): void => {
  // Create token
  const token = generateToken(user);

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRE || "12") * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user.id || user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        profileImage: user.profileImage,
      },
    });
};
