import swaggerJsdoc from "swagger-jsdoc";
import authRoutes from "../src/routes/auth.routes";
import userRoutes from "../src/routes/user.routes";
import departmentRoutes from "../src/routes/department.routes";
import vendorRoutes from "../src/routes/vendor.routes";
import vendorCategoryRoutes from "../src/routes/vendorCategory.routes";
import requisitionRoutes from "../src/routes/requisition.routes";
import rfqRoutes from "../src/routes/rfq.routes";
import grnRoutes from "../src/routes/grn.routes";
import jcfRoutes from "../src/routes/jcf.routes";
import purchaseOrderRoutes from "../src/routes/purchaseOrder.routes";
import locationRoutes from "../src/routes/location.routes";
import notificationRoutes from "../src/routes/notification.routes";

interface RouteInfo {
  method: string;
  path: string;
}

function extractRouterRoutes(prefix: string, router: any): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const stack = router.stack || [];

  stack.forEach((layer: any) => {
    if (layer.route) {
      const subPath = layer.route.path;
      const fullPath = (prefix + (subPath === "/" ? "" : subPath)).replace(/\/+/g, "/");
      const methods = Object.keys(layer.route.methods || {});
      methods.forEach((m) => {
        routes.push({
          method: m.toUpperCase(),
          path: fullPath,
        });
      });
    }
  });

  return routes;
}

const mountedRouters = [
  { prefix: "/api/auth", router: authRoutes },
  { prefix: "/api/users", router: userRoutes },
  { prefix: "/api/departments", router: departmentRoutes },
  { prefix: "/api/vendors", router: vendorRoutes },
  { prefix: "/api/vendor-categories", router: vendorCategoryRoutes },
  { prefix: "/api/categories", router: vendorCategoryRoutes },
  { prefix: "/api/requisitions", router: requisitionRoutes },
  { prefix: "/api", router: rfqRoutes },
  { prefix: "/api", router: grnRoutes },
  { prefix: "/api", router: jcfRoutes },
  { prefix: "/api/requisitions", router: purchaseOrderRoutes },
  { prefix: "/api/purchase-orders", router: purchaseOrderRoutes },
  { prefix: "/api/rfqs", router: purchaseOrderRoutes },
  { prefix: "/api/locations", router: locationRoutes },
  { prefix: "/api/notifications", router: notificationRoutes },
];

const allAppRoutes: RouteInfo[] = [];
mountedRouters.forEach(({ prefix, router }) => {
  allAppRoutes.push(...extractRouterRoutes(prefix, router));
});

console.log(`Total active API endpoints in routers: ${allAppRoutes.length}`);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Daystar Requisition Management API",
      version: "1.0.0",
      description: "API documentation",
    },
  },
  apis: ["./src/routes/*.ts"],
};

const spec: any = swaggerJsdoc(swaggerOptions);
const specPaths = spec.paths || {};

function normalizePath(p: string): string {
  return p.replace(/:([a-zA-Z0-9_]+)/g, "{$1}").replace(/\/$/, "");
}

let matchedCount = 0;
const missingInSwagger: RouteInfo[] = [];

allAppRoutes.forEach((r) => {
  const norm = normalizePath(r.path);
  const specPathObj = specPaths[norm] || specPaths[norm + "/"];
  if (specPathObj && specPathObj[r.method.toLowerCase()]) {
    matchedCount++;
  } else {
    missingInSwagger.push(r);
  }
});

console.log(`\nMatched with Swagger: ${matchedCount} / ${allAppRoutes.length}`);
if (missingInSwagger.length > 0) {
  console.log("\nEndpoints in code not documented or path mismatched in Swagger:");
  // Deduplicate
  const unique = new Map<string, RouteInfo>();
  missingInSwagger.forEach((m) => unique.set(`${m.method} ${m.path}`, m));
  unique.forEach((u) => {
    console.log(`  - ${u.method.padEnd(7)} ${u.path}  -->  Normalized: ${normalizePath(u.path)}`);
  });
} else {
  console.log("All active API endpoints are documented in Swagger!");
}
