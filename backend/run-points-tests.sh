#!/bin/bash

# Comprehensive Test Script for Cross-Store Points System
# This script will:
# 1. Check if server is running
# 2. Get admin and store tokens
# 3. Get a customer ID
# 4. Run all tests

set -e

API_URL="${API_URL:-http://localhost:5000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"
STORE_USER_EMAIL="${STORE_USER_EMAIL:-}"
STORE_USER_PASSWORD="${STORE_USER_PASSWORD:-}"
STORE_ID="${STORE_ID:-}"

echo "🚀 Cross-Store Points System Test Suite"
echo "========================================"
echo "API URL: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if server is running
echo -e "${BLUE}📡 Checking if server is running...${NC}"
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Server is running${NC}"
else
  echo -e "${RED}❌ Server is not running at $API_URL${NC}"
  echo "Please start the backend server first:"
  echo "  cd backend && npm start"
  exit 1
fi
echo ""

# Get Admin Token
echo -e "${BLUE}🔐 Getting admin token...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrUsername\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Could not get admin token. Trying with environment variables...${NC}"
  if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Using ADMIN_TOKEN from environment${NC}"
  else
    echo -e "${RED}❌ Could not get admin token. Please set ADMIN_TOKEN environment variable${NC}"
    ADMIN_TOKEN=""
  fi
else
  echo -e "${GREEN}✅ Admin token obtained${NC}"
fi
echo ""

# Get Store User Token (if credentials provided)
if [ -n "$STORE_USER_EMAIL" ] && [ -n "$STORE_USER_PASSWORD" ] && [ -n "$STORE_ID" ]; then
  echo -e "${BLUE}🔐 Getting store user token...${NC}"
  STORE_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"emailOrUsername\":\"$STORE_USER_EMAIL\",\"password\":\"$STORE_USER_PASSWORD\",\"storeId\":\"$STORE_ID\"}")
  
  STORE_TOKEN=$(echo "$STORE_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$STORE_TOKEN" ]; then
    echo -e "${GREEN}✅ Store user token obtained${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not get store user token${NC}"
    STORE_TOKEN=""
  fi
else
  echo -e "${YELLOW}⚠️  Store user credentials not provided. Set STORE_USER_EMAIL, STORE_USER_PASSWORD, and STORE_ID${NC}"
  STORE_TOKEN=""
fi
echo ""

# Get Customer ID (if store token available)
if [ -n "$STORE_TOKEN" ]; then
  echo -e "${BLUE}👤 Getting customer ID...${NC}"
  CUSTOMERS_RESPONSE=$(curl -s -X GET "$API_URL/api/customers" \
    -H "Authorization: Bearer $STORE_TOKEN")
  
  TEST_CUSTOMER_ID=$(echo "$CUSTOMERS_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
  TEST_PHONE=$(echo "$CUSTOMERS_RESPONSE" | grep -o '"phone":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -n "$TEST_CUSTOMER_ID" ]; then
    echo -e "${GREEN}✅ Found customer: $TEST_CUSTOMER_ID${NC}"
    if [ -n "$TEST_PHONE" ]; then
      echo -e "${GREEN}   Phone: $TEST_PHONE${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  No customers found. Tests will be limited${NC}"
    TEST_CUSTOMER_ID=""
    TEST_PHONE=""
  fi
else
  echo -e "${YELLOW}⚠️  Cannot get customer ID without store token${NC}"
  TEST_CUSTOMER_ID=""
  TEST_PHONE=""
fi
echo ""

# Export variables for test script
export API_URL
export ADMIN_TOKEN
export STORE_TOKEN
export STORE_ID
export TEST_CUSTOMER_ID
export TEST_PHONE

# Run Node.js test script
echo -e "${BLUE}🧪 Running comprehensive tests...${NC}"
echo ""

if [ -f "test-points-system.js" ]; then
  node test-points-system.js
  TEST_EXIT_CODE=$?
else
  echo -e "${RED}❌ test-points-system.js not found${NC}"
  TEST_EXIT_CODE=1
fi

echo ""
echo "========================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests completed successfully!${NC}"
else
  echo -e "${YELLOW}⚠️  Some tests may have failed. Review output above.${NC}"
fi
echo ""

# Summary
echo "📊 Test Summary"
echo "========================================"
echo "Admin Token: ${ADMIN_TOKEN:+✅ Set}${ADMIN_TOKEN:-❌ Not set}"
echo "Store Token: ${STORE_TOKEN:+✅ Set}${STORE_TOKEN:-❌ Not set}"
echo "Customer ID: ${TEST_CUSTOMER_ID:+✅ Set}${TEST_CUSTOMER_ID:-❌ Not set}"
echo "Test Phone: ${TEST_PHONE:+✅ Set}${TEST_PHONE:-❌ Not set}"
echo ""

exit $TEST_EXIT_CODE

