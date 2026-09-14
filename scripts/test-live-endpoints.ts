async function runLiveEndpointTests() {
  const baseUrl = "http://localhost:3000";
  const results: { test: string; status: string; details?: any; error?: string }[] = [];

  async function step(name: string, fn: () => Promise<any>) {
    try {
      const res = await fn();
      results.push({ test: name, status: "PASS", details: res });
      console.log(`[PASS] ${name} -> ${JSON.stringify(res)}`);
    } catch (err: any) {
      results.push({ test: name, status: "FAIL", error: err.message });
      console.error(`[FAIL] ${name} -> ${err.message}`);
    }
  }

  // 1. Health endpoint
  await step("GET /health", async () => {
    const r = await fetch(`${baseUrl}/health`);
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data.status;
  });

  // 2. Root API endpoint
  await step("GET /", async () => {
    const r = await fetch(`${baseUrl}/`);
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data.message;
  });

  // 3. Auth Login
  let token = "";
  let user: any = null;
  await step("POST /api/auth/login", async () => {
    const r = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "47", bypass: "iGNOre" }),
    });
    const data = (await r.json()) as any;
    if (!r.ok || !data.data?.token) throw new Error(JSON.stringify(data));
    token = data.data.token;
    user = data.data.user;
    return { email: user.email, role: user.role };
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 4. Current user / profile
  await step("GET /api/auth/me", async () => {
    const r = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return { email: data.data?.email || data.email };
  });

  // 5. Locations: POST, GET, PUT
  let createdLocation: any = null;
  await step("POST /api/locations", async () => {
    const r = await fetch(`${baseUrl}/api/locations`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Central Logistics Hub " + Date.now(),
        address: "Plot 10, Industrial Estate, Lagos",
        contactPerson: "Engr. Babatunde",
        phoneNumber: "+2348031234567",
        email: "hub@daystarng.org",
      }),
    });
    const data = (await r.json()) as any;
    if (!r.ok || !data._id) throw new Error(JSON.stringify(data));
    createdLocation = data;
    return { id: data._id, name: data.name };
  });

  await step("GET /api/locations", async () => {
    const r = await fetch(`${baseUrl}/api/locations`, { headers: authHeaders });
    const data = (await r.json()) as any;
    if (!r.ok || !Array.isArray(data)) throw new Error(JSON.stringify(data));
    return { count: data.length };
  });

  await step("PUT /api/locations/:id", async () => {
    const r = await fetch(`${baseUrl}/api/locations/${createdLocation._id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        name: createdLocation.name + " (Updated)",
      }),
    });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return { id: data._id, updatedName: data.name };
  });

  // 6. Departments: GET
  let sampleDeptId = "";
  await step("GET /api/departments", async () => {
    const r = await fetch(`${baseUrl}/api/departments`, { headers: authHeaders });
    const data = (await r.json()) as any;
    const list = data.data || data;
    if (!r.ok || !Array.isArray(list)) throw new Error(JSON.stringify(data));
    sampleDeptId = list[0]?._id || list[0]?.id;
    return { count: list.length, sampleId: sampleDeptId, name: list[0]?.name };
  });

  // 7. Vendor Categories: POST & GET
  let createdCategory: any = null;
  await step("POST /api/vendor-categories", async () => {
    const r = await fetch(`${baseUrl}/api/vendor-categories`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Hardware & Tools " + Date.now(),
        description: "Procurement of office hardware and heavy tools",
      }),
    });
    const data = (await r.json()) as any;
    const cat = data.data || data;
    if (!r.ok) throw new Error(JSON.stringify(data));
    createdCategory = cat;
    return { id: cat._id || cat.id, name: cat.name };
  });

  await step("GET /api/vendor-categories", async () => {
    const r = await fetch(`${baseUrl}/api/vendor-categories`, { headers: authHeaders });
    const data = (await r.json()) as any;
    const list = data.data || data;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return { count: list.length };
  });

  // 8. Users: GET
  await step("GET /api/users", async () => {
    const r = await fetch(`${baseUrl}/api/users`, { headers: authHeaders });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return { count: data.count, users: data.data?.map((u: any) => ({ id: u._id, email: u.email, role: u.role })) };
  });

  // 9. Requisitions: POST, GET by ID
  let createdRequisitionId: string | null = null;
  await step("POST /api/requisitions", async () => {
    const reqPayload = {
      title: "Quarterly Office IT Supplies " + Date.now(),
      justification: "Need replacement monitors and ergonomic accessories for development team",
      department: sampleDeptId,
      deliveryLocation: createdLocation._id,
      deliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      items: [
        {
          itemName: "Dell 27-inch 4K Monitor",
          itemType: "Office Equipment",
          itemDescription: "IPS USB-C Hub Monitor for work desks",
          quantity: 2,
          units: 2,
          estimatedPrice: 350000,
          currency: "NGN",
          isWorkTool: true,
          unit: "pieces",
        },
      ],
    };

    const r = await fetch(`${baseUrl}/api/requisitions`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(reqPayload),
    });
    const data = (await r.json()) as any;
    if (!r.ok || !data.data?._id) throw new Error(JSON.stringify(data));
    createdRequisitionId = data.data._id;
    return { id: data.data._id, requisitionNumber: data.data.requisitionNumber, status: data.data.status };
  });

  await step("GET /api/requisitions/:id", async () => {
    const r = await fetch(`${baseUrl}/api/requisitions/${createdRequisitionId}`, {
      headers: authHeaders,
    });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    const reqDoc = data.data || data;
    return {
      id: reqDoc._id,
      title: reqDoc.title,
      status: reqDoc.status,
      itemCount: reqDoc.items?.length,
    };
  });

  // 10. Comments on Requisition: POST & GET
  await step("POST /api/requisitions/:requisitionId/comments", async () => {
    const r = await fetch(`${baseUrl}/api/requisitions/${createdRequisitionId}/comments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        text: "Please ensure this requisition is expedited for next sprint delivery.",
      }),
    });
    const data = (await r.json()) as any;
    if (!r.ok || !data.data?._id) throw new Error(JSON.stringify(data));
    return { commentId: data.data._id, text: data.data.text };
  });

  await step("GET /api/requisitions/:requisitionId/comments", async () => {
    const r = await fetch(`${baseUrl}/api/requisitions/${createdRequisitionId}/comments`, {
      headers: authHeaders,
    });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    const comments = data.data || data;
    return { count: comments.length, latestText: comments[0]?.text };
  });

  // 11. Cleanup test location: DELETE
  await step("DELETE /api/locations/:id", async () => {
    const r = await fetch(`${baseUrl}/api/locations/${createdLocation._id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    const data = (await r.json()) as any;
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data.message || "Location removed";
  });

  console.log("\n==========================================");
  console.log("             TEST SUMMARY");
  console.log("==========================================");
  console.log(`Total tests executed : ${results.length}`);
  console.log(`Passed               : ${results.filter((r) => r.status === "PASS").length}`);
  console.log(`Failed               : ${results.filter((r) => r.status === "FAIL").length}`);
  console.log("==========================================");

  if (results.some((r) => r.status === "FAIL")) {
    process.exit(1);
  }
}

runLiveEndpointTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
