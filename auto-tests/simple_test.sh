#!/bin/bash

BASE_URL="http://localhost:3003/api"
BYPASS="iGNOre"

echo "=========================================="
echo "Testing API Endpoints"
echo "=========================================="
echo ""

# Test 1: Try login with userId 47 - Staff
echo "1. Testing Staff Login (userId=47)"
echo "─────────────────────────────────"
curl -v -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"47\",\"bypass\":\"$BYPASS\"}" 2>&1 | head -50

echo ""
echo ""

# Test 2: Check server health
echo "2. Testing Server Health"
echo "─────────────────────────────────"
curl -X GET "http://localhost:3003/health"
echo ""
echo ""

# Test 3: Check API docs
echo "3. Testing API Documentation Endpoint"
echo "─────────────────────────────────"
curl -s -X GET "http://localhost:3003/api-docs" | head -c 200
echo "..."
echo ""

