#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=========================================="
echo "FETCHING AUTHENTICATION TOKENS"
echo "=========================================="
echo ""

# Get Staff Token (userId=47)
echo "1. Authenticating Staff User (userId=47)..."
STAFF_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"47","bypass":"iGNOre"}')

echo "Response:"
echo "$STAFF_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STAFF_RESPONSE"
echo ""

# Extract staff token
STAFF_TOKEN=$(echo "$STAFF_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ ! -z "$STAFF_TOKEN" ]; then
  echo "✓ Staff Token acquired successfully"
  echo "Token: $STAFF_TOKEN"
  echo ""
fi

# Get PM Token (userId=29)
echo "2. Authenticating PM User (userId=29)..."
PM_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"29","bypass":"iGNOre"}')

echo "Response:"
echo "$PM_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PM_RESPONSE"
echo ""

# Extract PM token
PM_TOKEN=$(echo "$PM_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ ! -z "$PM_TOKEN" ]; then
  echo "✓ PM Token acquired successfully"
  echo "Token: $PM_TOKEN"
  echo ""
fi

# Save tokens to a file for later use
echo "Saving tokens to tokens.txt..."
cat > tokens.txt << TOKENS
STAFF_TOKEN=$STAFF_TOKEN
PM_TOKEN=$PM_TOKEN
TOKENS

echo "✓ Tokens saved to tokens.txt"
echo ""
echo "=========================================="
echo "TOKEN EXTRACTION COMPLETE"
echo "=========================================="

