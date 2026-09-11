#!/bin/bash

# This script creates a bid for a requisition
REQUISITION_ID="68e49a2ad6bc060699ffdeb1"  # Replace with one of your open requisitions
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZWUyMTZlMmRmZDg4Mjk4ZDVkM2RkMCIsImlhdCI6MTc2MDQ0NzE1OSwiZXhwIjoxNzYwNDkwMzU5fQ.5uMo9YDAijJ7C9S62xhRC64N_lzIpy1KZiGCpx7xVe0"

echo "Creating bid for requisition $REQUISITION_ID"
curl -X POST \
  "http://localhost:3000/api/requisitions/$REQUISITION_ID/bids" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "requisitionItem": "'"$REQUISITION_ID"'",
        "name": "Sample Item",
        "description": "This is a sample bid item",
        "quantity": 5,
        "unitPrice": 100.50,
        "totalPrice": 502.50
      }
    ],
    "totalPrice": 502.50,
    "proposedDeliveryDate": "2025-12-01T00:00:00.000Z",
    "validUntil": "2026-01-31T00:00:00.000Z",
    "notes": "Sample bid created via script"
  }'

# After creating the bid, check the bids endpoint again
echo -e "\n\nChecking bids after creation:"
curl -X GET \
  "http://localhost:3000/api/bids?page=1&limit=10" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"