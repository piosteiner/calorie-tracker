# 🔐 Admin User Management API Reference

**Date:** October 9, 2025  
**Status:** Production Ready ✅  
**Base URL:** `https://api.calorie-tracker.piogino.ch/api/admin`

---

## 📋 Overview

Complete API reference for admin user management operations including creating, reading, updating user details, and password management.

**Authentication Required:** Admin JWT Token  
**Headers Required:**
```javascript
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

---

## 👥 User Management Endpoints

### 1. Get All Users

**Endpoint:** `GET /api/admin/users`

**Description:** Retrieve all users with statistics

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "daily_calorie_goal": 2200,
      "created_at": "2025-01-15T10:30:00.000Z",
      "is_active": 1,
      "total_logs": 45,
      "total_calories": 98500
    }
  ]
}
```

---

### 2. Get User Details

**Endpoint:** `GET /api/admin/users/:userId`

**Description:** Get detailed information about a specific user

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "daily_calorie_goal": 2200,
    "created_at": "2025-01-15T10:30:00.000Z",
    "is_active": 1,
    "active_sessions": 2,
    "last_activity": "2025-10-09T14:30:00.000Z"
  },
  "foodLogs": [
    {
      "id": 123,
      "user_id": 1,
      "food_id": 45,
      "food_name": "Apple",
      "category": "fruits",
      "quantity": 150,
      "calories": 78,
      "logged_at": "2025-10-09T12:00:00.000Z"
    }
  ]
}
```

---

### 3. Create New User ⭐ NEW

**Endpoint:** `POST /api/admin/users`

**Description:** Create a new regular user account (admin only creates regular users, not admins)

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",       // Optional
  "dailyCalorieGoal": 2200            // Optional, default 2200
}
```

**Validation Rules:**
- `username`: Required, minimum 3 characters, must be unique
- `password`: Required, minimum 6 characters
- `email`: Optional, must be valid email format, must be unique if provided
- `dailyCalorieGoal`: Optional, range 1000-5000, default 2200

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 5,
    "username": "newuser",
    "email": "user@example.com",
    "dailyCalorieGoal": 2200,
    "role": "user"
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

**409 - Duplicate Username:**
```json
{
  "success": false,
  "error": "Username already exists"
}
```

**409 - Duplicate Email:**
```json
{
  "success": false,
  "error": "Email already exists"
}
```

---

### 4. Update User Details ⭐ NEW

**Endpoint:** `PUT /api/admin/users/:id`

**Description:** Update user profile information (all fields optional)

**Request Body:**
```json
{
  "username": "updatedusername",     // Optional
  "email": "newemail@example.com",   // Optional
  "dailyCalorieGoal": 2500,          // Optional
  "role": "admin",                   // Optional: "user" or "admin"
  "isActive": true                   // Optional: true or false
}
```

**Validation Rules:**
- `username`: Min 3 characters, must be unique (if changed)
- `email`: Valid email format, must be unique (if changed), can be null
- `dailyCalorieGoal`: Range 1000-5000
- `role`: Must be "user" or "admin"
- `isActive`: Boolean

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 5,
    "username": "updatedusername",
    "email": "newemail@example.com",
    "daily_calorie_goal": 2500,
    "role": "user",
    "is_active": 1,
    "created_at": "2025-10-01T10:00:00.000Z",
    "updated_at": "2025-10-09T15:30:00.000Z"
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "error": "Username must be at least 3 characters long"
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

**409 - Duplicate Username/Email:**
```json
{
  "success": false,
  "error": "Username already exists"
}
```

---

### 5. Change User Password ⭐ NEW

**Endpoint:** `PUT /api/admin/users/:id/change-password`

**Description:** Change a user's password (admin can change any user's password without knowing current password)

**Request Body:**
```json
{
  "newPassword": "newsecurepassword123"
}
```

**Validation Rules:**
- `newPassword`: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 6. Reset User Password (Legacy)

**Endpoint:** `POST /api/admin/users/:userId/reset-password`

**Description:** Legacy endpoint - use `PUT /api/admin/users/:id/change-password` instead

**Note:** Both endpoints work identically. The new PUT endpoint follows RESTful conventions better.

---

## 🔄 API Comparison

| Action | Old Endpoint | New Endpoint | Status |
|--------|-------------|--------------|--------|
| Create User | ❌ None | `POST /api/admin/users` | ✅ Added |
| Update User Details | ❌ None | `PUT /api/admin/users/:id` | ✅ Added |
| Change Password | `POST /users/:userId/reset-password` | `PUT /users/:id/change-password` | ✅ Added |
| Get All Users | `GET /api/admin/users` | - | ✅ Exists |
| Get User Details | `GET /api/admin/users/:userId` | - | ✅ Exists |

---

## 💡 Usage Examples

### Example 1: Create a New User

```javascript
const createUser = async () => {
  const response = await fetch('https://api.calorie-tracker.piogino.ch/api/admin/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'newuser123',
      password: 'secure123',
      email: 'newuser@example.com',
      dailyCalorieGoal: 2000
    })
  });

  const data = await response.json();
  console.log('User created:', data.user);
};
```

