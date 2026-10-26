#!/bin/bash

# Get admin token from environment (export ADMIN_TOKEN=... before running)
ADMIN_TOKEN="${ADMIN_TOKEN:?Set ADMIN_TOKEN env var to a valid admin JWT before running this script}"

echo "🧪 Testing Admin User Management Endpoints"
echo "=========================================="
echo ""

# Test 1: Get all users
echo "1️⃣ Testing GET /api/admin/users"
curl -s -X GET "https://api.calorie-tracker.piogino.ch/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.users[] | {id, username, email, role}' | head -20
echo ""

# Test 2: Create a test user
echo "2️⃣ Testing POST /api/admin/users (Create)"
RESPONSE=$(curl -s -X POST "https://api.calorie-tracker.piogino.ch/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "password": "test123456",
    "email": "test'$(date +%s)'@example.com",
    "dailyCalorieGoal": 2000
  }')

echo "$RESPONSE" | jq '.'
NEW_USER_ID=$(echo "$RESPONSE" | jq -r '.user.id')
echo ""

if [ "$NEW_USER_ID" != "null" ] && [ -n "$NEW_USER_ID" ]; then
  echo "✅ User created with ID: $NEW_USER_ID"
  echo ""
  
  # Test 3: Update user details
  echo "3️⃣ Testing PUT /api/admin/users/$NEW_USER_ID (Update)"
  curl -s -X PUT "https://api.calorie-tracker.piogino.ch/api/admin/users/$NEW_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "updated'$(date +%s)'@example.com",
      "dailyCalorieGoal": 2500
    }' | jq '.'
  echo ""
  
  # Test 4: Change password
  echo "4️⃣ Testing PUT /api/admin/users/$NEW_USER_ID/change-password"
  curl -s -X PUT "https://api.calorie-tracker.piogino.ch/api/admin/users/$NEW_USER_ID/change-password" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "newPassword": "newsecurepass123"
    }' | jq '.'
  echo ""
  
  # Test 5: Get user details
  echo "5️⃣ Testing GET /api/admin/users/$NEW_USER_ID (Details)"
  curl -s -X GET "https://api.calorie-tracker.piogino.ch/api/admin/users/$NEW_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.user'
  echo ""
else
  echo "❌ Failed to create user"
fi

echo ""
echo "✅ All tests completed!"
