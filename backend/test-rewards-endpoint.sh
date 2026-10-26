#!/bin/bash

echo "🧪 Testing Rewards Points Endpoint"
echo "=================================="
echo ""

# Test 1: Health check
echo "1️⃣ Testing API health..."
curl -s http://localhost:3000/health | jq '.'
echo ""

# Test 2: Try to access rewards endpoint without auth (should fail)
echo "2️⃣ Testing rewards endpoint without authentication (should fail)..."
curl -s http://localhost:3000/api/rewards/points | jq '.'
echo ""

# Test 3: Login to get a valid token
echo "3️⃣ Logging in to get authentication token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Trying with admin credentials..."
  TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@calorie-tracker.com","password":"admin"}' | jq -r '.token')
fi

echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 4: Get rewards points with valid token
echo "4️⃣ Testing rewards endpoint with authentication..."
RESPONSE=$(curl -s http://localhost:3000/api/rewards/points \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if points is null
POINTS_NULL=$(echo "$RESPONSE" | jq '.points == null')
if [ "$POINTS_NULL" = "true" ]; then
  echo "❌ ERROR: points is null!"
  echo "Check PM2 logs: pm2 logs calorie-tracker-api --lines 50"
else
  echo "✅ SUCCESS: Points data returned correctly"
  echo "Current Points: $(echo "$RESPONSE" | jq '.points.currentPoints')"
  echo "Lifetime Points: $(echo "$RESPONSE" | jq '.points.lifetimePoints')"
  echo "Level: $(echo "$RESPONSE" | jq '.points.level')"
fi

echo ""
echo "📊 Check server logs for detailed debugging:"
echo "pm2 logs calorie-tracker-api --lines 50"
