#!/bin/bash
# Comprehensive Test Script for Phases 2.0-2.5
# Tests all API endpoints: Auth, Companies, Sites, Users, Documents, Obligations

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api/v1"

echo "=========================================="
echo "Testing All API Endpoints (Phases 2.0-2.5)"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    local token=$6
    
    echo "Testing: $name"
    echo "  Method: $method"
    echo "  URL: $url"
    
    local headers=()
    headers+=("-H" "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=("-H" "Authorization: Bearer $token")
    fi
    
    if [ -n "$data" ]; then
        echo "  Body: $data"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${headers[@]}" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${headers[@]}" \
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

# Test file upload
test_file_upload() {
    local name=$1
    local url=$2
    local file_path=$3
    local form_fields=$4
    local expected_status=$5
    local token=$6
    
    echo "Testing: $name"
    echo "  Method: POST"
    echo "  URL: $url"
    echo "  File: $file_path"
    
    local headers=()
    if [ -n "$token" ]; then
        headers+=("-H" "Authorization: Bearer $token")
    fi
    
    # Build curl command with form data
    local curl_cmd="curl -s -w \"\n%{http_code}\" -X POST"
    for header in "${headers[@]}"; do
        curl_cmd="$curl_cmd $header"
    done
    
    # Add file
    curl_cmd="$curl_cmd -F \"file=@$file_path\""
    
    # Add form fields
    IFS='&' read -ra FIELDS <<< "$form_fields"
    for field in "${FIELDS[@]}"; do
        curl_cmd="$curl_cmd -F \"$field\""
    done
    
    curl_cmd="$curl_cmd \"$url\""
    
    response=$(eval $curl_cmd)
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
ACCESS_TOKEN=""
REFRESH_TOKEN=""
COMPANY_ID=""
SITE_ID=""
USER_ID=""
DOCUMENT_ID=""
OBLIGATION_ID=""

echo "Test Data:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  Company: $TEST_COMPANY"
echo "  Full Name: $TEST_FULL_NAME"
echo ""

# ==========================================
# Phase 2.1: Health Check
# ==========================================
echo -e "${BLUE}=========================================="
echo "Phase 2.1: Health Check"
echo "==========================================${NC}"

test_endpoint "Health Check" "GET" "$API_URL/health" "" 200

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Health check failed. Is the server running?${NC}"
    echo "Start server with: npm run dev"
    exit 1
fi

echo ""

# ==========================================
# Phase 2.2: Authentication
# ==========================================
echo -e "${BLUE}=========================================="
echo "Phase 2.2: Authentication Endpoints"
echo "==========================================${NC}"

# Test 1: Signup
echo "Test 1: Signup"
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

# Extract tokens and IDs from response
if [ $? -eq 0 ]; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4 || echo "")
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    COMPANY_ID=$(echo "$body" | grep -o '"company_id":"[^"]*' | cut -d'"' -f4 || echo "")
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo "  ✅ Access token received"
    else
        echo -e "  ${YELLOW}⚠️  No access token (email verification may be required)${NC}"
        echo "  ${YELLOW}⚠️  You may need to disable email verification in Supabase Dashboard${NC}"
        echo "  ${YELLOW}⚠️  Or manually verify the user in Supabase Dashboard${NC}"
        SKIPPED=1
    fi
fi

echo ""

# Test 2: Login (if we don't have a token)
if [ -z "$ACCESS_TOKEN" ]; then
    echo "Test 2: Login"
    LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
    test_endpoint "Login (Valid)" "POST" "$API_URL/auth/login" "$LOGIN_DATA" 200
    
    if [ $? -eq 0 ]; then
        ACCESS_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || echo "")
        REFRESH_TOKEN=$(echo "$body" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4 || echo "")
        USER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
        COMPANY_ID=$(echo "$body" | grep -o '"company_id":"[^"]*' | cut -d'"' -f4 || echo "")
    fi
    echo ""
