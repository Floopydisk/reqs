import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { version } from "../package.json";

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
  },
  apis: [
    "./src/routes/*.ts",
  ],
};

try {
  const spec: any = swaggerJsdoc(options);
  const paths = Object.keys(spec.paths || {});
  console.log(`✅ Swagger spec successfully generated with ${paths.length} total endpoints!`);
  console.log("\nRegistered OpenAPI Paths:");
  paths.sort().forEach((p) => {
    const methods = Object.keys(spec.paths[p]).map(m => m.toUpperCase()).join(", ");
    console.log(`  ${methods.padEnd(12)} ${p}`);
  });

  // Verify key feedback endpoints are present
  const requiredEndpoints = [
    "/api/requisitions/eligible-approvers",
    "/api/purchase-orders/{poId}/jcf",
    "/api/jcfs",
    "/api/jcfs/{id}",
    "/api/jcfs/{id}/approve",
    "/api/jcfs/{id}/reject",
    "/api/jcfs/{id}/pdf",
    "/api/vendors/{id}/approve",
    "/api/purchase-orders/{id}/pdf",
    "/api/grns/{grnId}/pm-confirm",
    "/api/grns/{grnId}/receiver-confirm",
  ];

  console.log("\nChecking critical feedback endpoints in Swagger Spec:");
  for (const endpoint of requiredEndpoints) {
    if (spec.paths[endpoint]) {
      console.log(`  ✅ Found: ${endpoint}`);
    } else {
      console.error(`  ❌ Missing endpoint in Swagger spec: ${endpoint}`);
      throw new Error(`Missing endpoint in Swagger spec: ${endpoint}`);
    }
  }

  console.log("\n✅ ALL SWAGGER DOCUMENTATION CHECKS PASSED!");
} catch (error) {
  console.error("Swagger generation error:", error);
  process.exit(1);
}