---

### Example 2: Update User Details

```javascript
const updateUser = async (userId) => {
  const response = await fetch(`https://api.calorie-tracker.piogino.ch/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'updated@example.com',
      dailyCalorieGoal: 2500,
      isActive: true
    })
  });

  const data = await response.json();
  console.log('User updated:', data.user);
};
```

---

### Example 3: Change User Password

```javascript
const changePassword = async (userId) => {
  const response = await fetch(`https://api.calorie-tracker.piogino.ch/api/admin/users/${userId}/change-password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      newPassword: 'newSecurePassword123'
    })
  });

  const data = await response.json();
  console.log('Password changed:', data.message);
};
```

---

### Example 4: Update Multiple User Fields

```javascript
const updateMultipleFields = async (userId) => {
  const response = await fetch(`https://api.calorie-tracker.piogino.ch/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'renameduser',
      email: 'newemail@example.com',
      dailyCalorieGoal: 2800,
      role: 'admin',
      isActive: true
    })
  });

  const data = await response.json();
  console.log('User updated with multiple fields:', data.user);
};
```

---

### Example 5: Deactivate a User

```javascript
const deactivateUser = async (userId) => {
  const response = await fetch(`https://api.calorie-tracker.piogino.ch/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      isActive: false
    })
  });

  const data = await response.json();
  console.log('User deactivated:', data.user);
};
```

---

## 🔒 Security Features

### Password Handling
- ✅ **Bcrypt Hashing:** All passwords hashed with bcrypt (12 rounds)
- ✅ **Never Stored Plain:** Passwords never stored in plain text
- ✅ **Minimum Length:** 6 characters minimum enforced
- ✅ **Admin Override:** Admins can change passwords without current password

### Audit Logging
All admin operations are logged for security audit:
```
Admin johnadmin created new user: newuser (ID: 5)
Admin johnadmin updated user ID 5
Admin johnadmin changed password for user newuser (ID: 5)
```

### Duplicate Prevention
- ✅ Username uniqueness enforced
- ✅ Email uniqueness enforced
- ✅ Checks both on create and update

### Data Validation
- ✅ Input sanitization
- ✅ Type validation
- ✅ Range validation
- ✅ Format validation (email)

---

## 🧪 Testing with cURL

### Create User
```bash
curl -X POST https://api.calorie-tracker.piogino.ch/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "email": "test@example.com",
    "dailyCalorieGoal": 2200
  }'
```

### Update User Details
```bash
curl -X PUT https://api.calorie-tracker.piogino.ch/api/admin/users/5 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "dailyCalorieGoal": 2500
  }'
```

### Change Password
```bash
curl -X PUT https://api.calorie-tracker.piogino.ch/api/admin/users/5/change-password \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "newsecure123"
  }'
```

### Get All Users
```bash
curl -X GET https://api.calorie-tracker.piogino.ch/api/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

### Get User Details
```bash
curl -X GET https://api.calorie-tracker.piogino.ch/api/admin/users/5 \
  -H "Authorization: Bearer <admin_token>"
```

---

## 📊 Complete Admin User Management Flow

```
1. GET /api/admin/users
   ↓ (Get list of all users)
   
2. POST /api/admin/users
   ↓ (Create new user)
   
3. GET /api/admin/users/:id
   ↓ (View user details)
   
4. PUT /api/admin/users/:id
   ↓ (Update user profile)
   
5. PUT /api/admin/users/:id/change-password
   ↓ (Change user password)
   
6. PUT /api/admin/users/:id (isActive: false)
   ↓ (Deactivate user if needed)
```

---

## ✅ API Status Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/users` | GET | List all users | ✅ Working |
| `/admin/users/:userId` | GET | Get user details | ✅ Working |
| `/admin/users` | POST | Create user | ✅ NEW |
| `/admin/users/:id` | PUT | Update user | ✅ NEW |
| `/admin/users/:id/change-password` | PUT | Change password | ✅ NEW |
| `/admin/users/:userId/reset-password` | POST | Reset password (legacy) | ✅ Working |

---

## 🎯 Next Steps for Frontend

1. **Admin User List Page:**
   - Display all users in a table
   - Add "Create User" button
   - Add "Edit" button per user
   - Add "Change Password" button per user

2. **Create User Modal:**
   - See: `/docs/USER_MANAGEMENT_FRONTEND.md` - Feature 1

3. **Edit User Modal:**
   - Form with username, email, dailyCalorieGoal, role, isActive fields
   - Pre-populate with current values
   - Call `PUT /admin/users/:id`

4. **Change Password Modal:**
   - Simple form with new password field
   - Call `PUT /admin/users/:id/change-password`

---

**Backend Status:** ✅ 100% Complete  
**All CRUD Operations:** ✅ Available  
**Production Ready:** ✅ Deployed  

**Let's build complete user management! 🚀**
