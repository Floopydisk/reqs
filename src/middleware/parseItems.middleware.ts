import { Request, Response, NextFunction } from "express";

export const parseItems = (req: Request, res: Response, next: NextFunction) => {
  let items: any[] = [];

  console.log("[parseItems] req.body:", Object.keys(req.body));
  console.log("[parseItems] req.files:", req.files);

  // 1. Handle `items` field (for single JSON string or array of strings/objects)
  if (req.body.items) {
    console.log("[parseItems] Found 'items' field:", req.body.items);
    const itemsData = req.body.items;

    if (typeof itemsData === "string") {
      try {
        const parsed = JSON.parse(itemsData);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON in 'items' field" });
      }
    } else if (Array.isArray(itemsData)) {
      try {
        items = itemsData.map((item) =>
          typeof item === "string" ? JSON.parse(item) : item,
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in one of the 'items' array elements",
        });
      }
    } else {
      // It could be a single non-string item from form-data if only one is sent without being an array.
      items = [itemsData];
    }
  }
  // 2. Check if items is in req.files (when sent with ;type=application/json)
  else if (req.files && Array.isArray(req.files)) {
    console.log("[parseItems] Checking req.files for items field");
    const itemsFile = req.files.find((f: any) => f.fieldname === "items");
    if (itemsFile) {
      console.log("[parseItems] Found items in req.files");
      try {
        const fileContent = itemsFile.buffer?.toString("utf8");
        if (!fileContent) {
          return res
            .status(400)
            .json({ success: false, message: "Empty 'items' file content" });
        }
        const parsed = JSON.parse(fileContent);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        console.error("[parseItems] Error reading items file:", error);
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON in 'items' file" });
      }
    }
  }
  // 3. Handle `item_` fields (e.g., item_0, item_1)
  if (items.length === 0) {
    const dynamicItems: any[] = [];
    const itemKeys = Object.keys(req.body)
      .filter((key) => key.startsWith("item_"))
      .sort();

    if (itemKeys.length > 0) {
      console.log("[parseItems] Found dynamic 'item_X' fields:", itemKeys);
      try {
        for (const key of itemKeys) {
          const item = req.body[key];
          dynamicItems.push(typeof item === "string" ? JSON.parse(item) : item);
        }
        items = dynamicItems;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in one of the 'item_X' fields",
        });
      }
    }
  }

  // 4. Final assignment and logging
  if (items.length > 0) {
    req.body.items = items;
    console.log("[parseItems] Final parsed items:", req.body.items);
    console.log(
      "[parseItems] Final items type:",
      Array.isArray(req.body.items) ? "array" : typeof req.body.items,
    );
    console.log("[parseItems] Number of items:", req.body.items.length);
  } else {
    console.log("[parseItems] No items found or parsed.");
  }

  next();
};
