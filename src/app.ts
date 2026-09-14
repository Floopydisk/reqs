import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import compression from "compression";
import { config } from "dotenv";
import { join } from "path";
import fs from "fs";
import { setupSwagger } from "./config/swagger";
import { connectDB as connectDatabase } from "./config/database";
import { initializeScheduler } from "./utils/scheduler";

// Load environment variables
config();

// Ensure uploads directory exists
const uploadsDir = join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory:", uploadsDir);
}

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import departmentRoutes from "./routes/department.routes";
import vendorRoutes from "./routes/vendor.routes"; // Vendor Master for RFQ workflow
import vendorCategoryRoutes from "./routes/vendorCategory.routes"; // Vendor categories for Vendor Master
import requisitionRoutes from "./routes/requisition.routes";
import rfqRoutes from "./routes/rfq.routes"; // New RFQ routes
import grnRoutes from "./routes/grn.routes"; // New GRN routes
import jcfRoutes from "./routes/jcf.routes"; // JCF routes for service POs
import purchaseOrderRoutes from "./routes/purchaseOrder.routes";
import commentRoutes from "./routes/comment.routes";
import diagnosticRoutes from "./routes/diagnostic.routes";
import notificationRoutes from "./routes/notification.routes";
import locationRoutes from "./routes/location.routes";

// Create Express app
const app = express();

// Set up Swagger documentation
setupSwagger(app);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Set security HTTP headers
app.use(helmet());

// Enable CORS - Allow all origins during development, with credentials and preflight handling
const corsOptions: CorsOptions = {
  origin: true, // reflect request origin
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Disposition"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 10000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      "status",
      "priority",
      "startDate",
      "endDate",
      "department",
      "requester",
      "vendorCategory",
    ],
  }),
);

// Compression
app.use(compression());

// Serve static files
app.use(express.static(join(__dirname, "..", "public")));

// Temporary CORS debug endpoint (remove after debugging)
app.all("/cors-debug", (req: Request, res: Response) => {
  // Add debug headers and expose them so browsers can read
  res.setHeader("X-Debug-Server", "requisitionpro");
  res.setHeader("X-Debug-Received-Origin", String(req.headers.origin || ""));
  res.setHeader("X-Debug-Node-Env", String(process.env.NODE_ENV || ""));
  res.setHeader("X-Debug-Server-Time", new Date().toISOString());

  const existingExpose = res.getHeader("Access-Control-Expose-Headers");
  const exposeList = [
    typeof existingExpose === "string" ? existingExpose : undefined,
    "X-Debug-Server",
    "X-Debug-Received-Origin",
    "X-Debug-Node-Env",
    "X-Debug-Server-Time",
  ]
    .filter(Boolean)
    .join(", ");
  if (exposeList) res.setHeader("Access-Control-Expose-Headers", exposeList);

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    // Let CORS middleware attach preflight headers; return empty 204
    res.status(204).end();
    return;
  }

  res.status(200).json({
    success: true,
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin || null,
    request: {
      headers: req.headers,
      query: req.query,
      cookies: (req as any).cookies || {},
    },
    response: {
      headers: {
        "access-control-allow-origin": res.getHeader(
          "Access-Control-Allow-Origin",
        ),
        "access-control-allow-credentials": res.getHeader(
          "Access-Control-Allow-Credentials",
        ),
        "access-control-allow-methods": res.getHeader(
          "Access-Control-Allow-Methods",
        ),
        "access-control-allow-headers": res.getHeader(
          "Access-Control-Allow-Headers",
        ),
        "access-control-expose-headers": res.getHeader(
          "Access-Control-Expose-Headers",
        ),
        vary: res.getHeader("Vary"),
      },
    },
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/vendors", vendorRoutes); // Vendor Master for RFQ workflow
app.use("/api/vendor-categories", vendorCategoryRoutes); // Categories for Vendor Master
// Compatibility alias for inline category creation in vendor forms. The router
// retains the same authorization and validation rules as /api/vendor-categories.
app.use("/api/categories", vendorCategoryRoutes);
app.use("/api/requisitions", requisitionRoutes);
app.use("/api", rfqRoutes); // Handles both /api/rfqs/* and /api/requisitions/:id/rfqs
app.use("/api", grnRoutes); // Handles both /api/grns/* and /api/purchase-orders/:id/grns
app.use("/api", jcfRoutes); // Handles both /api/jcfs/* and /api/purchase-orders/:id/jcf
app.use("/api/requisitions", purchaseOrderRoutes); // Handles /api/requisitions/:id/purchase-orders
app.use("/api/purchase-orders", purchaseOrderRoutes); // Standalone PO routes: /api/purchase-orders/*
app.use("/api/rfqs", purchaseOrderRoutes); // Handles /api/rfqs/:rfqId/purchase-order
app.use("/api/diagnostics", diagnosticRoutes);
app.use("/api/locations", locationRoutes);

// Register notification routes
app.use("/api/notifications", notificationRoutes);

// Register comment routes for requisitions only
app.use("/api/requisitions/:requisitionId/comments", commentRoutes);
// Direct access to comments (for editing, deleting, and thread access)
app.use("/api/comments", commentRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Requisition Management API",
    version: "4.2.1",
    documentation: "/api-docs",
    health: "/health",
  });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes (Express 5 compatible)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Database connection and scheduler initialization
// (These are called from server.ts, not here)
export const initializeApp = async () => {
  await connectDatabase();
  initializeScheduler();
};

export default app;
