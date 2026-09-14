import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import { uploadToS3 } from "../utils/fileUpload";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const allUsers = await db.query.users.findMany({
      with: {
        department: true,
      },
    });

    res.status(200).json({
      success: true,
      count: allUsers.length,
      data: allUsers.map((u) => ({
        _id: u.id,
        ...u,
        department: u.department ? { _id: u.department.id, ...u.department } : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id as string),
      with: { department: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        ...user,
        department: user.department ? { _id: user.department.id, ...user.department } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const newUser = await User.create(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.id, newUser._id.toString()),
      with: { department: true },
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user?.id,
        ...user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id as string),
      with: { department: true },
    });

    res.status(200).json({
      success: true,
      data: {
        _id: user?.id,
        ...user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile image
// @route   PUT /api/users/:id/profile-image
// @access  Private/Admin
export const uploadProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Please upload a file" });
      return;
    }

    const uploadedFile = await uploadToS3(req.file, "profile-images");

    await User.findByIdAndUpdate(user._id, { profileImage: uploadedFile.url });

    res.status(200).json({
      success: true,
      data: { ...user, profileImage: uploadedFile.url },
    });
  } catch (error) {
    next(error);
  }
};
