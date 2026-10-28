ALTER TABLE "requisition_approvals" ADD COLUMN IF NOT EXISTS "approver_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "requisition_items" ADD COLUMN IF NOT EXISTS "work_tool_subcategory" varchar(100);
