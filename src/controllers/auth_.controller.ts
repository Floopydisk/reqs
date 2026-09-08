// import { Request, Response, NextFunction } from "express";
// import User from "../models/user.model";
// import { sendTokenResponse } from "../utils/tokenManager";
// import { generateRandomToken, hashToken } from "../utils/passwordUtils";
// import emailService from "../utils/emailService";

// // @desc    Register user
// // @route   POST /api/auth/register
// // @access  Public
// export const register = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { firstName, lastName, email, password, role } = req.body;

//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       res.status(400).json({ success: false, message: "Email already in use" });
//       return;
//     }

//     // Create user
//     const user = await User.create({
//       firstName,
//       lastName,
//       email,
//       // password,
//       role,
//     });

//     // Send token response
//     sendTokenResponse(user, 201, res);
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Login user
// // @route   POST /api/auth/login
// // @access  Public
// export const login = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { email, password } = req.body;

//     // Check if email and password are provided
//     if (!email || !password) {
//       res
//         .status(400)
//         .json({ success: false, message: "Please provide email and password" });
//       return;
//     }

//     // Check if user exists
//     const user = await User.findOne({ email }).select("+password");
//     if (!user) {
//       res.status(401).json({ success: false, message: "Invalid credentials" });
//       return;
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       res
//         .status(401)
//         .json({ success: false, message: "Your account has been deactivated" });
//       return;
//     }

//     // Check if password matches
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       res.status(401).json({ success: false, message: "Invalid credentials" });
//       return;
//     }

//     // Send token response
//     sendTokenResponse(user, 200, res);
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Logout user
// // @route   GET /api/auth/logout
// // @access  Private
// export const logout = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     res.cookie("token", "none", {
//       expires: new Date(Date.now() + 10 * 1000),
//       httpOnly: true,
//     });

//     res.status(200).json({ success: true, data: {} });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Get current logged in user
// // @route   GET /api/auth/me
// // @access  Private
// export const getMe = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const user = await User.findById(req.user!._id);

//     res.status(200).json({
//       success: true,
//       data: user,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Update user details
// // @route   PUT /api/auth/updatedetails
// // @access  Private
// export const updateDetails = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { firstName, lastName } = req.body;

//     const user = await User.findByIdAndUpdate(
//       req.user!._id,
//       { firstName, lastName },
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       success: true,
//       data: user,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Update password
// // @route   PUT /api/auth/updatepassword
// // @access  Private
// export const updatePassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     // Get user with password
//     const user = await User.findById(req.user!._id).select("+password");

//     if (!user) {
//       res.status(404).json({ success: false, message: "User not found" });
//       return;
//     }

//     // Check current password
//     const isMatch = await user.comparePassword(currentPassword);
//     if (!isMatch) {
//       res
//         .status(401)
//         .json({ success: false, message: "Current password is incorrect" });
//       return;
//     }

//     // Update password
//     // user.password = newPassword;
//     await user.save();

//     sendTokenResponse(user, 200, res);
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Forgot password
// // @route   POST /api/auth/forgotpassword
// // @access  Public
// export const forgotPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { email } = req.body;

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       res.status(404).json({ success: false, message: "User not found" });
//       return;
//     }

//     // Generate reset token
//     const resetToken = generateRandomToken();

//     // Hash token and set to resetPasswordToken field
//     user.resetPasswordToken = hashToken(resetToken);

//     // Set expire
//     user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     await user.save({ validateBeforeSave: false });

//     // Create reset URL
//     const resetUrl = `${req.protocol}://${req.get(
//       "host"
//     )}/api/auth/resetpassword/${resetToken}`;

//     // Send email
//     try {
//       await emailService.sendEmail({
//         to: user.email,
//         subject: "Password Reset",
//         html: `
//           <h1>Password Reset</h1>
//           <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
//           <p>Please click on the following link to reset your password:</p>
//           <a href="${resetUrl}" target="_blank">Reset Password</a>
//           <p>This link will expire in 10 minutes.</p>
//         `,
//       });

//       res.status(200).json({ success: true, message: "Email sent" });
//     } catch (error) {
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpire = undefined;
//       await user.save({ validateBeforeSave: false });

//       res
//         .status(500)
//         .json({ success: false, message: "Email could not be sent" });
//     }
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Reset password
// // @route   PUT /api/auth/resetpassword/:resettoken
// // @access  Public
// export const resetPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     // Get hashed token
//     const resetPasswordToken = hashToken(req.params.resettoken);

//     // Find user by reset token and check if token is still valid
//     const user = await User.findOne({
//       resetPasswordToken,
//       resetPasswordExpire: { $gt: Date.now() },
//     });

//     if (!user) {
//       res
//         .status(400)
//         .json({ success: false, message: "Invalid or expired token" });
//       return;
//     }

//     // Set new password
//     // user.password = req.body.password;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
//     await user.save();

//     sendTokenResponse(user, 200, res);
//   } catch (error) {
//     next(error);
//   }
// };
