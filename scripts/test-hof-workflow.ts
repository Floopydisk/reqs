import { db } from "../src/db";
import { users, departments, locations } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { generateToken } from "../src/utils/tokenManager";
import { UserRole } from "../src/types/enums";
import axios from "axios";
import { uploadToS3 } from "../src/utils/fileUpload";

const BASE_URL = "http://localhost:3000/api";

async function runTests() {
  console.log("=== STARTING FULL WORKFLOW TEST ===");

  // 1. S3 Upload Direct Test
  console.log("\n[Test 1] Testing AWS S3 Upload directly...");
  const dummyFile: Express.Multer.File = {
    fieldname: "uploadImage",
    originalname: "test-workflow-img.png",
    encoding: "7bit",
    mimetype: "image/png",
    buffer: Buffer.from("test png data for workflow test"),
    size: 32,
    destination: "",
    filename: "",
    path: "",
    stream: null as any,
  };
  const s3Result = await uploadToS3(dummyFile, "test-uploads");
  console.log("✓ S3 Upload success:", s3Result.url);

  // 2. Fetch Users for tokens
  console.log("\n[Test 2] Fetching departments, users and generating tokens...");
  const itDept = await db.query.departments.findFirst({ where: eq(departments.code, "IT") });
  const hrDept = await db.query.departments.findFirst({ where: eq(departments.code, "4") });
  const finDept = await db.query.departments.findFirst({ where: eq(departments.code, "5") });

  const staffUser = await db.query.users.findFirst({
    where: and(eq(users.role, UserRole.STAFF), eq(users.departmentId, itDept!.id)),
    with: { department: true }
  });
  const itHead = await db.query.users.findFirst({ where: eq(users.id, itDept!.headId!), with: { department: true } });
  const hrHead = await db.query.users.findFirst({ where: eq(users.id, hrDept!.headId!), with: { department: true } });
  const finHead = await db.query.users.findFirst({ where: eq(users.id, finDept!.headId!), with: { department: true } });
  const pmUser = await db.query.users.findFirst({ where: eq(users.role, UserRole.PROCUREMENT_MANAGER), with: { department: true } });
  const loc = await db.query.locations.findFirst();

  if (!staffUser || !itHead || !hrHead || !finHead || !pmUser || !loc) {
    throw new Error("Missing required seed data");
  }

  const staffToken = generateToken(staffUser as any);
  const itHeadToken = generateToken(itHead as any);
  const hrHeadToken = generateToken(hrHead as any);
  const hofToken = generateToken(finHead as any);
  const pmToken = generateToken(pmUser as any);

  console.log(`Staff (IT): ${staffUser.firstName} ${staffUser.lastName}`);
  console.log(`IT HoD: ${itHead.firstName} ${itHead.lastName}`);
  console.log(`HR HoD (HHRA): ${hrHead.firstName} ${hrHead.lastName}`);
  console.log(`HoF: ${finHead.firstName} ${finHead.lastName}`);
  console.log(`PM: ${pmUser.firstName} ${pmUser.lastName}`);

  // Flow A: Non-work tool requisition created by Staff -> HoD approves -> HoF approves -> PM review
  console.log("\n[Test 3: Flow A] Staff creates non-work tool requisition...");
  const nonWorkToolReq = {
    title: "Office Stationary Supplies",
    justification: "Need pens and notebooks for IT department staff",
    deliveryLocation: loc.id,
    deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    departmentId: itDept!.id,
    items: [
      {
        itemName: "A4 Notebooks",
        itemType: "Office Supplies",
        itemDescription: "200-page ruled notebooks",
        units: 10,
        isWorkTool: false,
      },
    ],
  };

  const createRes1 = await axios.post(`${BASE_URL}/requisitions`, nonWorkToolReq, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const req1 = createRes1.data.data;
  console.log(`✓ Requisition created with ID: ${req1.id || req1._id}, status: ${req1.status}`);
  if (req1.status !== "submitted") {
    throw new Error(`Expected status submitted, got ${req1.status}`);
  }

  console.log("[Test 3.1] Attempt HoF approval before HoD approves (should fail)...");
  try {
    await axios.put(`${BASE_URL}/requisitions/${req1.id || req1._id}/hof-approval`, { status: "approved" }, {
      headers: { Authorization: `Bearer ${hofToken}` },
    });
    throw new Error("HoF approval should have failed before HoD approval!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected with 400: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  console.log("[Test 3.2] IT HoD approves non-work tool requisition...");
  const hodApproveRes1 = await axios.put(
    `${BASE_URL}/requisitions/${req1.id || req1._id}/department-approval`,
    { status: "approved", comments: "Approved by IT Head" },
    { headers: { Authorization: `Bearer ${itHeadToken}` } },
  );
  console.log(`✓ Department approved! New status: ${hodApproveRes1.data.data.status}`);
  if (hodApproveRes1.data.data.status !== "departmentApproved") {
    throw new Error(`Expected departmentApproved, got ${hodApproveRes1.data.data.status}`);
  }

  console.log("[Test 3.3] HoF approves requisition via PUT /api/requisitions/:id/hof-approval...");
  const hofApproveRes1 = await axios.put(
    `${BASE_URL}/requisitions/${req1.id || req1._id}/hof-approval`,
    { status: "approved", comments: "Finance budget verified and approved" },
    { headers: { Authorization: `Bearer ${hofToken}` } },
  );
  console.log(`✓ HoF approved! New status: ${hofApproveRes1.data.data.status}`);
  if (hofApproveRes1.data.data.status !== "hofApproved") {
    throw new Error(`Expected hofApproved, got ${hofApproveRes1.data.data.status}`);
  }

  console.log("[Test 3.4] PM moves to procurement review...");
  const pmReviewRes1 = await axios.put(
    `${BASE_URL}/requisitions/${req1.id || req1._id}/procurement-review`,
    {},
    { headers: { Authorization: `Bearer ${pmToken}` } },
  );
  console.log(`✓ PM moved to procurement review! New status: ${pmReviewRes1.data.data.status}`);

  // Flow B: Work-tool requisition created by Staff -> HoD approves -> HR_REVIEW -> HHRA approves -> HoF approves -> PM
  console.log("\n[Test 4: Flow B] Staff creates work tool requisition (Laptop)...");
  const workToolReq = {
    title: "Engineering Workstation Laptop",
    justification: "Replacement laptop for developer",
    deliveryLocation: loc.id,
    deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    departmentId: itDept!.id,
    items: [
      {
        itemName: "MacBook Pro 16",
        itemType: "Computer Hardware",
        itemDescription: "M3 Max 36GB RAM",
        units: 1,
        isWorkTool: true,
      },
    ],
  };

  const createRes2 = await axios.post(`${BASE_URL}/requisitions`, workToolReq, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const req2 = createRes2.data.data;
  console.log(`✓ Work tool requisition created: ${req2.id || req2._id}, status: ${req2.status}`);

  console.log("[Test 4.1] HoD approves work tool requisition -> should move to HR_REVIEW...");
  const hodApproveRes2 = await axios.put(
    `${BASE_URL}/requisitions/${req2.id || req2._id}/department-approval`,
    { status: "approved", comments: "HoD recommends approval for dev work" },
    { headers: { Authorization: `Bearer ${itHeadToken}` } },
  );
  console.log(`✓ HoD approved! Status is now: ${hodApproveRes2.data.data.status}`);
  if (hodApproveRes2.data.data.status !== "hrReview") {
    throw new Error(`Expected hrReview, got ${hodApproveRes2.data.data.status}`);
  }

  console.log("[Test 4.2] Attempt HoF approval while in HR_REVIEW (should fail)...");
  try {
    await axios.put(`${BASE_URL}/requisitions/${req2.id || req2._id}/hof-approval`, { status: "approved" }, {
      headers: { Authorization: `Bearer ${hofToken}` },
    });
    throw new Error("HoF approval should have failed because working tools need HHRA approval first!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected with 400: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  console.log("[Test 4.3] HHRA approves work tool requisition via PUT /api/requisitions/:id/hhra-approval...");
  const hhraApproveRes2 = await axios.put(
    `${BASE_URL}/requisitions/${req2.id || req2._id}/hhra-approval`,
    { status: "approved", comments: "HHRA approved work tool provision" },
    { headers: { Authorization: `Bearer ${hrHeadToken}` } },
  );
  console.log(`✓ HHRA approved! Status is now: ${hhraApproveRes2.data.data.status}`);
  if (hhraApproveRes2.data.data.status !== "hrApproved") {
    throw new Error(`Expected hrApproved, got ${hhraApproveRes2.data.data.status}`);
  }

  console.log("[Test 4.4] Now HoF approves requisition...");
  const hofApproveRes2 = await axios.put(
    `${BASE_URL}/requisitions/${req2.id || req2._id}/hof-approval`,
    { status: "approved", comments: "HoF approves budget for workstation" },
    { headers: { Authorization: `Bearer ${hofToken}` } },
  );
  console.log(`✓ HoF approved! Status is now: ${hofApproveRes2.data.data.status}`);
  if (hofApproveRes2.data.data.status !== "hofApproved") {
    throw new Error(`Expected hofApproved, got ${hofApproveRes2.data.data.status}`);
  }

  // Flow C: Auto-approval when requester is HoD himself
  console.log("\n[Test 5: Flow C] IT HoD creates requisition himself (non-work tools)...");
  const hodCreatedReq = {
    title: "Server Rack Cables",
    justification: "Data center cable replacement",
    deliveryLocation: loc.id,
    deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    departmentId: itDept!.id,
    items: [
      {
        itemName: "Cat6 Ethernet Patch Cables",
        itemType: "Network Hardware",
        itemDescription: "1m shielded patch cables pack",
        units: 20,
        isWorkTool: false,
      },
    ],
  };

  const createRes3 = await axios.post(`${BASE_URL}/requisitions`, hodCreatedReq, {
    headers: { Authorization: `Bearer ${itHeadToken}` },
  });
  const req3 = createRes3.data.data;
  console.log(`✓ Requisition created by HoD: status is ${req3.status}`);
  if (req3.status !== "departmentApproved") {
    throw new Error(`Expected auto-approved status 'departmentApproved', got ${req3.status}`);
  }

  console.log("[Test 5.1] Verify department approval record was created automatically...");
  const fetchedReq3 = (await axios.get(`${BASE_URL}/requisitions/${req3.id || req3._id}`, {
    headers: { Authorization: `Bearer ${itHeadToken}` },
  })).data.data;
  const deptApproval = fetchedReq3.approvals?.find((a: any) => a.stage === "Department" || a.approverRole === "hod");
  if (!deptApproval || deptApproval.status !== "approved") {
    throw new Error("Expected automatic department approval record!");
  }
  console.log(`✓ Auto-approval record found: stage=${deptApproval.stage}, status=${deptApproval.status}, comments="${deptApproval.comments}"`);

  console.log("[Test 5.2] HoF approves the HoD-generated request...");
  const hofApproveRes3 = await axios.put(
    `${BASE_URL}/requisitions/${req3.id || req3._id}/hof-approval`,
    { status: "approved", comments: "Finance approves HoD request" },
    { headers: { Authorization: `Bearer ${hofToken}` } },
  );
  console.log(`✓ HoF approved HoD-created requisition! Status: ${hofApproveRes3.data.data.status}`);
  if (hofApproveRes3.data.data.status !== "hofApproved") {
    throw new Error(`Expected hofApproved, got ${hofApproveRes3.data.data.status}`);
  }

  // Flow D: HoF Rejection
  console.log("\n[Test 6: Flow D] Testing HoF Rejection endpoint PUT /api/requisitions/:id/hof-reject...");
  const reqForReject = {
    title: "Luxury Coffee Machine",
    justification: "Office refreshment upgrade",
    deliveryLocation: loc.id,
    deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    departmentId: itDept!.id,
    items: [
      {
        itemName: "Espresso Maker",
        itemType: "Appliances",
        itemDescription: "Automatic espresso machine",
        units: 1,
        isWorkTool: false,
      },
    ],
  };
  const createRes4 = (await axios.post(`${BASE_URL}/requisitions`, reqForReject, {
    headers: { Authorization: `Bearer ${itHeadToken}` }, // Auto-approved to departmentApproved
  })).data.data;

  const rejectRes = await axios.put(
    `${BASE_URL}/requisitions/${createRes4.id || createRes4._id}/hof-reject`,
    { comments: "Not within current quarterly budget guidelines" },
    { headers: { Authorization: `Bearer ${hofToken}` } },
  );
  console.log(`✓ HoF rejected requisition! Status is now: ${rejectRes.data.data.status}`);
  if (rejectRes.data.data.status !== "hofRejected") {
    throw new Error(`Expected hofRejected, got ${rejectRes.data.data.status}`);
  }

  console.log("\n==========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==========================================");
}

runTests().then(() => process.exit(0)).catch((e) => {
  console.error("Test failed:", e.response?.data || e.message || e);
  process.exit(1);
});
