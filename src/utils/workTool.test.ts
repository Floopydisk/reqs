import assert from "node:assert/strict";
import test from "node:test";
import { ItemStatus } from "../types/enums";
import { validateWorkToolCategories } from "./workTool";

const tool = (workToolSubcategory: string[], status?: ItemStatus) => ({
  itemType: "product",
  isWorkTool: true,
  workToolSubcategory,
  status,
});

test("allows laptop and phone work tools routed to the same IT department", () => {
  assert.equal(
    validateWorkToolCategories([
      tool(["Laptop Accessories"]),
      tool(["Phone Accessories"]),
    ]),
    undefined,
  );
});

test("requires exactly one valid category for each work-tool item", () => {
  assert.match(
    validateWorkToolCategories([tool(["Laptop Accessories", "Phone Accessories"])]),
    /exactly one valid category/,
  );
  assert.match(
    validateWorkToolCategories([tool([])]),
    /exactly one valid category/,
  );
});

test("rejects work-tool items routed to different departments", () => {
  assert.match(
    validateWorkToolCategories([
      tool(["Laptop Accessories"]),
      tool(["Security Accessories"]),
    ]),
    /same department/,
  );
});

test("ignores cancelled work-tool items when determining routing", () => {
  assert.equal(
    validateWorkToolCategories([
      tool(["Laptop Accessories"]),
      tool(["Security Accessories"], ItemStatus.CANCELLED),
    ]),
    undefined,
  );
});
