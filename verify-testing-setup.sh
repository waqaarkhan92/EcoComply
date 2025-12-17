#!/bin/bash

# Verification Script for Testing Setup
# Run this to verify everything is ready

set -e

echo "🔍 Verifying Testing Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track status
ALL_GOOD=true

# 1. Check test directory structure
echo "📁 Checking test directory structure..."
REQUIRED_DIRS=("tests/unit" "tests/integration" "tests/e2e" "tests/helpers" "tests/fixtures")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "  ${GREEN}✓${NC} $dir exists"
  else
    echo -e "  ${RED}✗${NC} $dir missing"
    ALL_GOOD=false
  fi
done
echo ""

# 2. Check test files
echo "📝 Checking example test files..."
REQUIRED_FILES=(
  "tests/setup.ts"
  "tests/helpers/test-database.ts"
  "tests/helpers/mock-data.ts"
  "tests/unit/lib/ai/model-router.test.ts"
  "tests/unit/lib/ai/document-filter.test.ts"
  "tests/integration/api/obligations.test.ts"
  "tests/e2e/document-workflow.spec.ts"
)
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file exists"
  else
    echo -e "  ${RED}✗${NC} $file missing"
    ALL_GOOD=false
  fi
done
echo ""

# 3. Check documentation
echo "📚 Checking documentation..."
REQUIRED_DOCS=(
  "COMPREHENSIVE_TESTING_STRATEGY.md"
  "TEST_IMPLEMENTATION_GUIDE.md"
  "TESTING_CHECKLIST.md"
  "TESTING_STRATEGY_COMPLETE.md"
)
for doc in "${REQUIRED_DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo -e "  ${GREEN}✓${NC} $doc exists"
  else
    echo -e "  ${RED}✗${NC} $doc missing"
    ALL_GOOD=false
  fi
done
echo ""

# 4. Check Jest configuration
echo "⚙️  Checking Jest configuration..."
if [ -f "jest.config.new.js" ]; then
  echo -e "  ${GREEN}✓${NC} jest.config.new.js exists"
  echo -e "  ${YELLOW}⚠${NC}  Run: mv jest.config.new.js jest.config.js to activate"
elif [ -f "jest.config.js" ]; then
  # Check if it has the new setup
  if grep -q "tests/setup.ts" jest.config.js; then
    echo -e "  ${GREEN}✓${NC} jest.config.js is updated"
  else
    echo -e "  ${YELLOW}⚠${NC}  jest.config.js exists but may need updating"
  fi
else
  echo -e "  ${RED}✗${NC} No Jest config found"
  ALL_GOOD=false
fi
echo ""

# 5. Check package.json test scripts
echo "📦 Checking package.json test scripts..."
if [ -f "package.json" ]; then
  if grep -q "\"test\":" package.json; then
    echo -e "  ${GREEN}✓${NC} test script exists"
  else
    echo -e "  ${RED}✗${NC} test script missing in package.json"
    ALL_GOOD=false
  fi

  if grep -q "\"test:coverage\":" package.json; then
    echo -e "  ${GREEN}✓${NC} test:coverage script exists"
  else
    echo -e "  ${YELLOW}⚠${NC}  test:coverage script recommended"
  fi

  if grep -q "\"test:e2e\":" package.json; then
    echo -e "  ${GREEN}✓${NC} test:e2e script exists"
  else
    echo -e "  ${YELLOW}⚠${NC}  test:e2e script recommended"
  fi
else
  echo -e "  ${RED}✗${NC} package.json not found"
  ALL_GOOD=false
fi
echo ""

# 6. Check required dependencies
echo "📚 Checking required dependencies..."
if [ -f "package.json" ]; then
  REQUIRED_DEPS=("jest" "@testing-library/react" "@testing-library/jest-dom" "@playwright/test")
  for dep in "${REQUIRED_DEPS[@]}"; do
    if grep -q "\"$dep\":" package.json; then
      echo -e "  ${GREEN}✓${NC} $dep installed"
    else
      echo -e "  ${YELLOW}⚠${NC}  $dep may need installation"
    fi
  done
else
  echo -e "  ${RED}✗${NC} Cannot check dependencies (package.json missing)"
fi
echo ""

# 7. Check environment variables
echo "🔐 Checking environment variables..."
ENV_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "OPENAI_API_KEY")
for var in "${ENV_VARS[@]}"; do
  if [ -n "${!var}" ]; then
    echo -e "  ${GREEN}✓${NC} $var is set"
  else
    echo -e "  ${YELLOW}⚠${NC}  $var not set (tests may use defaults)"
  fi
done
echo ""

# Final summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ALL_GOOD" = true ]; then
  echo -e "${GREEN}✅ All required components are in place!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. mv jest.config.new.js jest.config.js"
  echo "  2. npm install --save-dev @axe-core/playwright jest-axe msw"
  echo "  3. npm test"
  echo "  4. npm run test:coverage"
  echo ""
  echo "📖 Read TESTING_STRATEGY_COMPLETE.md for full guide"
else
  echo -e "${RED}❌ Some components are missing${NC}"
  echo ""
  echo "Please review the errors above and fix any missing components."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