fi

# Test 3: Get Current User (Me)
if [ -n "$ACCESS_TOKEN" ]; then
    echo "Test 3: Get Current User (Me)"
    test_endpoint "Get Current User" "GET" "$API_URL/auth/me" "" 200 "$ACCESS_TOKEN"
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping authenticated endpoints - no access token available${NC}"
    echo "  Please disable email verification or verify the user manually"
    echo ""
    SKIPPED=1
fi

# ==========================================
# Phase 2.3: Core Entity Endpoints
# ==========================================
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${BLUE}=========================================="
    echo "Phase 2.3: Core Entity Endpoints"
    echo "==========================================${NC}"
    
    # Companies
    echo "Test 4: Get Companies"
    test_endpoint "Get Companies" "GET" "$API_URL/companies" "" 200 "$ACCESS_TOKEN"
    
    if [ $? -eq 0 ] && [ -n "$COMPANY_ID" ]; then
        echo "Test 5: Get Company by ID"
        test_endpoint "Get Company" "GET" "$API_URL/companies/$COMPANY_ID" "" 200 "$ACCESS_TOKEN"
        
        echo "Test 6: Update Company"
        UPDATE_COMPANY_DATA=$(cat <<EOF
{
  "name": "Updated $TEST_COMPANY"
}
EOF
)
        test_endpoint "Update Company" "PUT" "$API_URL/companies/$COMPANY_ID" "$UPDATE_COMPANY_DATA" 200 "$ACCESS_TOKEN"
    fi
    echo ""
    
    # Sites
    echo "Test 7: Create Site"
    CREATE_SITE_DATA=$(cat <<EOF
{
  "name": "Test Site",
  "address_line_1": "123 Test Street",
  "city": "London",
  "postcode": "SW1A 1AA",
  "regulator": "EA"
}
EOF
)
    test_endpoint "Create Site" "POST" "$API_URL/sites" "$CREATE_SITE_DATA" 201 "$ACCESS_TOKEN"
    
    if [ $? -eq 0 ]; then
        SITE_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
        
        if [ -n "$SITE_ID" ]; then
            echo "Test 8: Get Sites"
            test_endpoint "Get Sites" "GET" "$API_URL/sites" "" 200 "$ACCESS_TOKEN"
            
            echo "Test 9: Get Site by ID"
            test_endpoint "Get Site" "GET" "$API_URL/sites/$SITE_ID" "" 200 "$ACCESS_TOKEN"
            
            echo "Test 10: Update Site"
            UPDATE_SITE_DATA=$(cat <<EOF
{
  "name": "Updated Test Site"
}
EOF
)
            test_endpoint "Update Site" "PUT" "$API_URL/sites/$SITE_ID" "$UPDATE_SITE_DATA" 200 "$ACCESS_TOKEN"
        fi
    fi
    echo ""
    
    # Users
    echo "Test 11: Get Users"
    test_endpoint "Get Users" "GET" "$API_URL/users" "" 200 "$ACCESS_TOKEN"
    
    if [ -n "$USER_ID" ]; then
        echo "Test 12: Get User by ID"
        test_endpoint "Get User" "GET" "$API_URL/users/$USER_ID" "" 200 "$ACCESS_TOKEN"
        
        echo "Test 13: Update User"
        UPDATE_USER_DATA=$(cat <<EOF
{
  "full_name": "Updated $TEST_FULL_NAME"
}
EOF
)
        test_endpoint "Update User" "PUT" "$API_URL/users/$USER_ID" "$UPDATE_USER_DATA" 200 "$ACCESS_TOKEN"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping Phase 2.3 tests - no access token${NC}"
    echo ""
fi

