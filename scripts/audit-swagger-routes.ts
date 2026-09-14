import swaggerJsdoc from "swagger-jsdoc";
import app from "../src/app";

// Extract all registered express routes from app
function getExpressRoutes(expressApp: any): { method: string; path: string }[] {
  const routes: { method: string; path: string }[] = [];

  function print(path: string[], layer: any) {
    if (layer.route) {
      layer.route.stack.forEach((stackLayer: any) => {
        const method = stackLayer.method;
        if (method) {
          routes.push({
            method: method.toUpperCase(),
            path: ("/" + path.concat(layer.route.path.replace(/^\//, "")).filter(Boolean).join("/")).replace(/\/+/g, "/"),
          });
        }
      });
    } else if (layer.name === "router" && layer.handle.stack) {
      let routerPath = "";
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace("^\\", "")
          .replace("\\/?(?=\\/|$)", "")
          .replace("?(?=\\/|$)", "")
          .replace(/\\\//g, "/")
          .replace(/\^/g, "")
          .replace(/\$/g, "");
        routerPath = match;
      }
      layer.handle.stack.forEach((stackLayer: any) => {
        print(path.concat(routerPath), stackLayer);
      });
    }
  }

  const stack = expressApp.router?.stack || expressApp._router?.stack || [];
  stack.forEach((layer: any) => {
    print([], layer);
  });

  return routes;
}

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

console.log("=== COMPREHENSIVE SWAGGER & ROUTE AUDIT ===");

const issues: string[] = [];

// 1. Audit Parameters in Spec
const paths = Object.keys(spec.paths || {});
console.log(`Auditing ${paths.length} documented paths in OpenAPI spec...`);

paths.forEach((p) => {
  const pathObj = spec.paths[p];
  // extract path variables like {id}, {poId}, etc.
  const pathVars = (p.match(/\{([^}]+)\}/g) || []).map((v) => v.slice(1, -1));

  Object.keys(pathObj).forEach((method) => {
    if (["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())) {
      const op = pathObj[method];
      const opParams = op.parameters || [];
      const declaredPathParams = opParams
        .filter((param: any) => param.in === "path")
        .map((param: any) => param.name);

      // Check missing path parameters
      pathVars.forEach((pv) => {
        if (!declaredPathParams.includes(pv)) {
          issues.push(
            `[Path Parameter Missing] In ${method.toUpperCase()} ${p}: Path template has '{${pv}}', but parameter is not declared with 'in: path' in Swagger docs!`
          );
        }
      });

      // Check responses
      if (!op.responses || Object.keys(op.responses).length === 0) {
        issues.push(`[No Responses] In ${method.toUpperCase()} ${p}: No responses defined!`);
      }

      // Check summaries/descriptions
      if (!op.summary && !op.description) {
        issues.push(`[No Description] In ${method.toUpperCase()} ${p}: Neither summary nor description provided!`);
      }
    }
  });
});

console.log(`OpenAPI Parameter & Response issues found: ${issues.length}`);
issues.forEach((iss) => console.log(" - " + iss));

// 2. Check Express route coverage
const expressRoutes = getExpressRoutes(app);
console.log(`\nFound ${expressRoutes.length} active Express routes.`);

// Normalize express route path (:id -> {id})
function normalizeExpressPath(ep: string): string {
  return ep.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
}

// Check how many express routes match swagger paths
let matched = 0;
const unmatched: { method: string; path: string }[] = [];

expressRoutes.forEach((er) => {
  if (er.path.startsWith("/api/")) {
    const normalized = normalizeExpressPath(er.path);
    const specPath = spec.paths[normalized];
    if (specPath && specPath[er.method.toLowerCase()]) {
      matched++;
    } else {
      unmatched.push(er);
    }
  }
});

console.log(`Express /api/ routes documented in Swagger: ${matched}`);
console.log(`Unmatched or undocumented Express /api/ routes: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log("\nDetails of undocumented or misnamed routes:");
  unmatched.forEach((u) => {
    console.log(` - ${u.method.padEnd(7)} ${u.path} (normalized: ${normalizeExpressPath(u.path)})`);
  });
}
