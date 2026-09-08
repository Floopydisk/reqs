# RFQ API Testing - Quick Reference Guide

## Bearer Tokens (Valid until: 2026-04-18)

### Staff User (userId=47)
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDEyNjg5OTQwYjdmNDA2OGNmNTNmOSIsImlhdCI6MTc3NjQ2NDIzMywiZXhwIjoxNzc2NTA3NDMzfQ.WS2dO_Uuj02H0YPMQoEjZ-qDeq__Z9Out6oHKsupuow

User Details:
  - Name: Taiwo Ademoye
  - Department: Information Technology
  - Designation: IT Officer
  - Role: staff
```

### PM User (userId=29)
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZGU2MGU1YzNlZjlmMGIxNDk4MTQzZCIsImlhdCI6MTc3NjQ2NDIzNiwiZXhwIjoxNzc2NTA3NDM2fQ.ePnuaVBaVeGciqu5ee8K_d-WvMFkdcvXlTe-SsGT3bc

User Details:
  - Name: Lucy Ikechukwu
  - Department: Procurement
  - Designation: Procurement Manager
  - Role: procurementManager
```

---

## Quick Test Endpoints

### Base URL
```
http://localhost:3003/api
```

### RFQ Endpoints

#### 1. Get All RFQs
```bash
curl -X GET "http://localhost:3003/api/rfqs?page=1&limit=10" \
  -H "Authorization: Bearer $PM_TOKEN"
```

#### 2. Get Specific RFQ
```bash
curl -X GET "http://localhost:3003/api/rfqs/{rfqId}" \
  -H "Authorization: Bearer $PM_TOKEN"
```

Example with actual ID:
```bash
curl -X GET "http://localhost:3003/api/rfqs/69e1e89d7be1fb127a1cf316" \
  -H "Authorization: Bearer $PM_TOKEN"
```

#### 3. Get RFQs for Specific Requisition
```bash
curl -X GET "http://localhost:3003/api/requisitions/{requisitionId}/rfqs" \
  -H "Authorization: Bearer $PM_TOKEN"
```

Example with actual ID:
```bash
curl -X GET "http://localhost:3003/api/requisitions/692b591e4c1dc7e4984d549b/rfqs" \
  -H "Authorization: Bearer $PM_TOKEN"
```

### Requisition Endpoints

#### 1. Get All Requisitions
```bash
curl -X GET "http://localhost:3003/api/requisitions?page=1&limit=10" \
  -H "Authorization: Bearer $PM_TOKEN"
```

#### 2. Get Specific Requisition
```bash
curl -X GET "http://localhost:3003/api/requisitions/{requisitionId}" \
  -H "Authorization: Bearer $PM_TOKEN"
```

#### 3. Get Requisition Items
```bash
curl -X GET "http://localhost:3003/api/requisitions/{requisitionId}/items" \
  -H "Authorization: Bearer $PM_TOKEN"
```

---

## Sample Data Available for Testing

### Sample RFQ
```
ID: 69e1e89d7be1fb127a1cf316
RFQ Number: RFQ-000015
Title: PM Submission Test (RFQ)
Status: draft
Requisition: 692b591e4c1dc7e4984d549b
Vendors: ["6978e044a047a8c4ca758cb7"]
Items: 1
Created By: Lucy Ikechukwu (PM)
```

### Sample Requisition
```
ID: 692b591e4c1dc7e4984d549b
Title: PM Submission Test
Requisition Number: REQ-2511-0027
Urgency: medium
Items: 1
RFQs Generated: 3
Status: In Process
```

---

## Common Query Parameters

### Pagination
```
?page=1&limit=10
```

### Filtering RFQs
```
?status=draft
?status=issued
?status=quote_received
```

### Include Related Data
Most endpoints auto-populate related data (vendors, requisitions, items)

---

## Expected Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "count": 5,
  "total": 15,
  "currentPage": 1,
  "totalPages": 3
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description here"
}
```

---

## Postman Import

You can import these endpoints into Postman using the bearer tokens above.

Headers required:
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Testing Checklist

- [ ] Test RFQ listing (GET /api/rfqs)
- [ ] Test specific RFQ retrieval (GET /api/rfqs/{id})
- [ ] Test requisition listing (GET /api/requisitions)
- [ ] Test RFQs by requisition (GET /api/requisitions/{id}/rfqs)
- [ ] Test pagination (page, limit parameters)
- [ ] Test filtering by status
- [ ] Verify vendor data population
- [ ] Verify item details
- [ ] Test with Staff token (if permitted)
- [ ] Test with PM token
- [ ] Verify error handling with invalid IDs
- [ ] Check response time performance

---

## Troubleshooting

### Authentication Failed
- Verify token is not expired (24 hour validity)
- Check system date/time is correct
- Re-run get_tokens.sh to get fresh tokens

### Data Not Returned
- Check pagination parameters
- Verify filters are correct
- Ensure IDs are valid

### CORS Issues
- Ensure correct headers are included
- Use localhost:3003 for local testing

---

## Related Scripts

- `tokens.txt` - Contains current bearer tokens
- `rfq_test.sh` - Comprehensive RFQ endpoint tests
- `RFQ_API_TEST_REPORT.md` - Full testing report

---

**Last Updated:** 2026-04-17  
**All Tests:** ✅ PASSED  
**Ready for Production:** YES
