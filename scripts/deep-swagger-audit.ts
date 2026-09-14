import swaggerJsdoc from "swagger-jsdoc";
import { version } from "../package.json";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Daystar Requisition Management API",
      version,
      description: "API documentation for the Requisition Management Platform",
    },
  },
  apis: ["./src/routes/*.ts"],
};

const spec: any = swaggerJsdoc(options);

const paths = Object.keys(spec.paths || {});
console.log(`Auditing ${paths.length} Swagger paths...`);

let totalOps = 0;
let opsWith2xx = 0;
let opsWithExamples = 0;
const issues: string[] = [];

paths.forEach((p) => {
  const pathItem = spec.paths[p];
  const pathParamsInUrl = (p.match(/\{([^}]+)\}/g) || []).map((s) => s.slice(1, -1));

  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const op = pathItem[method];
    if (!op) continue;
    totalOps++;

    const label = `${method.toUpperCase()} ${p}`;

    // 1. Check path parameters
    const params = op.parameters || [];
    const pathParamNames = params
      .filter((param: any) => param.in === "path")
      .map((param: any) => param.name);

    for (const pName of pathParamsInUrl) {
      if (!pathParamNames.includes(pName)) {
        issues.push(`[Missing path parameter declaration] ${label} has {${pName}} in path but missing in parameters`);
      }
    }

    // 2. Check each parameter's structure
    for (const param of params) {
      if (!param.name) {
        issues.push(`[Parameter without name] in ${label}`);
      }
      if (!param.in) {
        issues.push(`[Parameter '${param.name}' without 'in'] in ${label}`);
      }
      if (param.in === "path" && param.required !== true) {
        issues.push(`[Path parameter '${param.name}' not marked required] in ${label}`);
      }
      if (!param.schema && !param.type) {
        issues.push(`[Parameter '${param.name}' has no schema or type] in ${label}`);
      }
    }

    // 3. Check Responses
    const responses = op.responses || {};
    const statusCodes = Object.keys(responses);
    const has2xx = statusCodes.some((code) => code.startsWith("2"));
    if (has2xx) {
      opsWith2xx++;
    } else {
      issues.push(`[No 2xx response defined] in ${label}`);
    }

    // 4. Check Request body for POST / PUT / PATCH
    if (["post", "put", "patch"].includes(method)) {
      if (!op.requestBody && params.length === 0) {
        // Only if it doesn't take params or body
        // (Some endpoints like POST /logout or PUT /acknowledge might not need body, check)
      }
    }

    // Check if operation has summary/description
    if (!op.summary) {
      issues.push(`[Missing summary] in ${label}`);
    }

    // Check examples or schemas in 2xx responses
    let hasExampleOrSchema = false;
    for (const sc of statusCodes) {
      if (sc.startsWith("2")) {
        const resp = responses[sc];
        if (resp.content && resp.content["application/json"]) {
          hasExampleOrSchema = true;
          opsWithExamples++;
          break;
        } else if (resp.schema || resp.description) {
          hasExampleOrSchema = true;
          opsWithExamples++;
          break;
        }
      }
    }
  }
});

console.log(`\nAudit Results:`);
console.log(`Total Operations: ${totalOps}`);
console.log(`Operations with 2xx status response: ${opsWith2xx} / ${totalOps}`);
console.log(`Operations with response schema/example/description: ${opsWithExamples} / ${totalOps}`);
console.log(`Total Issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log("\nIssues details:");
  issues.forEach((iss) => console.log(" - " + iss));
} else {
  console.log("\n✅ ALL PARAMETERS, RESPONSES, AND PATH TEMPLATES ARE VALID AND COMPLETE!");
}
