#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3003/api"
BYPASS="iGNOre"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VERIFYING API CHANGES WITH CURL SCRIPTS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Get token for staff (userId=47)
echo -e "${YELLOW}1. Authenticating Staff User (userId=47)${NC}"
STAFF_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"47","bypass":"iGNOre"}')

STAFF_TOKEN=$(echo "$STAFF_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$STAFF_TOKEN" ]; then
  echo -e "${RED}✗ Failed to get staff token${NC}"
  echo "Response: $STAFF_RESPONSE"
else
  echo -e "${GREEN}✓ Staff token obtained${NC}"
  echo "Token: ${STAFF_TOKEN:0:50}..."
fi
echo ""

# Get token for PM (userId=29)
echo -e "${YELLOW}2. Authenticating PM User (userId=29)${NC}"
PM_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"29","bypass":"iGNOre"}')

PM_TOKEN=$(echo "$PM_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$PM_TOKEN" ]; then
  echo -e "${RED}✗ Failed to get PM token${NC}"
  echo "Response: $PM_RESPONSE"
else
  echo -e "${GREEN}✓ PM token obtained${NC}"
  echo "Token: ${PM_TOKEN:0:50}..."
fi
echo ""

# Test endpoints with staff token
if [ -n "$STAFF_TOKEN" ]; then
  echo -e "${YELLOW}3. Testing endpoints as Staff (userId=47)${NC}"
  echo -e "${BLUE}─────────────────────────────────────────${NC}"
  
  # Get user profile
  echo -e "${YELLOW}   a) Get User Profile${NC}"
  curl -s -X GET "$BASE_URL/users/profile" \
    -H "Authorization: Bearer $STAFF_TOKEN" \
    -H "accept: application/json" | jq '.data | {id, email, role, department}'
  echo ""
  
  # Get requisitions
  echo -e "${YELLOW}   b) Get Requisitions${NC}"
  curl -s -X GET "$BASE_URL/requisitions?page=1&limit=5" \
    -H "Authorization: Bearer $STAFF_TOKEN" \
    -H "accept: application/json" | jq '.data | length as $count | "Found \($count) requisitions" | if . then . else "No requisitions found" end'
  echo ""
  
  # Get departments
  echo -e "${YELLOW}   c) Get Departments${NC}"
  curl -s -X GET "$BASE_URL/departments" \
    -H "Authorization: Bearer $STAFF_TOKEN" \
    -H "accept: application/json" | jq '.data | length as $count | "Found \($count) departments"'
  echo ""
fi

# Test endpoints with PM token
if [ -n "$PM_TOKEN" ]; then
  echo -e "${YELLOW}4. Testing endpoints as PM (userId=29)${NC}"
  echo -e "${BLUE}─────────────────────────────────────────${NC}"
  
  # Get user profile
  echo -e "${YELLOW}   a) Get User Profile${NC}"
  curl -s -X GET "$BASE_URL/users/profile" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "accept: application/json" | jq '.data | {id, email, role, department}'
  echo ""
  
  # Get requisitions
  echo -e "${YELLOW}   b) Get Requisitions${NC}"
  curl -s -X GET "$BASE_URL/requisitions?page=1&limit=5" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "accept: application/json" | jq '.data | length as $count | "Found \($count) requisitions"'
  echo ""
  
  # Get vendors
  echo -e "${YELLOW}   c) Get Vendors${NC}"
  curl -s -X GET "$BASE_URL/vendors?page=1&limit=5" \
    -H "Authorization: Bearer $PM_TOKEN" \
    -H "accept: application/json" | jq '.data | length as $count | "Found \($count) vendors"'
  echo ""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Verification complete${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

