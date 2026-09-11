#!/bin/bash

# This script makes a curl request to the bid opportunities endpoint
VENDOR_ID="68ee216e2dfd88298d5d3dce"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZWUyMTZlMmRmZDg4Mjk4ZDVkM2RkMCIsImlhdCI6MTc2MDQ0NzE1OSwiZXhwIjoxNzYwNDkwMzU5fQ.5uMo9YDAijJ7C9S62xhRC64N_lzIpy1KZiGCpx7xVe0"

echo "Checking bid opportunities for vendor $VENDOR_ID"
curl -X GET \
  "http://localhost:3000/api/vendors/$VENDOR_ID/opportunities?page=1&limit=10" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nChecking bid route:"
curl -X GET \
  "http://localhost:3000/api/bids?page=1&limit=10" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"