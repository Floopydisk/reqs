import {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import jwt from "jsonwebtoken";
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
import { createIntranetRequestSignature } from "../utils/intranetRequestSignature";

// Interface for intranet response
interface IntranetUserResponse {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  dept_id: string;
  dept_name: string;
  designation_id: string;
  designation: string;
  is_active?: boolean;
}

type AuthenticatedIntranetUser = IntranetUserResponse & {
  email: string;
  is_active: boolean;
};

const isIntranetStaffProfile = (
  value: unknown
): value is AuthenticatedIntranetUser => {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    [
      "user_id",
      "first_name",
      "last_name",
      "email",
      "dept_id",
      "dept_name",
      "designation_id",
      "designation",
    ].every(
      (key) =>
        typeof profile[key] === "string" &&
        (profile[key] as string).trim().length > 0
    ) && typeof profile.is_active === "boolean"
  );
};

// Interface for mapped user data
interface MappedUserData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designation: string;
  role: UserRole;
}

class IntranetServiceUnavailableError extends Error {}
class IntranetConfigurationError extends Error {}
class IntranetInvalidResponseError extends Error {}

// Helper function to handle local login response
const loginUserLocally = (
  user: any,
  userId: string,
  res: Response,
  fallback = false,
  frontendOrigin?: string
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
  const result = {
    success: true,
    data: {
      user: {
        id: user?._id || user?.id,
        employeeId: user?.employeeId || userId,
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
    ...(fallback ? { authenticationSource: "local-fallback" } : {}),
  };
  if (frontendOrigin) {
    sendGooglePopupResult(res, frontendOrigin, {
      ...result,
      type: "requisite:google-auth",
    });
  } else {
    res.status(200).json(result);
  }
};

const respondAuthError = (
  res: Response,
  status: number,
  code: string,
  detail: string
): void => {
  res.status(status).json({
    success: false,
    code,
    detail,
    message: detail,
  });
};

const intranetServiceUnavailable = (error: unknown): boolean => {
  if (error instanceof IntranetServiceUnavailableError) return true;
  return (
    axios.isAxiosError(error) &&
    (!error.response || error.response.status >= 500)
  );
};

const logIntranetHttpExchange = (
  endpoint: string,
  requestConfig:
    | {
        method?: string;
        url?: string;
        headers?: unknown;
        data?: unknown;
      }
    | undefined,
  response?:
    | {
        status: number;
        statusText: string;
        headers: unknown;
        data: unknown;
        request?: { getHeaders?: () => unknown };
      }
    | undefined,
  errorMessage?: string
): void => {
  if (process.env.INTRANET_AUTH_DEBUG !== "full") return;

  console.info(
    `[intranet:${endpoint}] HTTP exchange:\n${JSON.stringify(
      {
        request: {
          method: requestConfig?.method,
          url: requestConfig?.url,
          headers:
            response?.request?.getHeaders?.() ?? requestConfig?.headers,
          configuredHeaders: requestConfig?.headers,
          body: requestConfig?.data,
        },
        response: response
          ? {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              body: response.data,
            }
          : null,
        ...(errorMessage ? { error: errorMessage } : {}),
      },
      null,
      2
    )}`
  );
};

const logIntranetErrorExchange = (
  endpoint: string,
  error: unknown
): void => {
  if (axios.isAxiosError(error)) {
    logIntranetHttpExchange(
      endpoint,
      error.config,
      error.response,
      error.message
    );
  }
};

const getIntranetFailure = (
  error: unknown
): { status: number; code: string; message: string } | undefined => {
  if (!axios.isAxiosError(error) || !error.response) return undefined;
  const responseBody = error.response.data;
  if (!responseBody || typeof responseBody !== "object") {
    return {
      status: error.response.status,
      code: "",
      message: "",
    };
  }
  const body = responseBody as Record<string, unknown>;
  return {
    status: error.response.status,
    code: typeof body.error === "string" ? body.error : "",
    message: typeof body.message === "string" ? body.message : "",
  };
};

const getLocalUserByEmail = async (email: string): Promise<any> =>
  User.findOne({ email }).populate("department", "name");

const getLocalUserByEmployeeId = async (
  employeeId: string
): Promise<any> =>
  User.findOne({ employeeId }).populate("department", "name");

const authenticateIntranetEmail = async (
  email: string,
  password: string
): Promise<unknown> => {
  const url =
    process.env.INTRANET_EMAIL_AUTH_URL ||
    "https://daystarng.org/intranet2/api/email_auth";
  const secret = process.env.INTRANET_BYPASS;
  if (!url || !secret) {
    throw new IntranetConfigurationError(
      "Intranet email authentication signing is not configured"
    );
  }
  const body = JSON.stringify({ email, password });
  const { timestamp, nonce, signature } = signIntranetBody(url, body, secret);
  const response = await axios.post<{ success?: unknown; data?: unknown }>(
    url,
    body,
    {
      timeout: 10000,
      headers: {
        "X-Requisite-Timestamp": timestamp,
        "X-Requisite-Nonce": nonce,
        "X-Requisite-Signature": signature,
        "Content-Type": "application/json",
      },
    }
  );
  logIntranetHttpExchange("email_auth", response.config, response);
  if (response.data.success !== true) {
    throw new IntranetInvalidResponseError(
      "Intranet returned an unsuccessful authentication response"
    );
  }
  return response.data.data;
};

const lookupIntranetEmail = async (email: string): Promise<unknown> => {
  const url =
    process.env.INTRANET_EMAIL_LOOKUP_URL ||
    "https://daystarng.org/intranet2/api/email_lookup";
  const secret = process.env.INTRANET_BYPASS;
  if (!url || !secret) {
    throw new IntranetServiceUnavailableError(
      "Intranet email lookup is not configured"
    );
  }
  const body = JSON.stringify({ email });
  const { timestamp, nonce, signature } = signIntranetBody(url, body, secret);
  const response = await axios.post<{ success?: unknown; data?: unknown }>(
    url,
    body,
    {
      timeout: 10000,
      headers: {
        "X-Requisite-Timestamp": timestamp,
        "X-Requisite-Nonce": nonce,
        "X-Requisite-Signature": signature,
        "Content-Type": "application/json",
      },
    }
  );
  logIntranetHttpExchange("email_lookup", response.config, response);
  if (response.data.success !== true) {
    throw new IntranetInvalidResponseError(
      "Intranet returned an unsuccessful profile response"
    );
  }
  return response.data.data;
};

const signIntranetBody = (
  url: string,
  body: string,
  secret: string
): ReturnType<typeof createIntranetRequestSignature> => {
  try {
    return createIntranetRequestSignature(url, body, secret);
  } catch (error) {
    throw new IntranetConfigurationError(
      error instanceof Error ? error.message : "Invalid intranet endpoint configuration"
    );
  }
};

const syncIntranetStaffUser = async (
  intranetUser: AuthenticatedIntranetUser
): Promise<any> => {
  const mappedData = await mapIntranetUserData(intranetUser, true);
  const user =
    (await getLocalUserByEmployeeId(mappedData.userId)) ||
    (await getLocalUserByEmail(mappedData.email));
  if (!user) {
    return createUserFromIntranetData(mappedData);
  }
  if (user.employeeId !== mappedData.userId) {
    user.employeeId = mappedData.userId;
    await user.save();
  }
  return updateUserFromIntranetData(user, mappedData);
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

    // Validate required fields
    if (!userId) {
      res.status(400).json({
        success: false,
        message: "Please provide user ID",
      });
      return;
    }

    const normalizedUserId = String(userId).trim();

    // Helper to attempt database fallback authentication
    const tryDatabaseFallback = async (): Promise<boolean> => {
      try {
        console.log(`Intranet service failed/unavailable. Attempting database auth fallback for userId: ${normalizedUserId}`);
        
        const user = await db.query.users.findFirst({
          where: eq(users.employeeId, normalizedUserId),
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

          loginUserLocally(user, normalizedUserId, res, true);
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

    // Create the authentication string: dateString + normalizedUserId
    const authString = `${dateString}${normalizedUserId}`;

    // Generate MD5 hash for authentication and bypass string
    const authStringHash = crypto
      .createHash("md5")
      .update(authString)
      .digest("hex");

    // Intranet salt / bypass key (defaults to environment variable or "iGNOre")
    const bypassToken =
      (typeof bypass === "string" && bypass.trim()) ||
      process.env.INTRANET_BYPASS ||
      "iGNOre";

    const bypassHash = crypto
      .createHash("md5")
      .update(bypassToken)
      .digest("hex");

    // Generate MD5 hash for userpass
    const md5Hash = `${authStringHash}${bypassHash}`;

    // Prepare intranet URL
    const intranetUrl =
      process.env.INTRANET_AUTH_URL || "https://daystarng.org/";
    const fullUrl = `${intranetUrl}intranet2_09052025/Api/getstaff_dets?user_id=${encodeURIComponent(normalizedUserId)}&userpass=${md5Hash}`;
    let intranetUser: IntranetUserResponse | null = null;
    let intranetFailed = false;
    console.log(fullUrl);

    try {
      // Call intranet authentication service
      const response = await axios.get(fullUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Requisition-System/1.0",
        },
      });

      if (response.status === 200 && response.data && typeof response.data === "object") {
        intranetUser = response.data as IntranetUserResponse;
      } else {
        intranetFailed = true;
      }
    } catch (intranetReqError: any) {
      console.warn("Intranet authentication request error:", intranetReqError.message || intranetReqError);
      intranetFailed = true;
    }

    // If intranet returned valid user data, proceed with intranet login
    if (
      intranetUser &&
      intranetUser.user_id &&
      intranetUser.first_name &&
      intranetUser.last_name
    ) {
      // Verify that the returned user_id matches the requested userId
      if (String(intranetUser.user_id).trim() !== normalizedUserId) {
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

      // Complete login locally with Intranet (not fallback)
      if (!user.isActive) {
        respondAuthError(
          res,
          403,
          "ACCOUNT_INACTIVE",
          "This intranet staff account is inactive"
        );
        return;
      }
      loginUserLocally(user, normalizedUserId, res, false);
      return;
    }

    // If intranet failed or returned invalid response, attempt database fallback
    if (intranetFailed || !intranetUser) {
      if (await tryDatabaseFallback()) {
        return;
      }
    }

    res.status(401).json({
      success: false,
      message: "Invalid credentials or authentication service unavailable",
    });
    return;
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};

/**
 * @desc Login a locally provisioned user with email and password
 * @route POST /api/auth/email-login
 * @access Public
 */
export const emailPasswordLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const password = req.body.password as string;
    let intranetProfile: unknown;

    try {
      intranetProfile = await authenticateIntranetEmail(email, password);
    } catch (error) {
      logIntranetErrorExchange("email_auth", error);
      if (error instanceof IntranetConfigurationError) {
        respondAuthError(
          res,
          503,
          "INTRANET_AUTH_NOT_CONFIGURED",
          "Intranet authentication is not configured; set the shared signing secret on the backend"
        );
        return;
      }
      const failure = getIntranetFailure(error);
      if (failure?.status === 401 && failure.code === "invalid_signature") {
        respondAuthError(
          res,
          502,
          "INTRANET_SIGNATURE_INVALID",
          "The intranet rejected the request signature; check shared signing configuration"
        );
        return;
      }
      if (failure?.status === 401 && failure.code === "invalid_credentials") {
        respondAuthError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
        return;
      }
      if (failure?.status === 403) {
        const body = error as { response?: { data?: { data?: unknown } } };
        const profile = body.response?.data?.data;
        if (
          !isIntranetStaffProfile(profile) ||
          profile.email.trim().toLowerCase() !== email ||
          profile.is_active !== false
        ) {
          respondAuthError(
            res,
            502,
            "INTRANET_PROFILE_INVALID",
            "The intranet did not return a valid inactive staff profile"
          );
          return;
        }
        await syncIntranetStaffUser(profile);
        respondAuthError(
          res,
          403,
          "ACCOUNT_INACTIVE",
          "This intranet staff account is inactive"
        );
        return;
      }
      if (failure?.status === 404) {
        respondAuthError(
          res,
          401,
          "INTRANET_ACCOUNT_NOT_FOUND",
          "No intranet account matches this email address"
        );
        return;
      }
      if (failure?.status === 409) {
        respondAuthError(
          res,
          409,
          "INTRANET_EMAIL_AMBIGUOUS",
          "More than one intranet account matches this email address"
        );
        return;
      }
      if (
        failure?.status === 401 ||
        (failure && failure.status < 500 && failure.status !== 403 && failure.status !== 404 && failure.status !== 409)
      ) {
        respondAuthError(
          res,
          502,
          "INTRANET_AUTHENTICATION_FAILED",
          "The intranet could not validate the authentication request"
        );
        return;
      }
      if (error instanceof IntranetInvalidResponseError) {
        respondAuthError(
          res,
          502,
          "INTRANET_PROFILE_INVALID",
          "The intranet authentication service returned an invalid response"
        );
        return;
      }
      if (!intranetServiceUnavailable(error)) {
        respondAuthError(
          res,
          502,
          "INTRANET_AUTHENTICATION_FAILED",
          "The intranet authentication service could not validate this login"
        );
        return;
      }

      const localUser = await getLocalUserByEmail(email);
      if (!localUser) {
        respondAuthError(
          res,
          503,
          "INTRANET_UNAVAILABLE_NO_LOCAL_ACCOUNT",
          "The intranet is unavailable and this account has not logged in to Requisite before"
        );
        return;
      }
      if (!localUser.isActive) {
        respondAuthError(
          res,
          403,
          "ACCOUNT_INACTIVE",
          "This account is inactive in the local Requisite database"
        );
        return;
      }
      if (!(await localUser.comparePassword(password))) {
        respondAuthError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
        return;
      }
      sendEmailLoginSuccess(localUser, res, true);
      return;
    }

    if (
      !isIntranetStaffProfile(intranetProfile) ||
      intranetProfile.email.trim().toLowerCase() !== email
    ) {
      respondAuthError(
        res,
        502,
        "INTRANET_PROFILE_INVALID",
        "The intranet authentication service returned an invalid staff profile"
      );
      return;
    }

    let user = await syncIntranetStaffUser(intranetProfile);
    if (!user.isActive) {
      respondAuthError(
        res,
        403,
        "ACCOUNT_INACTIVE",
        "This intranet staff account is inactive"
      );
      return;
    }
    if (!(await user.comparePassword(password))) {
      user = await User.findByIdAndUpdate(user._id || user.id, { password });
      user = await User.findById(user._id || user.id).populate("department", "name");
    }
    sendEmailLoginSuccess(user, res, false);
  } catch (error) {
    next(error);
  }
};

const sendEmailLoginSuccess = (
  user: any,
  res: Response,
  fallback: boolean
): void => {
  const token = generateToken(user as IUser);
  res.cookie("token", token, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id || user.id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      isActive: user.isActive,
    },
    message: fallback ? "Login successful (Database Fallback)" : "Login successful",
    ...(fallback ? { authenticationSource: "local-fallback" } : {}),
  });
};

const getGoogleOAuthConfiguration = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return null;
  }
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
};

