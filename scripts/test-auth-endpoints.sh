#!/bin/bash
# Test Authentication Endpoints
# Tests all auth endpoints: signup, login, logout, refresh, me

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api/v1"

echo "=========================================="
echo "Testing Authentication Endpoints"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    
    echo "Testing: $name"
    echo "  Method: $method"
    echo "  URL: $url"
    
    if [ -n "$data" ]; then
        echo "  Body: $data"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $http_code (expected $expected_status)"
        echo "  Response: $body" | head -c 200
        echo ""
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}❌ FAIL${NC} - Status: $http_code (expected $expected_status)"
        echo "  Response: $body"
        echo ""
        ((FAILED++))
        return 1
    fi
}

# Generate test data
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123"
TEST_COMPANY="Test Company $(date +%s)"
TEST_FULL_NAME="Test User"

echo "Test Data:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  Company: $TEST_COMPANY"
echo "  Full Name: $TEST_FULL_NAME"
echo ""

# Test 1: Health Check
echo "=========================================="
echo "Test 1: Health Check"
echo "=========================================="
test_endpoint "Health Check" "GET" "$API_URL/health" "" 200
HEALTH_RESPONSE=$?

if [ $HEALTH_RESPONSE -ne 0 ]; then
    echo -e "${RED}❌ Health check failed. Is the server running?${NC}"
    echo "Start server with: npm run dev"
    exit 1
fi

echo ""

# Test 2: Signup - Valid
echo "=========================================="
echo "Test 2: Signup - Valid Request"
echo "=========================================="
SIGNUP_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "full_name": "$TEST_FULL_NAME",
  "company_name": "$TEST_COMPANY"
}
EOF
)
test_endpoint "Signup (Valid)" "POST" "$API_URL/auth/signup" "$SIGNUP_DATA" 201

# Extract tokens from response (if successful)
if [ $? -eq 0 ]; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4 || echo "")
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo "  ✅ Access token received"
    else
        echo -e "  ${YELLOW}⚠️  No access token (email verification may be required)${NC}"
    fi
fi

echo ""

# Test 3: Signup - Duplicate Email
echo "=========================================="
echo "Test 3: Signup - Duplicate Email"
echo "=========================================="
test_endpoint "Signup (Duplicate Email)" "POST" "$API_URL/auth/signup" "$SIGNUP_DATA" 409

echo ""

# Test 4: Signup - Invalid Email
echo "=========================================="
echo "Test 4: Signup - Invalid Email"
echo "=========================================="
INVALID_EMAIL_DATA=$(cat <<EOF
{
  "email": "invalid-email",
  "password": "$TEST_PASSWORD",
  "full_name": "$TEST_FULL_NAME",
  "company_name": "$TEST_COMPANY"
}
EOF
)
test_endpoint "Signup (Invalid Email)" "POST" "$API_URL/auth/signup" "$INVALID_EMAIL_DATA" 422

echo ""

# Test 5: Signup - Weak Password
echo "=========================================="
echo "Test 5: Signup - Weak Password"
echo "=========================================="
WEAK_PASSWORD_DATA=$(cat <<EOF
{
  "email": "test2_$(date +%s)@example.com",
  "password": "short",
  "full_name": "$TEST_FULL_NAME",
  "company_name": "$TEST_COMPANY"
}
EOF
)
test_endpoint "Signup (Weak Password)" "POST" "$API_URL/auth/signup" "$WEAK_PASSWORD_DATA" 422

echo ""

# Test 6: Signup - Missing Fields
echo "=========================================="
echo "Test 6: Signup - Missing Fields"
echo "=========================================="
MISSING_FIELDS_DATA=$(cat <<EOF
{
  "email": "test3_$(date +%s)@example.com"
}
EOF
)
test_endpoint "Signup (Missing Fields)" "POST" "$API_URL/auth/signup" "$MISSING_FIELDS_DATA" 422

echo ""

# Test 7: Login - Valid (if email verification is disabled)
echo "=========================================="
echo "Test 7: Login - Valid Credentials"
echo "=========================================="
LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
test_endpoint "Login (Valid)" "POST" "$API_URL/auth/login" "$LOGIN_DATA" 200

# Extract tokens from login response
if [ $? -eq 0 ]; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4 || echo "")
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo "  ✅ Access token received"
        echo "  ✅ Refresh token received"
    fi
fi

echo ""

# Test 8: Login - Invalid Credentials
echo "=========================================="
echo "Test 8: Login - Invalid Credentials"
echo "=========================================="
INVALID_LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "WrongPassword123"
}
EOF
)
test_endpoint "Login (Invalid Password)" "POST" "$API_URL/auth/login" "$INVALID_LOGIN_DATA" 401

echo ""

# Test 9: Login - Invalid Email
echo "=========================================="
echo "Test 9: Login - Invalid Email"
echo "=========================================="
INVALID_EMAIL_LOGIN=$(cat <<EOF
{
  "email": "nonexistent@example.com",
  "password": "$TEST_PASSWORD"
}
EOF
)
test_endpoint "Login (Invalid Email)" "POST" "$API_URL/auth/login" "$INVALID_EMAIL_LOGIN" 401

echo ""

# Test 10: Get Current User (if we have a token)
if [ -n "$ACCESS_TOKEN" ]; then
    echo "=========================================="
    echo "Test 10: Get Current User (Me)"
    echo "=========================================="
    response=$(curl -s -w "\n%{http_code}" -X "GET" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$API_URL/auth/me")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $http_code"
        echo "  Response: $body" | head -c 300
        echo ""
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL${NC} - Status: $http_code (expected 200)"
        echo "  Response: $body"
        echo ""
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping 'Me' endpoint test - no access token available${NC}"
    echo "  (Email verification may be required)"
    echo ""
fi

# Test 11: Refresh Token (if we have a refresh token)
if [ -n "$REFRESH_TOKEN" ]; then
    echo "=========================================="
    echo "Test 11: Refresh Token"
    echo "=========================================="
    REFRESH_DATA=$(cat <<EOF
{
  "refresh_token": "$REFRESH_TOKEN"
}
EOF
)
    test_endpoint "Refresh Token" "POST" "$API_URL/auth/refresh" "$REFRESH_DATA" 200
    
    # Extract new tokens
    if [ $? -eq 0 ]; then
        NEW_ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
        if [ -n "$NEW_ACCESS_TOKEN" ]; then
            echo "  ✅ New access token received"
            ACCESS_TOKEN=$NEW_ACCESS_TOKEN
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Skipping refresh token test - no refresh token available${NC}"
    echo ""
fi

# Test 12: Logout (if we have a token)
if [ -n "$ACCESS_TOKEN" ]; then
    echo "=========================================="
    echo "Test 12: Logout"
    echo "=========================================="
    response=$(curl -s -w "\n%{http_code}" -X "POST" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$API_URL/auth/logout")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - Status: $http_code"
        echo "  Response: $body" | head -c 200
        echo ""
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL${NC} - Status: $http_code (expected 200)"
        echo "  Response: $body"
        echo ""
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping logout test - no access token available${NC}"
    echo ""
fi

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

