#!/bin/bash

# Test script for Personal OS Edge Functions
# Usage: ./test-edge-functions.sh

set -e

SUPABASE_URL="https://qluxovfszsvdhmgkbvmp.supabase.co"
ANON_KEY="sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ"

echo "🧪 Testing Personal OS Edge Functions"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we have required environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ ANON_KEY not set${NC}"
    exit 1
fi

# Test parse-log function
echo ""
echo -e "${YELLOW}Testing parse-log function...${NC}"
PARSE_TEST=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/parse-log" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text":"Today I studied React for 90 minutes and went to the gym."}')

if echo "$PARSE_TEST" | grep -q "activities"; then
    echo -e "${GREEN}✓ parse-log responded successfully${NC}"
    echo "Response: $PARSE_TEST"
else
    echo -e "${RED}✗ parse-log did not return expected response${NC}"
    echo "Response: $PARSE_TEST"
fi

# Test ai-assistant function (requires actual auth)
echo ""
echo -e "${YELLOW}Note: ai-assistant requires authenticated user${NC}"
echo "To test, use the app Assistant tab"

echo ""
echo -e "${GREEN}✓ Basic connectivity test complete${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'npm start' to launch the app"
echo "2. Log in with your Supabase user"
echo "3. Test the capture and assistant features"
