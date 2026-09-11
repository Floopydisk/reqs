#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "Testing authentication..."
echo ""

# Test Staff User (userId=47)
echo "1. Testing Staff User (userId=47)"
echo "Request: POST $BASE_URL/auth/login"
STAFF=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"47","bypass":"iGNOre"}')

echo "Response:"
echo "$STAFF" | grep -o '"token":"[^"]*' | head -1 || echo "$STAFF"
echo ""

# Extract token if successful
STAFF_TOKEN=$(echo "$STAFF" | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$STAFF_TOKEN" ]; then
  echo "✓ Staff token obtained successfully"
  echo ""
  
  # Test endpoints
  echo "Testing Staff endpoints:"
  echo "a) GET /users/profile"
  curl -s -X GET "$BASE_URL/users/profile" \
    -H "Authorization: Bearer $STAFF_TOKEN" | head -c 200
  echo ""
  echo ""
fi

# Test PM User (userId=29)
echo "2. Testing PM User (userId=29)"
echo "Request: POST $BASE_URL/auth/login"
PM=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"29","bypass":"iGNOre"}')

echo "Response:"
echo "$PM" | grep -o '"token":"[^"]*' | head -1 || echo "$PM"
echo ""

# Extract token if successful
PM_TOKEN=$(echo "$PM" | grep -o '"token":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$PM_TOKEN" ]; then
  echo "✓ PM token obtained successfully"
  echo ""
  
  # Test endpoints
  echo "Testing PM endpoints:"
  echo "a) GET /users/profile"
  curl -s -X GET "$BASE_URL/users/profile" \
    -H "Authorization: Bearer $PM_TOKEN" | head -c 200
  echo ""
  echo ""
fi