const getAllowedGoogleFrontendOrigins = (): string[] =>
  [
    ...(process.env.GOOGLE_AUTH_FRONTEND_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => new URL(origin).origin),
    ...(process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3004", "http://127.0.0.1:3004"]),
  ];

const sendGooglePopupResult = (
  res: Response,
  frontendOrigin: string,
  result: Record<string, unknown>,
  status = 200
): void => {
  const serializedResult = JSON.stringify(result).replace(/</g, "\\u003c");
  const serializedOrigin = JSON.stringify(frontendOrigin);
  const scriptNonce = crypto.randomBytes(18).toString("base64");
  res
    .status(status)
    .type("html")
    .set(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'nonce-${scriptNonce}'; base-uri 'none'; frame-ancestors 'none'`
    )
    .send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Google sign-in</title></head>
  <body>
    <p>Completing sign-in…</p>
    <script nonce="${scriptNonce}">
      if (window.opener) {
        window.opener.postMessage(${serializedResult}, ${serializedOrigin});
        window.close();
      } else {
        document.body.textContent = "Sign-in complete. You can close this window.";
      }
    </script>
  </body>
</html>`);
};

const closeGooglePopup = (res: Response, status: number): void => {
  const scriptNonce = crypto.randomBytes(18).toString("base64");
  res
    .status(status)
    .type("html")
    .set(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'nonce-${scriptNonce}'; base-uri 'none'; frame-ancestors 'none'`
    )
    .send(`<!doctype html><html lang="en"><body>
<p>Google sign-in could not be completed. Close this window and try again.</p>
<script nonce="${scriptNonce}">window.close()</script>
</body></html>`);
};

const respondGooglePopupError = (
  res: Response,
  frontendOrigin: string | undefined,
  status: number,
  code: string,
  detail: string
): void => {
  if (frontendOrigin) {
    sendGooglePopupResult(
      res,
      frontendOrigin,
      { type: "requisite:google-auth", success: false, code, detail },
      status
    );
    return;
  }
  respondAuthError(res, status, code, detail);
};

/**
 * @desc Start Google OpenID Connect login
 * @route GET /api/auth/google
 * @access Public
 */
export const startGoogleLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestedOrigin = req.query.frontendOrigin;
  let frontendOrigin: string | undefined;
  if (typeof requestedOrigin === "string") {
    try {
      const parsedOrigin = new URL(requestedOrigin);
      if (
        parsedOrigin.origin !== requestedOrigin ||
        !getAllowedGoogleFrontendOrigins().includes(parsedOrigin.origin)
      ) {
        closeGooglePopup(res, 400);
        return;
      }
      frontendOrigin = parsedOrigin.origin;
    } catch (error) {
      if (error instanceof TypeError) {
        closeGooglePopup(res, 400);
        return;
      }
      next(error);
      return;
    }
  }

  const config = getGoogleOAuthConfiguration();
  const jwtSecret = process.env.JWT_SECRET;
  if (!config || !jwtSecret) {
    respondGooglePopupError(
      res,
      frontendOrigin,
      503,
      "GOOGLE_AUTH_NOT_CONFIGURED",
      "Google authentication is not configured"
    );
    return;
  }

  try {
    const nonce = crypto.randomBytes(32).toString("hex");
    const state = jwt.sign(
      { purpose: "google-oauth-state", nonce, frontendOrigin },
      jwtSecret,
      { expiresIn: "10m" }
    );
    res.cookie("google_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/api/auth/google",
    });
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      prompt: "select_account",
    }).toString();
    res.redirect(authorizationUrl.toString());
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Complete Google login and retrieve the authoritative staff profile
 * @route GET /api/auth/google/callback
 * @access Public
 */
export const completeGoogleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  const config = getGoogleOAuthConfiguration();
  const jwtSecret = process.env.JWT_SECRET;
  if (!config || !jwtSecret) {
    res.status(503).json({
      success: false,
      message: "Google authentication is not configured",
    });
    return;
  }
  const code = req.query.code;
  const state = req.query.state;
  const googleError = req.query.error;
  if (
    (typeof code !== "string" && typeof googleError !== "string") ||
    typeof state !== "string"
  ) {
    res.status(400).json({
      success: false,
      message: "Google authorization code and state are required",
    });
    return;
  }

  let expectedNonce: string;
  let frontendOrigin: string | undefined;
  try {
    const decoded = jwt.verify(state, jwtSecret);
    if (
      typeof decoded === "string" ||
      decoded.purpose !== "google-oauth-state" ||
      typeof decoded.nonce !== "string"
    ) {
      throw new Error("Invalid OAuth state");
    }
    expectedNonce = decoded.nonce;
    if (typeof decoded.frontendOrigin === "string") {
      const candidate = new URL(decoded.frontendOrigin);
      if (
        candidate.origin !== decoded.frontendOrigin ||
        !getAllowedGoogleFrontendOrigins().includes(candidate.origin)
      ) {
        throw new Error("Invalid Google frontend origin");
      }
      frontendOrigin = candidate.origin;
    }
  } catch {
    closeGooglePopup(res, 400);
    return;
  }
  const cookieNonce = req.cookies?.google_oauth_nonce;
  res.clearCookie("google_oauth_nonce", { path: "/api/auth/google" });
  if (typeof cookieNonce !== "string" || cookieNonce !== expectedNonce) {
    respondGooglePopupError(
      res,
      frontendOrigin,
      400,
      "GOOGLE_STATE_MISMATCH",
      "Google OAuth state does not match this browser session"
    );
    return;
  }
  if (typeof googleError === "string") {
    respondGooglePopupError(
      res,
      frontendOrigin,
      401,
      "GOOGLE_SIGN_IN_CANCELLED",
      "Google sign-in was cancelled or denied"
    );
    return;
  }
  const fail = (status: number, code: string, detail: string): void =>
    respondGooglePopupError(res, frontendOrigin, status, code, detail);

  try {
    if (typeof code !== "string") {
      fail(400, "GOOGLE_CODE_MISSING", "Google did not return an authorization code");
      return;
    }
    const tokenResponse = await axios.post<{
      id_token?: string;
    }>(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
      {
        timeout: 10000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    if (!tokenResponse.data.id_token) {
      fail(502, "GOOGLE_ID_TOKEN_MISSING", "Google did not return an ID token");
      return;
    }

    const identityResponse = await axios.get<Record<string, unknown>>(
      "https://oauth2.googleapis.com/tokeninfo",
      {
        params: { id_token: tokenResponse.data.id_token },
        timeout: 10000,
      }
    );
    const identity = identityResponse.data;
    const email =
      typeof identity.email === "string" ? identity.email.trim().toLowerCase() : "";
    const expiresAt = Number(identity.exp);
    const verifiedEmail =
      identity.email_verified === true || identity.email_verified === "true";
    const validIssuer =
      identity.iss === "accounts.google.com" ||
      identity.iss === "https://accounts.google.com";
    if (
      identity.aud !== config.clientId ||
      identity.nonce !== expectedNonce ||
      !validIssuer ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Math.floor(Date.now() / 1000) ||
      !verifiedEmail ||
      !email
    ) {
      fail(401, "GOOGLE_IDENTITY_INVALID", "Google identity could not be verified");
      return;
    }

    let intranetProfile: unknown;
    try {
      intranetProfile = await lookupIntranetEmail(email);
    } catch (error) {
      logIntranetErrorExchange("email_lookup", error);
      if (error instanceof IntranetConfigurationError) {
        fail(
          503,
          "INTRANET_AUTH_NOT_CONFIGURED",
          "Intranet authentication is not configured; set the shared signing secret on the backend"
        );
        return;
      }
      const failure = getIntranetFailure(error);
      if (failure?.status === 401) {
        fail(502, "INTRANET_SIGNATURE_INVALID", "The intranet rejected the request signature; check shared signing configuration");
        return;
      }
      if (failure?.status === 404) {
        fail(401, "INTRANET_ACCOUNT_NOT_FOUND", "No intranet account matches this Google email");
        return;
      }
      if (failure?.status === 409) {
        fail(409, "INTRANET_EMAIL_AMBIGUOUS", "More than one intranet account matches this email address");
        return;
      }
      if (failure && failure.status < 500) {
        fail(502, "INTRANET_LOOKUP_FAILED", "The intranet could not complete the staff profile lookup");
        return;
      }
      if (error instanceof IntranetInvalidResponseError) {
        fail(502, "INTRANET_PROFILE_INVALID", "The intranet email lookup returned an invalid response");
        return;
      }
      if (!intranetServiceUnavailable(error)) {
        fail(502, "INTRANET_LOOKUP_FAILED", "The intranet could not complete the staff profile lookup");
        return;
      }
      const localUser = await getLocalUserByEmail(email);
      if (!localUser) {
        fail(503, "INTRANET_UNAVAILABLE_NO_LOCAL_ACCOUNT", "The intranet is unavailable and this account has not logged in to Requisite before");
        return;
      }
      if (!localUser.isActive) {
        fail(403, "ACCOUNT_INACTIVE", "This account is inactive in the local Requisite database");
        return;
      }
      loginUserLocally(localUser, localUser.employeeId, res, true, frontendOrigin);
      return;
    }
    if (!isIntranetStaffProfile(intranetProfile)) {
      fail(502, "INTRANET_PROFILE_INVALID", "The intranet email lookup returned an invalid staff profile");
      return;
    }
    const intranetUser = intranetProfile;
    if (
      typeof intranetUser.email !== "string" ||
      intranetUser.email.trim().toLowerCase() !== email
    ) {
      fail(401, "INTRANET_EMAIL_MISMATCH", "Google email does not match the intranet staff profile");
      return;
    }
    const user = await syncIntranetStaffUser(intranetUser);

    if (!user.isActive) {
      fail(403, "ACCOUNT_INACTIVE", "This intranet staff account is inactive");
      return;
    }
    loginUserLocally(user, user.employeeId, res, false, frontendOrigin);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Google or intranet authentication request failed:", error.message);
      fail(502, "GOOGLE_AUTHENTICATION_FAILED", "Google authentication failed");
      return;
    }
    next(error);
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
  intranetUser: IntranetUserResponse,
  useIntranetEmail = false
): Promise<MappedUserData> {
  // Clean first name and last name by removing 'pastor'
  const cleanFirstName = intranetUser.first_name
    .replace(/pastor\s*/gi, "")
    .trim();
  const cleanLastName = intranetUser.last_name
    .replace(/pastor\s*/gi, "")
    .trim();

  // Generate email from cleaned user data
  const email =
    (useIntranetEmail && intranetUser.email?.trim().toLowerCase()) ||
    `${cleanFirstName.toLowerCase()}${cleanLastName.toLowerCase()}@daystarng.org`;

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
    isActive: intranetUser.is_active,
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
      isActive: mappedData.isActive ?? true,
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
  if (mappedData.isActive !== undefined) {
    user.isActive = mappedData.isActive;
  }
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
