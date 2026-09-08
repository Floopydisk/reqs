#!/bin/bash

# Load tokens
source tokens.txt

BASE_URL="http://localhost:3003/api"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         RFQ ENDPOINTS END-TO-END TEST SUITE                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Using PM Token (userId=29)"
echo "PM Role: Procurement Manager"
echo ""

# Test 1: Get all RFQs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Get All RFQs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Endpoint: GET /api/rfqs"
echo ""
RFQ_RESPONSE=$(curl -s -X GET "$BASE_URL/rfqs?page=1&limit=10" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json")

echo "$RFQ_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RFQ_RESPONSE"
echo ""
echo ""

# Extract first RFQ ID
RFQ_ID=$(echo "$RFQ_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); rfqs = data.get('data', []); print(rfqs[0]['_id'] if rfqs else '')" 2>/dev/null)

if [ ! -z "$RFQ_ID" ]; then
  echo "Found RFQ: $RFQ_ID"
  echo ""
  
  # Test 2: Get single RFQ
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 2: Get Single RFQ Details"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Endpoint: GET /api/rfqs/$RFQ_ID"
  echo ""
  RFQ_DETAIL=$(curl -s -X GET "$BASE_URL/rfqs/$RFQ_ID" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "Content-Type: application/json")
  
  echo "$RFQ_DETAIL" | python3 -m json.tool 2>/dev/null || echo "$RFQ_DETAIL"
  echo ""
  echo ""
fi

# Test 3: Get all Requisitions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Get All Requisitions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Endpoint: GET /api/requisitions"
echo ""
REQ_RESPONSE=$(curl -s -X GET "$BASE_URL/requisitions?page=1&limit=10" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json")

echo "$REQ_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REQ_RESPONSE"
echo ""
echo ""

# Extract first requisition ID
REQ_ID=$(echo "$REQ_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); reqs = data.get('data', []); print(reqs[0]['_id'] if reqs else '')" 2>/dev/null)

if [ ! -z "$REQ_ID" ]; then
  echo "Found Requisition: $REQ_ID"
  echo ""
  
  # Test 4: Get RFQs for specific requisition
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST 4: Get RFQs for Specific Requisition"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Endpoint: GET /api/requisitions/$REQ_ID/rfqs"
  echo ""
  REQ_RFQ=$(curl -s -X GET "$BASE_URL/requisitions/$REQ_ID/rfqs" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "Content-Type: application/json")
  
  echo "$REQ_RFQ" | python3 -m json.tool 2>/dev/null || echo "$REQ_RFQ"
  echo ""
  echo ""
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              TEST EXECUTION COMPLETED                      ║"
echo "╚════════════════════════════════════════════════════════════╝"

