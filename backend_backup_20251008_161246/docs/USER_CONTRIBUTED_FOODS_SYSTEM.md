# User-Contributed Foods & Pios Food DB Growth System

## 📖 Overview

This system enables **organic growth** of "Pios Food DB" by capturing user-contributed foods and providing admin tools to review and promote quality contributions to the official database.

---

## 🎯 Key Concepts

### **1. Food Sources**
Foods are categorized by source:
- **`system`**: Official Pios Food DB foods (verified)
- **`custom`**: User-created foods (pending review)
- **`imported`**: Foods from external APIs

### **2. Verification Status**
- **`is_verified = 0`**: User-contributed, pending review
- **`is_verified = 1`**: Official Pios Food DB entry

### **3. Visibility**
- **`is_public = 1`**: Visible to all users
- **`is_public = 0`**: Private to creator only

---

## 🔄 Workflow

```
User Creates Food
       ↓
[User-Contributed Food]
  (custom, unverified)
       ↓
Admin Reviews in Panel
       ↓
   ┌───┴───┐
Promote  Reject
   ↓       ↓
[Pios    [Note
 Food     Added]
  DB]
```

---

## 🚀 API Endpoints

### **Get User-Contributed Foods**
```
GET /api/admin/user-foods
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `sortBy` (string): `popularity` | `recent` | `alphabetical` (default: popularity)
- `minUsage` (number): Minimum usage count filter (default: 0)

**Response:**
```json
{
  "success": true,
  "foods": [
    {
      "id": 142,
      "name": "Homemade Protein Shake",
      "calories_per_100g": 280,
      "brand": "Homemade",
      "distributor": null,
      "created_by": 5,
      "creator_username": "john_doe",
      "creator_email": "john@example.com",
      "times_logged": 12,
      "unique_users": 3,
      "last_used_at": "2025-10-08T10:30:00.000Z",
      "created_at": "2025-10-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "totalPages": 1
  }
}
```

---

### **Get Contribution Statistics**
```
GET /api/admin/user-foods/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_user_foods": 45,
    "total_contributors": 12,
    "total_logs_of_user_foods": 234,
    "avg_usage_per_food": 5.2,
    "popular_foods_count": 8,
    "very_popular_foods_count": 3
  },
  "topContributors": [
    {
      "id": 5,
      "username": "john_doe",
      "foods_contributed": 12,
      "total_usage": 45
    }
  ]
}
```

---

### **Promote Food to Pios Food DB**
```
POST /api/admin/user-foods/:id/promote
```

**Request Body:**
```json
{
  "editedData": {
    "name": "Homemade Protein Shake",
    "calories_per_100g": 280,
    "protein_per_100g": 25,
    "carbs_per_100g": 30,
    "fat_per_100g": 8,
    "brand": "Generic",
    "distributor": null,
    "description": "High-protein shake made with whey protein, milk, and banana",
    "category_id": 7
  },
  "notes": "Popular user contribution - verified nutrition values and standardized name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "\"Homemade Protein Shake\" has been promoted to Pios Food DB",
  "food": {
    "id": 142,
    "name": "Homemade Protein Shake",
    "is_verified": 1,
    "verified_by": 1,
    "verified_at": "2025-10-08T16:00:00.000Z",
    "verified_by_username": "admin",
    "source": "system"
  }
}
```

**What This Does:**
1. Optionally edits the food data (clean up, standardize)
2. Marks `is_verified = 1`
3. Sets `source = 'system'`
4. Records who verified it and when
5. Makes it officially part of Pios Food DB
6. Adds admin notes about the promotion

---

### **Reject Food Contribution**
```
POST /api/admin/user-foods/:id/reject
```

**Request Body:**
```json
{
  "reason": "Duplicate of existing food or inaccurate nutrition data"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Food contribution rejected and noted"
}
```

---

### **Delete User Food**
```
DELETE /api/admin/user-foods/:id
```

**Response:**
```json
{
  "success": true,
  "message": "User-contributed food deleted"
}
```

**Note:** Can only delete foods that haven't been logged yet.

---

### **Get Pios Food DB (All Verified Foods)**
```
GET /api/admin/pios-food-db
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page (default: 100)
- `search` (string): Search by name, brand, or distributor

