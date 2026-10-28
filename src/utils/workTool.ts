import { ItemStatus, UserRole } from "../types/enums";
import { db } from "../db";
import { departments } from "../db/schema";

export const WORK_TOOL_CATEGORY_ROUTES = {
  "Laptop Accessories": {
    departmentKey: "it",
    departmentNames: ["Information Technology", "IT"],
    departmentCodes: ["IT", "ICT"],
    departmentLabel: "Information Technology",
  },
  "Phone Accessories": {
    departmentKey: "it",
    departmentNames: ["Information Technology", "IT"],
    departmentCodes: ["IT", "ICT"],
    departmentLabel: "Information Technology",
  },
  "Office Equipment": {
    departmentKey: "hr-office",
    departmentNames: ["Human Resources & Office Management"],
    departmentCodes: [],
    departmentLabel: "Human Resources & Office Management",
  },
  "Security Accessories": {
    departmentKey: "security",
    departmentNames: ["Security"],
    departmentCodes: ["SEC", "SECURITY"],
    departmentLabel: "Security",
  },
} as const;

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const getWorkToolCategory = (item: any): string | undefined => {
  const selection = item?.workToolSubcategory;
  if (Array.isArray(selection)) {
    return selection.length === 1 && typeof selection[0] === "string"
      ? selection[0].trim()
      : undefined;
  }
  return typeof selection === "string" ? selection.trim() : undefined;
};

export const validateWorkToolCategories = (items: any[] | undefined): string | undefined => {
  if (!Array.isArray(items)) return undefined;

  const selectedDepartments = new Set<string>();
  for (const item of items) {
    if (!isWorkToolItem(item) || item.status === ItemStatus.CANCELLED) continue;

    const category = getWorkToolCategory(item);
    if (
      !category ||
      !Object.prototype.hasOwnProperty.call(WORK_TOOL_CATEGORY_ROUTES, category)
    ) {
      return "Select exactly one valid category for every work tool item";
    }
    selectedDepartments.add(
      WORK_TOOL_CATEGORY_ROUTES[category as keyof typeof WORK_TOOL_CATEGORY_ROUTES]
        .departmentKey,
    );
  }

  if (selectedDepartments.size > 1) {
    return "All work tool items in one requisition must route to the same department";
  }
  return undefined;
};

export const resolveWorkToolDepartmentHead = async (
  category: string,
): Promise<
  | { departmentId: string; departmentHeadId: string }
  | { error: string }
> => {
  const route = WORK_TOOL_CATEGORY_ROUTES[category as keyof typeof WORK_TOOL_CATEGORY_ROUTES];
  if (!route) {
    return { error: `No HoD routing is configured for work tool category "${category}"` };
  }

  const allDepartments = await db.select().from(departments);
  const department =
    allDepartments.find((candidate) =>
      route.departmentNames.some(
        (name) => normalizeName(name) === normalizeName(candidate.name),
      ),
    ) ||
    allDepartments.find((candidate) =>
      route.departmentCodes.some((code) => code === candidate.code.toUpperCase()),
    );

  if (!department) {
    return {
      error: `No ${route.departmentLabel} department is configured for this work tool category`,
    };
  }
  if (!department.headId) {
    return { error: `No HoD is assigned to the ${route.departmentLabel} department` };
  }

  return { departmentId: department.id, departmentHeadId: department.headId };
};

/** A service never enters the work-tool approval route, even for legacy data. */
export const isWorkToolItem = (item: any): boolean =>
  item?.itemType !== "service" && item?.isWorkTool === true;

export const isActiveWorkToolItem = (item: any): boolean =>
  isWorkToolItem(item) && item?.status !== ItemStatus.CANCELLED;

export const hasActiveWorkToolItems = (items: any[] | undefined): boolean =>
  Array.isArray(items) && items.some(isActiveWorkToolItem);

export const isUserWorkToolDepartmentHead = (
  user: any,
  category: string,
): boolean => {
  if (!user || user.role !== UserRole.DEPARTMENT_HEAD) return false;
  const route = WORK_TOOL_CATEGORY_ROUTES[category as keyof typeof WORK_TOOL_CATEGORY_ROUTES];
  if (!route) return false;

  const userDept = user.department;
  const deptName = normalizeName(
    typeof userDept === "object" ? userDept?.name || "" : "",
  );
  const deptCode = String(
    typeof userDept === "object" ? userDept?.code || "" : "",
  ).toUpperCase();
  const deptId = String(
    typeof userDept === "object" ? userDept?.id || userDept?._id || "" : userDept || user.departmentId || "",
  );

  if (
    route.departmentKey === "it" &&
    (deptId === "12" ||
      deptCode === "IT" ||
      deptCode === "ICT" ||
      deptName.includes("information technology") ||
      deptName.includes("it"))
  ) {
    return true;
  }
  if (
    route.departmentKey === "hr-office" &&
    (deptCode === "4" ||
      deptCode === "HR" ||
      deptName.includes("human resources") ||
      deptName.includes("office management"))
  ) {
    return true;
  }
  if (
    route.departmentKey === "security" &&
    (deptCode === "SEC" || deptCode === "SECURITY" || deptName.includes("security"))
  ) {
    return true;
  }

  return (
    route.departmentNames.some((n) => normalizeName(n) === deptName) ||
    route.departmentCodes.some((c) => c === deptCode)
  );
};

/** Keep persisted item data aligned with the service routing rule. */
export const normalizeServiceWorkToolFields = (items: any[] | undefined): void => {
  if (!Array.isArray(items)) return;

  items.forEach((item) => {
    if (item?.itemType === "service") {
      item.isWorkTool = false;
      delete item.workToolSubcategory;
    }
  });
};
