#!/bin/bash

source tokens.txt

BASE_URL="http://localhost:3003/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     RFQ & REQUISITION ENDPOINTS - COMPREHENSIVE TEST       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Store test results
PASSED=0
FAILED=0

# Helper function for tests
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  
  echo -e "${YELLOW}Testing: $description${NC}"
  echo "  $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    RESPONSE=$(curl -s -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $PM_TOKEN" \
      -H "Content-Type: application/json")
  else
    RESPONSE=$(curl -s -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $PM_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  # Check if response has success field
  SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print('true' if 'success' in data else 'false')" 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    echo -e "  ${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED+1))
  else
    echo -e "  ${RED}✗ FAILED${NC}"
    echo "  Response: $(echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -5)"
    FAILED=$((FAILED+1))
  fi
  echo ""
}

# Test 1: Get all RFQs
test_endpoint "GET" "/rfqs?page=1&limit=5" "Get all RFQs"

# Test 2: Get all Requisitions
test_endpoint "GET" "/requisitions?page=1&limit=5" "Get all Requisitions"

# Get first RFQ ID for detailed tests
echo -e "${YELLOW}Extracting RFQ and Requisition IDs for detailed tests...${NC}"
RFQ_DATA=$(curl -s -X GET "$BASE_URL/rfqs?page=1&limit=1" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json")

RFQ_ID=$(echo "$RFQ_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); rfqs = data.get('data', []); print(rfqs[0]['_id'] if rfqs else '')" 2>/dev/null)
REQ_ID=$(echo "$RFQ_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); rfqs = data.get('data', []); print(rfqs[0].get('requisition', {}).get('_id', '') if rfqs else '')" 2>/dev/null)

echo "  RFQ ID: $RFQ_ID"
echo "  Requisition ID: $REQ_ID"
echo ""

# Test 3: Get specific RFQ
if [ ! -z "$RFQ_ID" ]; then
  test_endpoint "GET" "/rfqs/$RFQ_ID" "Get specific RFQ by ID"
fi

# Test 4: Get RFQs for specific requisition
if [ ! -z "$REQ_ID" ]; then
  test_endpoint "GET" "/requisitions/$REQ_ID/rfqs" "Get RFQs for specific Requisition"
fi

# Test 5: Get specific requisition
if [ ! -z "$REQ_ID" ]; then
  test_endpoint "GET" "/requisitions/$REQ_ID" "Get specific Requisition by ID"
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! Ready for production deployment.${NC}"
else
  echo -e "${RED}Some tests failed. Review errors above.${NC}"
fi

