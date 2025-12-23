#!/bin/bash

# Quick Test Script for Cross-Store Points System
# Usage: ./test-points-quick.sh

# Configuration - UPDATE THESE VALUES
API_URL="${API_URL:-http://localhost:5000}"
ADMIN_TOKEN="${ADMIN_TOKEN}"
STORE_TOKEN="${STORE_TOKEN}"
STORE_ID="${STORE_ID:-store1}"
TEST_PHONE="${TEST_PHONE:-1234567890}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID}"

echo "🚀 Testing Cross-Store Points System"
echo "======================================"
echo "API URL: $API_URL"
echo "Store ID: $STORE_ID"
echo "Test Phone: $TEST_PHONE"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get Customer Points by Phone
echo "📝 Test 1: Get Customer Points by Phone"
if [ -z "$STORE_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping: STORE_TOKEN not set${NC}"
else
  response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/points/customer?phone=$TEST_PHONE" \
    -H "Authorization: Bearer $STORE_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Success${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
fi
echo ""

# Test 2: Get Customer Points History
echo "📝 Test 2: Get Customer Points History"
if [ -z "$STORE_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping: STORE_TOKEN not set${NC}"
else
  response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/points/customer/history?phone=$TEST_PHONE&page=1&limit=5" \
    -H "Authorization: Bearer $STORE_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Success${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
fi
echo ""

# Test 3: Get Store Points Account
echo "📝 Test 3: Get Store Points Account"
if [ -z "$STORE_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping: STORE_TOKEN not set${NC}"
else
  response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/store-points-accounts/$STORE_ID" \
    -H "Authorization: Bearer $STORE_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Success${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
fi
echo ""

# Test 4: Get All Store Points Accounts (Admin)
echo "📝 Test 4: Get All Store Points Accounts (Admin)"
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping: ADMIN_TOKEN not set${NC}"
else
  response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/store-points-accounts" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Success${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
fi
echo ""

# Test 5: Get Points Settings (Admin)
echo "📝 Test 5: Get Points Settings (Admin)"
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping: ADMIN_TOKEN not set${NC}"
else
  response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/admin/points-settings" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Success${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
fi
echo ""

echo "======================================"
echo "✅ Testing complete!"
echo ""
echo "To test adding/redeeming points, use the Node.js test script:"
echo "  node test-points-system.js"

