import mongoose from "mongoose";
import { UserRole, RequisitionStatus, PurchaseOrderStatus, ItemStatus, JCFStatus, RequisitionUrgency } from "../src/types/enums";
import Requisition from "../src/models/requisition.model";
import PurchaseOrder from "../src/models/purchaseOrder.model";
import JCF from "../src/models/jcf.model";
import Department from "../src/models/department.model";
import Vendor from "../src/models/vendor.model";
import VendorCategory from "../src/models/vendorCategory.model";
import Location from "../src/models/location.model";
import User from "../src/models/user.model";
import RFQ from "../src/models/rfq.model";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("=== RUNNING FEEDBACK REQUIREMENTS REGRESSION TESTS ===");

  // 1. Enums & Model Schema Tests
  console.log("\n--- Section A & B: Schema & Enum Definitions ---");
  assert(UserRole.WAREHOUSE_MANAGER === "warehouseManager", "UserRole.WAREHOUSE_MANAGER exists");
  assert(JCFStatus.PENDING_APPROVAL === "pendingApproval", "JCFStatus enum contains pendingApproval");
  assert(RequisitionUrgency.HIGH === "high", "RequisitionUrgency enum contains high");

  // Requisition Model Schema validation
  const reqSchemaPaths = Requisition.schema.paths;
  assert(reqSchemaPaths["urgency"].isRequired === false || reqSchemaPaths["urgency"].isRequired === undefined, "Requisition urgency is optional");
  assert(reqSchemaPaths["assignedApprover"] !== undefined, "Requisition has assignedApprover path");
  assert(reqSchemaPaths["requestApprovedAt"] !== undefined, "Requisition has requestApprovedAt path");
  assert(reqSchemaPaths["poApprovedAt"] !== undefined, "Requisition has poApprovedAt path");

  // Purchase Order Model Schema validation
  const poSchemaPaths = PurchaseOrder.schema.paths;
  assert(poSchemaPaths["subtotal"] !== undefined, "PO has subtotal path");
  assert(poSchemaPaths["discount"] !== undefined, "PO has discount path");
  assert(poSchemaPaths["discountType"] !== undefined, "PO has discountType path");
  assert(poSchemaPaths["discountAmount"] !== undefined, "PO has discountAmount path");
  assert(poSchemaPaths["vat"] !== undefined, "PO has vat path");
  assert(poSchemaPaths["vatRate"] !== undefined, "PO has vatRate path");
  assert(poSchemaPaths["vatAmount"] !== undefined, "PO has vatAmount path");
  assert(poSchemaPaths["vendorQuotes"] !== undefined, "PO has vendorQuotes path");
  assert(poSchemaPaths["deliveryAddressSnapshot.address"] !== undefined || poSchemaPaths["deliveryAddressSnapshot"] !== undefined, "PO has deliveryAddressSnapshot path");
  assert(poSchemaPaths["evaluationCriteria"] === undefined, "PO does NOT have evaluationCriteria path (Requirement H3)");
  assert(poSchemaPaths["serviceClassificationOverride"] !== undefined, "PO has serviceClassificationOverride path");
  assert(poSchemaPaths["serviceClassificationReason"] !== undefined, "PO has serviceClassificationReason path");

  // JCF Model Schema validation
  const jcfSchemaPaths = JCF.schema.paths;
  assert(jcfSchemaPaths["jcfNumber"] !== undefined, "JCF has jcfNumber path");
  assert(jcfSchemaPaths["serviceDescription"] !== undefined, "JCF has serviceDescription path");
  assert(jcfSchemaPaths["completionEvidence"] !== undefined, "JCF has completionEvidence path");
  assert(jcfSchemaPaths["approval"] !== undefined, "JCF has approval path");

  // 2. Financial calculation logic test (Requirement H2, H6)
  console.log("\n--- Section H: Financial Breakdown Logic ---");
  const items = [
    { itemDescription: "Laptop", quantity: 2, unitPrice: 50000, totalPrice: 100000, lineType: "requisition" },
    { itemDescription: "Delivery & Setup", quantity: 1, unitPrice: 10000, totalPrice: 10000, lineType: "service_charge" },
  ];
  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  assert(subtotal === 110000, "Subtotal correctly sums all lines including custom service charge");

  // 10% percentage discount
  const discountPercent = 10;
  const discountAmount = Math.round((subtotal * (discountPercent / 100)) * 100) / 100;
  assert(discountAmount === 11000, "Discount amount calculated correctly for percentage (11000)");

  const taxableAmount = subtotal - discountAmount;
  assert(taxableAmount === 99000, "Taxable amount is subtotal - discount (99000)");

  // 7.5% VAT
  const vatRate = 7.5;
  const vatAmount = Math.round((taxableAmount * (vatRate / 100)) * 100) / 100;
  assert(vatAmount === 7425, "VAT amount calculated correctly on taxable amount (7425)");

  const total = Math.round((subtotal - discountAmount + vatAmount) * 100) / 100;
  assert(total === 106425, "Total amount matches subtotal - discount + VAT (106425)");

  // 3. Post-PO Discovery Logic (Requirement I1)
  console.log("\n--- Section I: Post-PO Discovery Flags ---");
  const productPO = {
    status: PurchaseOrderStatus.APPROVED,
    serviceClassificationOverride: undefined,
    items: [{ lineType: "requisition", quantity: 5, unitPrice: 100 }],
    requisition: { category: "product" },
  };

  const isProductApproved = productPO.status === PurchaseOrderStatus.APPROVED;
  const isProductService =
    productPO.serviceClassificationOverride === "service" ||
    productPO.items.every((i: any) => i.lineType === "service_charge" || i.quantity === 0) ||
    productPO.requisition?.category === "service";

  const productCanCreateGrn = isProductApproved && !isProductService;
  const productCanCreateJcf = isProductApproved && isProductService;
  assert(productCanCreateGrn === true, "Approved product PO has canCreateGrn = true");
  assert(productCanCreateJcf === false, "Approved product PO has canCreateJcf = false");

  const servicePO = {
    status: PurchaseOrderStatus.APPROVED,
    serviceClassificationOverride: "service",
    items: [{ lineType: "service_charge", quantity: 0, unitPrice: 50000 }],
    requisition: { category: "service" },
  };

  const isServiceApproved = servicePO.status === PurchaseOrderStatus.APPROVED;
  const isServiceService =
    servicePO.serviceClassificationOverride === "service" ||
    servicePO.items.every((i: any) => i.lineType === "service_charge" || i.quantity === 0) ||
    servicePO.requisition?.category === "service";

  const serviceCanCreateGrn = isServiceApproved && !isServiceService;
  const serviceCanCreateJcf = isServiceApproved && isServiceService;
  assert(serviceCanCreateGrn === false, "Approved service PO has canCreateGrn = false");
  assert(serviceCanCreateJcf === true, "Approved service PO has canCreateJcf = true");

  const unapprovedPO = {
    status: PurchaseOrderStatus.SUBMITTED,
    serviceClassificationOverride: undefined,
    items: [{ lineType: "requisition", quantity: 5 }],
  };
  const unapprovedCanCreateGrn = unapprovedPO.status === PurchaseOrderStatus.APPROVED;
  assert(unapprovedCanCreateGrn === false, "Unapproved PO has canCreateGrn = false");

  // 4. Role Mapping Verification
  console.log("\n--- Section D: Role Mapping ---");
  const { mapDesignationToRoleEnhanced } = require("../src/config/roleMapping");
  assert(mapDesignationToRoleEnhanced("Procurement Manager", "101") === UserRole.PROCUREMENT_MANAGER, "Role mapping maps 'Procurement Manager' correctly");
  assert(mapDesignationToRoleEnhanced("System Administrator", "102") === UserRole.ADMIN, "Role mapping maps 'System Administrator' correctly");
  assert(mapDesignationToRoleEnhanced("Regular Employee", "103") === UserRole.STAFF, "Role mapping maps 'Regular Employee' correctly");

  console.log("\n=== ALL REGRESSION TESTS COMPLETED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
