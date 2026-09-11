#!/bin/bash

# Test script for the enhanced initiate bidding endpoint
# This demonstrates how to use the new fields: biddingDeadline, biddingStartDate, 
# biddingMessage, additionalInfo, and vendorCategoryId

echo "════════════════════════════════════════════════════════════════"
echo "  TESTING ENHANCED INITIATE BIDDING ENDPOINT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Configuration
BASE_URL="http://localhost:3000/api"
# Replace with a requisition in DEPARTMENT_APPROVED status
REQUISITION_ID="YOUR_REQUISITION_ID"
# Replace with actual token
TOKEN="YOUR_AUTH_TOKEN"

# Test 1: Initiate bidding with ALL new fields
echo "Test 1: Initiate Bidding with All Fields"
echo "────────────────────────────────────────────────────────────────"
echo "Endpoint: PUT $BASE_URL/requisitions/$REQUISITION_ID/initiate-bidding"
echo ""
echo "Payload includes:"
echo "  - vendorCategoryId: Required"
echo "  - biddingDeadline: Optional deadline for bid submissions"
echo "  - biddingStartDate: Optional start date (defaults to now)"
echo "  - biddingMessage: Optional custom message to vendors"
echo "  - additionalInfo: Optional additional requirements"
echo "  - selectedVendorIds: Optional specific vendors (all if omitted)"
echo ""

curl -X PUT "$BASE_URL/requisitions/$REQUISITION_ID/initiate-bidding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "vendorCategoryId": "68e4e71e0f1e7de267693a49",
    "biddingDeadline": "2025-10-30T23:59:59.000Z",
    "biddingStartDate": "2025-10-17T00:00:00.000Z",
    "biddingMessage": "Please submit your best competitive pricing for this requisition. We are looking for quality products with good warranty terms.",
    "additionalInfo": "Site visit is required before submitting bids. Please contact the procurement office at procurement@company.com to schedule your visit. All bids must include detailed specifications and delivery timeline.",
    "selectedVendorIds": []
  }' | jq '.'

echo ""
echo ""

# Test 2: Initiate bidding with minimal fields (only vendorCategoryId)
echo "Test 2: Initiate Bidding with Only Required Field"
echo "────────────────────────────────────────────────────────────────"
echo "Only vendorCategoryId is required, all other fields are optional"
echo ""

# Note: Use a different requisition ID for this test
REQUISITION_ID_2="ANOTHER_REQUISITION_ID"

curl -X PUT "$BASE_URL/requisitions/$REQUISITION_ID_2/initiate-bidding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "vendorCategoryId": "68e4e71e0f1e7de267693a49"
  }' | jq '.'

echo ""
echo ""

# Test 3: Initiate bidding with deadline and message only
echo "Test 3: Initiate Bidding with Deadline and Message"
echo "────────────────────────────────────────────────────────────────"
echo "Using vendorCategoryId, biddingDeadline, and biddingMessage"
echo ""

REQUISITION_ID_3="YET_ANOTHER_REQUISITION_ID"

curl -X PUT "$BASE_URL/requisitions/$REQUISITION_ID_3/initiate-bidding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "vendorCategoryId": "68f0b556a8143f3adcfbaba0",
    "biddingDeadline": "2025-11-15T17:00:00.000Z",
    "biddingMessage": "Urgent requirement. Early submissions preferred."
  }' | jq '.'

echo ""
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  FIELD DESCRIPTIONS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Required Fields:"
echo "  • vendorCategoryId: ID of the vendor category (e.g., IT Hardware)"
echo ""
echo "Optional Fields:"
echo "  • biddingDeadline: When bids must be submitted by (ISO 8601 date)"
echo "  • biddingStartDate: When bidding opens (defaults to current time)"
echo "  • biddingMessage: Custom message to vendors about this bid request"
echo "  • additionalInfo: Extra requirements, instructions, or notes"
echo "  • selectedVendorIds: Array of specific vendor IDs to invite"
echo "    (if empty/omitted, all verified vendors in category are invited)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Example with actual data
echo "EXAMPLE PAYLOAD:"
echo "────────────────────────────────────────────────────────────────"
cat << 'EOF'
{
  "vendorCategoryId": "68e4e71e0f1e7de267693a49",
  "biddingDeadline": "2025-10-30T23:59:59.000Z",
  "biddingStartDate": "2025-10-17T08:00:00.000Z",
  "biddingMessage": "We are seeking competitive quotes for office furniture. Please include delivery and installation costs in your bid.",
  "additionalInfo": "Requirements:\n- All items must meet ISO standards\n- Minimum 2-year warranty\n- Delivery within 30 days of order\n- Installation included\n\nContact John Doe (john@company.com) for site measurements.",
  "selectedVendorIds": [
    "68e6368039761bc96612ef21",
    "68ee216e2dfd88298d5d3dce"
  ]
}
EOF

echo ""
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""