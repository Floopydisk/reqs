#!/bin/bash

BASE_URL="http://localhost:3003/api"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       RFQ WRITE OPERATIONS TEST (Issue & Update)           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get a draft RFQ to test with
echo "1. Getting a draft RFQ for testing..."
RFQ_DATA=$(curl -s -X GET "$BASE_URL/rfqs?status=draft&limit=1" \
  -H "Authorization: Bearer $PM_TOKEN")

RFQ_ID=$(echo "$RFQ_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); rfqs = data.get('data', []); print(rfqs[0]['_id'] if rfqs else '')" 2>/dev/null)
RFQ_STATUS=$(echo "$RFQ_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); rfqs = data.get('data', []); print(rfqs[0].get('status', '') if rfqs else '')" 2>/dev/null)

echo "  Found RFQ: $RFQ_ID (Status: $RFQ_STATUS)"
echo ""

if [ ! -z "$RFQ_ID" ] && [ "$RFQ_STATUS" = "draft" ]; then
  
  # Test 1: Update RFQ (should work for draft)
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "2. Testing PUT /api/rfqs/{rfqId} - Update Draft RFQ"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  UPDATE_DATA='{"title":"Updated RFQ Title","evaluationCriteria":"Updated criteria"}'
  
  echo "Request Body:"
  echo "$UPDATE_DATA" | python3 -m json.tool
  echo ""
  
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/rfqs/$RFQ_ID" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_DATA")
  
  echo "Response:"
  echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
  echo ""
  echo ""
  
  # Test 2: Issue RFQ
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "3. Testing POST /api/rfqs/{rfqId}/issue - Issue RFQ to Vendor"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  ISSUE_RESPONSE=$(curl -s -X POST "$BASE_URL/rfqs/$RFQ_ID/issue" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "Content-Type: application/json")
  
  echo "Response:"
  echo "$ISSUE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ISSUE_RESPONSE"
  echo ""
  echo ""
  
  # Check new status
  echo "4. Verifying RFQ status after issue..."
  VERIFY=$(curl -s -X GET "$BASE_URL/rfqs/$RFQ_ID" \
    -H "Authorization: Bearer $PM_TOKEN")
  
  NEW_STATUS=$(echo "$VERIFY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('status', '')) if data.get('data') else 'N/A'" 2>/dev/null)
  
  echo "  New RFQ Status: $NEW_STATUS"
  echo ""
  
else
  echo "No draft RFQs found for testing"
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║            WRITE OPERATIONS TEST COMPLETE                  ║"
echo "╚════════════════════════════════════════════════════════════╝"