**Response:**
```json
{
  "success": true,
  "foods": [
    {
      "id": 1,
      "name": "Apple",
      "calories_per_100g": 52,
      "is_verified": 1,
      "verified_by_username": "admin",
      "creator_username": null,
      "total_logs": 456,
      "unique_users": 89
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 234,
    "totalPages": 3
  }
}
```

---

## 💾 Database Schema

### **New Fields in `foods` Table**

```sql
is_public          TINYINT(1)    -- Whether food is visible to all users
verified_by        INT           -- Admin user ID who verified this food
verified_at        TIMESTAMP     -- When food was verified/promoted
contribution_notes TEXT          -- Admin notes about this contribution
usage_count        INT           -- Number of times food has been logged
```

### **Database Views**

#### **user_contributed_foods**
Shows all pending user contributions with usage statistics:
```sql
SELECT * FROM user_contributed_foods;
```

#### **pios_food_db**
Shows all official verified foods:
```sql
SELECT * FROM pios_food_db;
```

---

## 📊 Admin Panel Use Cases

### **1. Review Popular User Foods**
```
GET /api/admin/user-foods?sortBy=popularity&minUsage=5
```
Shows foods that have been logged at least 5 times - likely quality contributions.

### **2. Find Recent Contributions**
```
GET /api/admin/user-foods?sortBy=recent&page=1&limit=20
```
See the latest foods users have added.

### **3. Promote High-Quality Food**
```javascript
// Admin reviews food ID 142, edits it, and promotes
POST /api/admin/user-foods/142/promote
{
  "editedData": {
    "name": "Protein Shake - Vanilla",
    "calories_per_100g": 280,
    "protein_per_100g": 25
  },
  "notes": "Standardized name and verified nutrition"
}
```

### **4. Check Contribution Statistics**
```
GET /api/admin/user-foods/stats
```
See how many users are contributing and which foods are popular.

---

## 🎨 User Experience

### **For Regular Users**
When creating a food:
```json
POST /api/foods
{
  "name": "My Homemade Smoothie",
  "caloriesPerUnit": 180,
  "defaultUnit": "100g"
}

Response:
{
  "success": true,
  "foodId": 145,
  "contributedToDatabase": true
}
```

The user sees they contributed to the database!

### **For Admins**
1. **View Dashboard**: See all user contributions
2. **Sort by Popularity**: Find foods worth adding
3. **Edit & Promote**: Clean up data and add to Pios Food DB
4. **Track Contributors**: See which users contribute quality foods

---

## 🔄 Migration Path

### **Existing Foods**
The migration automatically:
- Sets `source='system'` and `is_verified=1` for admin-created foods
- Keeps `source='custom'` and `is_verified=0` for user foods
- Adds tracking fields without disrupting existing data

### **Future Foods**
All new user-created foods are automatically tracked with:
- `created_by`: User ID
- `source='custom'`
- `is_verified=0`
- `is_public=1` (visible to all by default)

---

## 📈 Growth Strategy

### **Phase 1: Organic Collection**
Users naturally create foods they can't find → Database grows organically

### **Phase 2: Quality Promotion**
Admin regularly reviews popular user foods → Promotes quality ones

### **Phase 3: Reduced Overhead**
As Pios Food DB grows → Users find more foods → Less manual entry needed

**Result:** Self-sustaining, community-driven food database! 🎉

---

## 🛡️ Data Quality

### **Quality Indicators**
- **Usage Count**: Foods logged multiple times are likely accurate
- **Unique Users**: Multiple users using same food = high confidence
- **Creator History**: Track which users contribute quality data

### **Admin Tools**
- **Edit Before Promote**: Fix typos, standardize names
- **Add Notes**: Document why food was promoted/rejected
- **Delete Unused**: Remove low-quality contributions

---

## 🎯 Success Metrics

Track these KPIs:
1. **User Contribution Rate**: How many users create foods
2. **Promotion Rate**: % of user foods promoted to Pios DB
3. **Database Growth**: Pios Food DB size over time
4. **Manual Entry Reduction**: Fewer new user foods over time

---

**Implementation Date**: October 8, 2025  
**Status**: ✅ **PRODUCTION READY**

**Goal**: Grow Pios Food DB from ~150 foods to 1000+ through community contributions! 🚀
