# Frontend Audit & Handover Notes

**Generated:** September 4, 2026  
**Scope:** Frontend (`/requisite`) and Backend (`/src`, root `app.ts`) alignment audit across requisition workflows, role-based navigation, approvals, vendor management, RFQ stage, and purchase order generation.

---

## Executive Summary

A full audit of the frontend implementation was conducted against the recent requirement updates and backend API contracts. While the majority of UI components, role navigations, and PO generation features have been introduced, **6 actionable items** (including critical logic bugs, blockers, and build issues) require attention from the frontend team.

In parallel, the backend has been patched and verified (`pnpm run build` passes with 0 errors) to support Head of Finance (HOF) item reviews and sync all route mounts.

---

## Action Items for the Frontend Team

### 1. [CRITICAL BUG] Inverted Work-Tool RFQ Blocking Logic

* **File:** [`requisite/src/components/Requests/ViewEditRequest/ViewEditRequest.tsx`](src/components/Requests/ViewEditRequest/ViewEditRequest.tsx#L884-L891)
* **Problem:**
  The check intended to prevent RFQ creation until work tools clear HR review currently checks:
  ```typescript
  const hasUnapprovedWorkTool = requisition.items?.some(
    (item: any) =>
      item?.isWorkTool === true &&
      item?.status !== "hrReview" &&
      item?.status !== "departmentApproved"
  );
  ```
  **Impact:**
  - When an item is pending review (`status: "hrReview"`), `item?.status !== "hrReview"` is `false`, allowing RFQ creation prematurely.
  - When HR approves the item (`status: "hrApproved"`), `item?.status !== "hrReview"` evaluates to `true`, **blocking RFQ creation for approved items**.
* **Fix:**
  Update the condition so it only flags work-tool items that have **not** yet been approved by HR:
  ```typescript
  const hasUnapprovedWorkTool = requisition.items?.some(
    (item: any) =>
      item?.isWorkTool === true &&
      item?.status !== "hrApproved"
  );
  ```

---

### 2. [BUG] Head of Finance (HOF) Omitted from Item Approval UI & Bulk Selection

* **Files:**
  - [`requisite/src/components/Requests/ItemViewDialog.tsx`](src/components/Requests/ItemViewDialog.tsx#L58)
  - [`requisite/src/components/Requests/ItemsList.tsx`](src/components/Requests/ItemsList.tsx#L99)
* **Problem:**
  - In `ItemViewDialog.tsx`:
    ```typescript
    const canUseDepartmentActions = isHod || isHhra;
    ```
    The variable `isHof` is omitted, hiding the "Approve Item" and "Deny Item" actions when logged in as Head of Finance, even though backend permissions now support HOF approvals.
  - In `ItemsList.tsx`:
    ```typescript
    const showSelection = userType === "hod" && !isLocked;
    ```
    Bulk selection checkboxes are only displayed when `userType === "hod"`, preventing HOF and HHRA from performing bulk item approvals/rejections.
* **Fix:**
  - In `ItemViewDialog.tsx`:
    ```typescript
    const isHof = userType === "hof" || (user as any)?.role === "headOfFinance";
    const canUseDepartmentActions = isHod || isHhra || isHof;
    ```
  - In `ItemsList.tsx`:
    ```typescript
    const showSelection = 
      (userType === "hod" || userType === "hof" || userType === "hhra") && !isLocked;
    ```

---

### 3. [BLOCKER] Service Items Cannot Have Pricing Entered in PO Generation

* **Files:**
  - [`requisite/src/app/(dashboard)/pm/rfqs/[rfqId]/generate-po/EditPOItem.tsx`](src/app/%28dashboard%29/pm/rfqs/%5BrfqId%5D/generate-po/EditPOItem.tsx#L161-L211)
  - [`requisite/src/app/(dashboard)/pm/rfqs/[rfqId]/generate-po/GeneratePO.tsx`](src/app/%28dashboard%29/pm/rfqs/%5BrfqId%5D/generate-po/GeneratePO.tsx#L280-L310)
* **Problem:**
  - When `isService === true`, Quantity, UOM, and Unit Price inputs are hidden in `EditPOItem.tsx`.
  - However, `totalPrice` is rendered as `readOnly`:
    ```typescript
    <Input
      type="number"
      value={totalPrice}
      readOnly
      className="bg-muted cursor-not-allowed"
    />
    ```
  - The Procurement Manager has no input field to specify the agreed service fee. The total price remains `0`.
  - Upon submission, form and backend validation require all line item amounts to be greater than 0, making it impossible to submit POs containing service items.
* **Fix:**
  - In `EditPOItem.tsx`, when `isService` is `true`, render an editable input for `totalPrice` (e.g., labeled **"Service Fee / Total Amount"**):
    ```typescript
    {isService ? (
      <div className="space-y-1">
        <label className="text-sm font-medium">Service Fee / Amount</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={totalPrice}
          onChange={(e) => setTotalPrice(Number(e.target.value))}
          placeholder="Enter service fee"
        />
      </div>
    ) : (
      /* standard Qty x Unit Price inputs */
    )}
    ```
  - In `GeneratePO.tsx`, ensure that for service items, `quantity` is normalized to `1` and `unitPrice` is assigned `totalPrice` in the payload dispatched to the backend.

---

### 4. [DEFECT] Multi-File Vendor Quotes Dropped on PO Submission

* **File:** [`requisite/src/app/(dashboard)/pm/rfqs/[rfqId]/generate-po/GeneratePO.tsx`](src/app/%28dashboard%29/pm/rfqs/%5BrfqId%5D/generate-po/GeneratePO.tsx#L305-L335)
* **Problem:**
  - The UI provides a multi-file picker for vendor quotes and tracks them in state (`vendorQuoteFiles`), but the payload sent to `POST /api/rfqs/:rfqId/purchase-order` completely drops this state.
  - The files are never uploaded, and no document metadata or URLs are forwarded to the server.
* **Fix:**
  - Either upload files prior to PO submission via the document upload endpoint and pass the resulting file URLs/IDs in the `documents` or `quoteFiles` array in the JSON payload, OR submit the PO form using `multipart/form-data`.

---

### 5. [BUILD ERROR] Missing `"use client";` Directive on Vendor Pages

* **Files:**
  - [`requisite/src/app/(dashboard)/hhra/vendors/page.tsx`](src/app/%28dashboard%29/hhra/vendors/page.tsx#L1)
  - [`requisite/src/app/(dashboard)/pm/vendors/page.tsx`](src/app/%28dashboard%29/pm/vendors/page.tsx#L1)
* **Problem:**
  - Both pages import and render client components (`VendorsList`) and pass event handlers/props, but omit the `"use client";` directive at line 1.
  - In Next.js App Router, this triggers hydration and SSR prerender failures during `pnpm build`.
* **Fix:**
  Add `"use client";` at line 1 of both files.

---

### 6. [POLISH] Table Header Inconsistencies ("Item Name" vs "Item Description")

* **Files:**
  - [`requisite/src/components/Requests/ItemsList.tsx`](src/components/Requests/ItemsList.tsx#L199)
  - [`requisite/src/components/Requests/PMItemsList.tsx`](src/components/Requests/PMItemsList.tsx#L91)
* **Problem:**
  - Form inputs and dialogs were renamed from "Name of Item" to "Item Description", but table headers in the items list view still display `"Item Name"`.
* **Fix:**
  Change table header text from `"Item Name"` to `"Item Description"`.

---

## Summary of Backend Patches Applied

The following patches have been implemented in the backend codebase:

1. **Item Approval Permissions (`src/controllers/requisition.controller.ts`)**:
   - Implemented `canActorReviewItems(currentUser, requisition, action)` authorizing Admins, Super Admins, Head of Finance, Head of HR / HHRA, assigned approvers, and same-department HODs.
   - Updated `approveItem`, `rejectItem`, `bulkApproveItems`, and `bulkRejectItems` handlers.
2. **Item Review Routes (`src/routes/requisition.routes.ts`)**:
   - Updated `authorize(...)` on `/:id/items/:itemId/approve`, `/:id/items/:itemId/reject`, `/:id/items/bulk-approve`, and `/:id/items/bulk-reject` to allow `UserRole.HEAD_OF_FINANCE`, `UserRole.HEAD_OF_HR`, `UserRole.HHRA`, `UserRole.ADMIN`, and `UserRole.SUPER_ADMIN`.
3. **Route Mounting Synchronization (`app.ts`)**:
   - Imported `jcfRoutes` and mounted `/api/categories` (for inline category creation), `/api`, `jcfRoutes`, and `/api/rfqs` & `/api/requisitions` for purchase orders.
4. **Build Verification**:
   - Verified that `pnpm run build` passes with 0 TypeScript compilation errors.
