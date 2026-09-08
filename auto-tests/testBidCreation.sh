#!/bin/bash

# Test script for the updated Bid Creation endpoint
# This script tests the create bid endpoint with the proper flow

echo "=========================================="
echo "Testing Bid Creation Endpoint"
echo "=========================================="
echo ""

# Set your base URL
BASE_URL="http://localhost:3000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create bid with complete item details (auto-calculate totalPrice)
echo -e "${YELLOW}Test 1: Create bid with complete items (auto-calculate totalPrice)${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "description": "A4 size, 80gsm, high quality white paper, 500 sheets per ream",
      "quantity": 100,
      "unitPrice": 4.50
    },
    {
      "requisitionItem": "60d0fe4f5311236168a109ce",
      "name": "Blue Ballpoint Pens",
      "description": "Medium point, blue ink, pack of 50",
      "quantity": 20,
      "unitPrice": 12.00
    }
  ],
  "proposedDeliveryDate": "2025-11-15T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "notes": "Free delivery included. Payment terms: Net 30 days. All items include manufacturer warranty."
}
EOF
echo ""
echo -e "${GREEN}Expected: Status 201, totalPrice auto-calculated as 690.00 (450 + 240)${NC}"
echo ""
echo "=========================================="
echo ""

# Test 2: Create bid with item-level totalPrice specified
echo -e "${YELLOW}Test 2: Create bid with item-level totalPrice specified${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "description": "A4 size, 80gsm, bulk discount applied",
      "quantity": 100,
      "unitPrice": 4.50,
      "totalPrice": 450.00
    }
  ],
  "proposedDeliveryDate": "2025-11-20T00:00:00.000Z",
  "notes": "Express delivery available for additional fee."
}
EOF
echo ""
echo -e "${GREEN}Expected: Status 201, totalPrice calculated from item totals${NC}"
echo ""
echo "=========================================="
echo ""

# Test 3: Create bid with explicit totalPrice matching calculated value
echo -e "${YELLOW}Test 3: Create bid with explicit totalPrice${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "quantity": 50,
      "unitPrice": 5.00
    }
  ],
  "totalPrice": 250.00,
  "proposedDeliveryDate": "2025-11-18T00:00:00.000Z"
}
EOF
echo ""
echo -e "${GREEN}Expected: Status 201, totalPrice matches provided value${NC}"
echo ""
echo "=========================================="
echo ""

# Test 4: Error - Missing required field (name)
echo -e "${YELLOW}Test 4: Error - Missing item name (validation error)${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "quantity": 50,
      "unitPrice": 5.00
    }
  ],
  "proposedDeliveryDate": "2025-11-18T00:00:00.000Z"
}
EOF
echo ""
echo -e "${RED}Expected: Status 400, validation error for missing item name${NC}"
echo ""
echo "=========================================="
echo ""

# Test 5: Error - Missing required field (quantity)
echo -e "${YELLOW}Test 5: Error - Missing item quantity (validation error)${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "unitPrice": 5.00
    }
  ],
  "proposedDeliveryDate": "2025-11-18T00:00:00.000Z"
}
EOF
echo ""
echo -e "${RED}Expected: Status 400, validation error for missing quantity${NC}"
echo ""
echo "=========================================="
echo ""

# Test 6: Error - Missing proposedDeliveryDate
echo -e "${YELLOW}Test 6: Error - Missing proposedDeliveryDate${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "quantity": 50,
      "unitPrice": 5.00
    }
  ]
}
EOF
echo ""
echo -e "${RED}Expected: Status 400, validation error for missing proposedDeliveryDate${NC}"
echo ""
echo "=========================================="
echo ""

# Test 7: Error - Empty items array
echo -e "${YELLOW}Test 7: Error - Empty items array${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [],
  "proposedDeliveryDate": "2025-11-18T00:00:00.000Z"
}
EOF
echo ""
echo -e "${RED}Expected: Status 400, validation error for empty items array${NC}"
echo ""
echo "=========================================="
echo ""

# Test 8: Error - TotalPrice mismatch
echo -e "${YELLOW}Test 8: Error - Provided totalPrice doesn't match calculated${NC}"
echo "POST ${BASE_URL}/requisitions/{requisitionId}/bids"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper",
      "quantity": 50,
      "unitPrice": 5.00
    }
  ],
  "totalPrice": 300.00,
  "proposedDeliveryDate": "2025-11-18T00:00:00.000Z"
}
EOF
echo ""
echo -e "${RED}Expected: Status 400, totalPrice mismatch error (provided: 300, calculated: 250)${NC}"
echo ""
echo "=========================================="
echo ""

# Test 9: Update existing bid with new items
echo -e "${YELLOW}Test 9: Update existing bid${NC}"
echo "PUT ${BASE_URL}/bids/{bidId}"
echo ""
echo "Request Body:"
cat << 'EOF'
{
  "items": [
    {
      "requisitionItem": "60d0fe4f5311236168a109cd",
      "name": "Premium A4 Paper - Updated",
      "description": "Updated description with better quality",
      "quantity": 75,
      "unitPrice": 4.75
    }
  ],
  "proposedDeliveryDate": "2025-11-12T00:00:00.000Z",
  "notes": "Updated delivery timeline and pricing"
}
EOF
echo ""
echo -e "${GREEN}Expected: Status 200, bid updated with new values${NC}"
echo ""
echo "=========================================="
echo ""

echo -e "${GREEN}All test cases documented!${NC}"
echo ""
echo "To run actual API tests:"
echo "1. Start your server"
echo "2. Get a valid vendor token"
echo "3. Get a valid requisition ID in VENDOR_BIDDING status"
echo "4. Replace {requisitionId} and {bidId} with actual IDs"
echo "5. Add Authorization header with Bearer token"
echo ""
echo "Example curl command:"
echo ""
cat << 'EOF'
curl -X POST http://localhost:3000/api/requisitions/YOUR_REQUISITION_ID/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "requisitionItem": "ITEM_ID",
        "name": "Premium A4 Paper",
        "quantity": 100,
        "unitPrice": 4.50
      }
    ],
    "proposedDeliveryDate": "2025-11-15T00:00:00.000Z"
  }'
EOF
echo ""
