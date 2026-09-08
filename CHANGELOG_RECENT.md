## Implemented

- **B1/B2:** PO approval sets requisition status to `PO_APPROVED`, records `poApprovedAt`, and approval records have timestamps. See `purchaseOrder.controller.ts`.
- **C2/C3/C5:** Eligible approver endpoint exists; submitted requisitions can specify an approver; approval comments are optional.
- **C6/H10:** HOF/HHR PO rejection endpoints exist, and PO PDF download requires full HOF + HHR approval.
- **C7:** RFQ generation checks item approval states, including HR approval for work tools.
- **D1/D3:** HOF/HHR roles receive broad requisition visibility.
- **D4:** PMs can create vendors; vendor approval is restricted to HHR/HHRA/admin roles. PMs can manage locations/categories.
- **F1/F2:** Incorporation date is optional; PMs can create vendor categories.
- **G2/G3:** RFQ PDF renders the items table before evaluation criteria and includes a formatted metadata block.
- **H1/H2/H4/H5/H7/H9:** PO creation/editing supports custom lines, discount/VAT calculations, editing before final approval, multiple quote records, service classification override, and full location snapshots.
- **I1/I2/I3:** GRN and JCF backend workflows, approval states, role restrictions, and approval-gated PDFs exist.

## Backend gaps or defects

1. **A1/A5 are not enforced at the backend model level.**  
   `urgency` remains a persisted requisition field, and `recommendedVendor` remains in the item schema. The create handler removes submitted recommended vendors but still accepts and stores urgency. See `requisition.model.ts`, `item.model.ts`, and `requisition.controller.ts`.

2. **A2 is not implemented in the backend contract.**  
   Requisition items still use `itemName` and `itemDescription`; there is no requisition-level `detailedSpecification` field. The PO/RFQ layers use different naming.

3. **C4 is incomplete.**  
   HOF can approve requisitions in the controller, but the requisition submission route does not authorize `HEAD_OF_FINANCE`. Therefore, an HOF-created requisition cannot submit through that endpoint.

4. **C2 notifications do not follow the selected approver.**  
   The submission notification helper resolves the department head from the department instead of targeting `assignedApprover`. Selecting an HOF/HHR or another HOD therefore is not reflected in the notification target.

5. **E1 is incomplete.**  
   PO submission has no notification call. Requisition notifications are database/email-capable, but the PO approval workflow does not notify HOF/HHR when a PO is submitted.

6. **H6 is not enforced.**  
   `totalAmount` is required in the Mongoose schema, but the PO creation controller accepts an omitted value and calculates one. The API does not reject a request that omits the submitted total.

7. **H8 is not implemented in the PO PDF.**  
   The PDF renderer always outputs quantity and unit price columns. It does not suppress them for service-classified POs. See `purchaseOrder.controller.ts`.

8. **I2 does not allow selecting the PM approver.**  
   GRN creation accepts `receiverId`, but the PM approver is automatically selected using the first user with the procurement-manager role. The feedback requires the WM to select both the requester and PM.

9. **GRN naming differs from the requested role.**  
   The implementation supports both `STORE_MANAGER` and `WAREHOUSE_MANAGER`, with the designation mapping also assigning “warehouse manager” to procurement-manager in one mapping section. This is a concrete role-mapping inconsistency requiring review.

10. **D1 provides only limited RFQ data in requisition responses.**  
    Requisition detail populates related RFQs with title/number references, not the complete associated RFQ, vendor quotations, or evaluation details. Full RFQ access may exist through separate endpoints, but it is not provided directly by the requisition detail response.

## Frontend discrepancies observed

The frontend still contains legacy urgency and recommended-vendor state in several components, including `CreateNewRequest.tsx`, `RequestForm.tsx`, and older request screens. The active PO generation component also still renders an evaluation-criteria field even though it omits it from the submission payload.

## Not provable from backend inspection

- **G1:** Removing the RFQ vendor edit icon is frontend-only.
- **J1:** The backend has a standalone department approval endpoint, but whether a specific frontend button does nothing cannot be proven from backend code.
- **J2:** The current backend requisition lookup and work-tool approval paths exist; reproducing the former “Request Not Found” runtime defect requires authenticated runtime data.
- **J3:** PO PDF generation exists and is approval-gated; runtime download behavior still requires an integration test with an approved PO.

No source files were edited.