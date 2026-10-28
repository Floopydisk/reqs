# Sequential Purchase Order Approval Workflow (PM → HoF → HHRA)

The Purchase Order approval workflow has been updated end-to-end to enforce a two-stage sequential approval pipeline:
1. **PM Generation & Submission**: The Procurement Manager generates and submits the PO (`status: submitted`, parent requisition: `poPendingApproval`).
2. **Stage 1 (Head of Finance Approval)**: HoF reviews financial breakdown, discount, VAT, and vendor quotations. Upon approval via `PUT /api/purchase-orders/:id/hof-approve`, status transitions to `hofApproved` and the PO awaits HHRA approval. HoF can also reject via `/hof-reject`.
3. **Stage 2 (HHRA Final Approval)**: HHRA reviews HoF-approved purchase orders. Gated strictly behind HoF approval (`status` must be `hofApproved`). Upon approval via `PUT /api/purchase-orders/:id/hhra-approve` or `PUT /api/purchase-orders/:id/hhr-approve`, the PO transitions to `approved`, the parent requisition updates to `poApproved` with `poApprovedAt` recorded, and PDF download and downstream GRN/JCF fulfillment become unlocked. HHRA can also reject via `/hhra-reject` or `/hhr-reject`.

---

## Changes Implemented

### Backend
- **Controller Enforcement (`src/controllers/purchaseOrder.controller.ts`)**:
  - `submitPurchaseOrder`: Automatically syncs parent requisition to `poPendingApproval`.
  - `hofApprovePO`: Strict authorization check for Head of Finance / Finance HOD; validates `status === "submitted"`; records HoF approval audit; transitions status to `hofApproved`; updates requisition to `poPendingApproval`.
  - `hhrApprovePO` & `hhraApprovePO`: Strict authorization check for Head of HR & Admin (HHRA); validates `status === "hofApproved"`; verifies HoF approval completion; records HHRA approval audit; transitions status to `approved`; updates requisition to `poApproved` with `poApprovedAt` timestamp.
  - `rejectPurchaseOrder`: Supports HoF rejection of `submitted` POs and HHRA rejection of `hofApproved` POs; records rejection reason and timestamp; sets status to `rejected`; sets parent requisition to `procurementReview`.
  - `generatePurchaseOrderPDF`: Strict gate requiring both HoF and HHRA approvals and `approved` status before PDF streaming.
- **Routes & Swagger Documentation (`src/routes/purchaseOrder.routes.ts`)**:
  - Added and documented `/api/purchase-orders/{id}/hhra-approve` and `/api/purchase-orders/{id}/hhra-reject`.
  - Updated OpenAPI annotations for `/hof-approve`, `/hhr-approve`, `/hof-reject`, `/hhr-reject`, `/reject`, and `/submit` detailing the sequential workflow.

### Frontend
- **PO Details (`frontend/src/components/pm/PurchaseOrderDetails.tsx`)**:
  - Enhanced `isHof` and `isHhra` role detection to recognize direct role strings (`headOfFinance`, `headOfHr`, `hhra`) and HOD designations/departments.
  - HoF approve and reject buttons appear when `status === "submitted"` (or legacy `issued`).
  - HHRA approve and reject buttons appear strictly when `status === "hofApproved"`.
  - Informational banners displayed when HHRA views a PO awaiting HoF approval or when HoF views a PO awaiting HHRA final approval.
  - PDF download button locked until status is `approved`.
- **HHRA & HoF Dashboard Views (`frontend/src/components/hhra/HHRADashboard.tsx` & Pages)**:
  - `approvalType` prop configured: `/hof/pos` passes `approvalType="hof"` (approves `submitted` POs); `/hhra/pos` passes `approvalType="hhra"` (approves `hofApproved` POs).
  - Row approval button displays conditionally based on approval stage.
- **Status Badges (`frontend/src/components/StatusBadge.tsx`)**:
  - Added support and styling for `poPendingApproval`, `hofApproved` ("Approved by Finance (Awaiting HHRA)"), and `poApproved`.