# ==========================================
# Phase 2.4: Document Upload Endpoints
# ==========================================
if [ -n "$ACCESS_TOKEN" ] && [ -n "$SITE_ID" ]; then
    echo -e "${BLUE}=========================================="
    echo "Phase 2.4: Document Upload Endpoints"
    echo "==========================================${NC}"
    
    # Create a test PDF file (minimal valid PDF)
    TEST_PDF="/tmp/test_document.pdf"
    echo "%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
178
%%EOF" > "$TEST_PDF"
    
    echo "Test 14: Upload Document"
    test_file_upload "Upload Document" \
        "$API_URL/documents" \
        "$TEST_PDF" \
        "site_id=$SITE_ID&document_type=PERMIT" \
        201 \
        "$ACCESS_TOKEN"
    
    if [ $? -eq 0 ]; then
        DOCUMENT_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
        
        if [ -n "$DOCUMENT_ID" ]; then
            echo "Test 15: Get Documents"
            test_endpoint "Get Documents" "GET" "$API_URL/documents" "" 200 "$ACCESS_TOKEN"
            
            echo "Test 16: Get Document by ID"
            test_endpoint "Get Document" "GET" "$API_URL/documents/$DOCUMENT_ID" "" 200 "$ACCESS_TOKEN"
            
            echo "Test 17: Update Document"
            UPDATE_DOCUMENT_DATA=$(cat <<EOF
{
  "title": "Updated Test Document"
}
EOF
)
            test_endpoint "Update Document" "PUT" "$API_URL/documents/$DOCUMENT_ID" "$UPDATE_DOCUMENT_DATA" 200 "$ACCESS_TOKEN"
        fi
    fi
    
    # Cleanup test file
    rm -f "$TEST_PDF"
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping Phase 2.4 tests - no access token or site ID${NC}"
    echo ""
fi

# ==========================================
# Phase 2.5: Obligations Endpoints
# ==========================================
if [ -n "$ACCESS_TOKEN" ] && [ -n "$DOCUMENT_ID" ]; then
    echo -e "${BLUE}=========================================="
    echo "Phase 2.5: Obligations Endpoints"
    echo "==========================================${NC}"
    
    echo "Test 18: Get Obligations"
    test_endpoint "Get Obligations" "GET" "$API_URL/obligations" "" 200 "$ACCESS_TOKEN"
    
    # Note: We can't create obligations via API in Phase 2.5 (they're created by background jobs)
    # But we can test getting and updating if any exist
    
    # If we have obligations, test getting one
    OBLIGATIONS_RESPONSE=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        "$API_URL/obligations?limit=1")
    
    OBLIGATION_ID=$(echo "$OBLIGATIONS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -n "$OBLIGATION_ID" ]; then
        echo "Test 19: Get Obligation by ID"
        test_endpoint "Get Obligation" "GET" "$API_URL/obligations/$OBLIGATION_ID" "" 200 "$ACCESS_TOKEN"
        
        echo "Test 20: Update Obligation"
        UPDATE_OBLIGATION_DATA=$(cat <<EOF
{
  "obligation_title": "Updated Test Obligation"
}
EOF
)
        test_endpoint "Update Obligation" "PUT" "$API_URL/obligations/$OBLIGATION_ID" "$UPDATE_OBLIGATION_DATA" 200 "$ACCESS_TOKEN"
        
        echo "Test 21: Mark Obligation as Not Applicable"
        MARK_NA_DATA=$(cat <<EOF
{
  "reason": "Test reason for marking as not applicable"
}
EOF
)
        test_endpoint "Mark Not Applicable" "PUT" "$API_URL/obligations/$OBLIGATION_ID/mark-na" "$MARK_NA_DATA" 200 "$ACCESS_TOKEN"
    else
        echo -e "${YELLOW}⚠️  No obligations found to test (obligations are created by background jobs)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping Phase 2.5 tests - no access token or document ID${NC}"
    echo ""
fi

# ==========================================
# Summary
# ==========================================
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo "==========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
if [ $SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}Skipped: Some tests skipped (email verification required)${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

