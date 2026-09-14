import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { version } from "../../package.json";


const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Daystar Requisition Management API",
      version,
      description: "API documentation for the Requisition Management Platform",
      contact: {
        name: "API Support",
        email: "adeyemosamuel@gmail.com",
      },
    },
    tags: [
      {
        name: "Auth",
        description: "User authentication and authorization endpoints",
      },
      {
        name: "Requisitions",
        description: "Requisition management endpoints - CRUD operations",
      },
      {
        name: "Requisitions - Item Approval",
        description:
          "Item-level approval workflows (HOD & HR) - replaces old Items category",
      },
      {
        name: "Requisitions - Finance Approval",
        description:
          "Requisition approval and payment operations available to the Head of Finance",
      },
      {
        name: "Requisitions - Procurement",
        description: "Procurement Manager review and RFQ generation",
      },
      {
        name: "Requisitions - Payment",
        description: "Payment tracking and status management",
      },
      {
        name: "RFQ",
        description: "Request for Quotation (RFQ) management - NEW WORKFLOW",
      },
      {
        name: "Purchase Orders",
        description: "Purchase Order management with approval workflow",
      },
      {
        name: "Purchase Orders - Approval",
        description: "PO approval chain (Head of Finance → Head of HR)",
      },
      {
        name: "GRN",
        description: "Goods Received Note (GRN) management for product deliverables",
      },
      {
        name: "JCF",
        description: "Job Completion Form (JCF) management for service deliverables",
      },
      {
        name: "Vendors",
        description: "Vendor directory, registration, CAC document uploads, and HR approvals",
      },
      {
        name: "Vendor Categories",
        description: "Vendor category classification and management",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Departments",
        description: "Department management endpoints",
      },
      {
        name: "Locations",
        description: "Location management endpoints",
      },
      {
        name: "Notifications",
        description: "Notification endpoints",
      },
      {
        name: "Comments",
        description: "Comment management endpoints",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./dist/routes/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
