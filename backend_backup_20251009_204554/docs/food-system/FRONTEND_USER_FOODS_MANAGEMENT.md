# 🎨 Frontend Copilot Prompt: User-Contributed Foods & Pios Food DB Management

## 📋 **Context & Background**

The backend has been enhanced with a **User-Contributed Foods Management System** that enables:
1. **Automatic tracking** of user-created foods
2. **Admin review panel** for evaluating contributions  
3. **Promotion workflow** to add quality foods to "Pios Food DB"
4. **Organic database growth** through community contributions

---

## 🎯 **Implementation Goal**

Create an **Admin Panel** that allows you (Pio) to:
- View all user-contributed foods with usage statistics
- Sort by popularity, recency, or alphabetically
- Edit and promote foods to official "Pios Food DB"
- Track contribution statistics and top contributors
- Manage the official Pios Food DB

---

## 🚀 **New API Endpoints Available**

### **1. Get User-Contributed Foods (Pending Review)**
```
GET /api/admin/user-foods
Query params: page, limit, sortBy (popularity|recent|alphabetical), minUsage
```

**Response Example:**
```json
{
  "success": true,
  "foods": [
    {
      "id": 142,
      "name": "Homemade Protein Shake",
      "calories_per_100g": 280,
      "protein_per_100g": 25,
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

### **2. Get Contribution Statistics**
```
GET /api/admin/user-foods/stats
```

**Response Example:**
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

### **3. Promote Food to Pios Food DB**
```
POST /api/admin/user-foods/:id/promote
Content-Type: application/json
```

**Request Body:**
```json
{
  "editedData": {
    "name": "Protein Shake - Vanilla",
    "calories_per_100g": 280,
    "protein_per_100g": 25,
    "carbs_per_100g": 30,
    "fat_per_100g": 8,
    "fiber_per_100g": 2,
    "sodium_per_100g": 0.1,
    "sugar_per_100g": 15,
    "brand": "Generic",
    "distributor": null,
    "description": "High-protein shake with whey protein, milk, and banana",
    "category_id": 7,
    "barcode": null
  },
  "notes": "Popular contribution - verified nutrition and standardized name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "\"Protein Shake - Vanilla\" has been promoted to Pios Food DB",
  "food": {
    "id": 142,
    "name": "Protein Shake - Vanilla",
    "is_verified": 1,
    "verified_by": 1,
    "verified_at": "2025-10-08T16:00:00.000Z",
    "verified_by_username": "admin",
    "source": "system"
  }
}
```

---

### **4. Reject Food Contribution**
```
POST /api/admin/user-foods/:id/reject
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Duplicate of existing food"
}
```

---

### **5. Delete User Food**
```
DELETE /api/admin/user-foods/:id
```

---

### **6. Get Pios Food DB (All Verified Foods)**
```
GET /api/admin/pios-food-db
Query params: page, limit, search
```

---

## 🎨 **Frontend Components to Build**

### **1. User Contributions Dashboard**

**Component: `UserContributionsDashboard.tsx`**

**Features:**
- Statistics cards showing:
  - Total user-contributed foods
  - Total contributors
  - Popular foods (used 5+ times)
  - Average usage per food
- Top contributors leaderboard
- Quick filters:
  - "Show Popular" (minUsage=5)
  - "Show Recent"
  - "Show All"

**UI Layout:**
```
┌──────────────────────────────────────┐
│  User Contributions Dashboard        │
├──────────────────────────────────────┤
│  📊 Statistics                        │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │   45   │ │   12   │ │    8   │   │
│  │ Foods  │ │ Users  │ │Popular │   │
│  └────────┘ └────────┘ └────────┘   │
│                                      │
│  🏆 Top Contributors                 │
│  1. john_doe - 12 foods (45 uses)   │
│  2. jane_smith - 8 foods (23 uses)  │
│                                      │
│  🔍 Quick Filters                    │
│  [Popular] [Recent] [All]           │
└──────────────────────────────────────┘
```

---

### **2. User Foods List**

**Component: `UserFoodsList.tsx`**

**Features:**
- Sortable list (popularity, recent, alphabetical)
- Filter by minimum usage
- Pagination
- Each item shows:
  - Food name, brand, distributor
  - Calories and macros
  - Creator username
  - Usage stats (times logged, unique users)
  - Last used date
  - Actions: [Promote] [Edit] [Reject] [Delete]

**UI Layout:**
```
┌──────────────────────────────────────────────────┐
│  Sort by: [Popularity ▼] Min usage: [5]         │
├──────────────────────────────────────────────────┤
│  🍽️ Homemade Protein Shake                      │
│     Brand: Homemade | 280 cal/100g              │
│     Created by: john_doe                         │
│     📊 12 logs | 3 users | Last: 2 days ago     │
│     [✅ Promote] [✏️ Edit] [❌ Reject]           │
├──────────────────────────────────────────────────┤
│  🥗 Custom Salad Mix                             │
│     Brand: Homemade | 45 cal/100g               │
│     Created by: jane_smith                       │
│     📊 8 logs | 2 users | Last: 1 week ago      │
│     [✅ Promote] [✏️ Edit] [❌ Reject]           │
└──────────────────────────────────────────────────┘
```

---

### **3. Food Promotion Modal**

**Component: `FoodPromotionModal.tsx`**

**Features:**
- Displays current food data
- Editable form fields:
  - Name (text)
  - Calories per 100g (number)
  - Protein, Carbs, Fat (numbers)
  - Fiber, Sodium, Sugar (numbers)
  - Brand, Distributor (text)
  - Description (textarea)
  - Category (dropdown)
  - Barcode (text)
- Admin notes field (why promoting this food)
- Preview of changes
- "Promote to Pios Food DB" button

**UI Layout:**
```
┌──────────────────────────────────────┐
│  Promote to Pios Food DB             │
├──────────────────────────────────────┤
│  📝 Edit Food Data (Optional)        │
│                                      │
│  Name: [Protein Shake - Vanilla]    │
│  Calories: [280] per 100g           │
│  Protein: [25]g  Carbs: [30]g       │
│  Fat: [8]g                           │
│                                      │
│  Brand: [Generic]                    │
│  Distributor: [──Select──]          │
│  Category: [Beverages ▼]            │
│                                      │
│  Description:                        │
│  [High-protein shake...]             │
│                                      │
│  📋 Admin Notes:                     │
│  [Popular contribution - verified]   │
│                                      │
│  [Cancel] [✅ Promote to Pios DB]   │
└──────────────────────────────────────┘
```

---

### **4. Pios Food DB Manager**

**Component: `PiosFoodDbManager.tsx`**

**Features:**
- Search bar for official foods
- Pagination
- Shows verified foods with:
  - Name, brand, distributor
  - Nutrition data
  - Who verified it and when
  - Usage statistics
- Actions: [Edit] [View Details]

**UI Layout:**
```
┌──────────────────────────────────────┐
│  Pios Food DB (234 Official Foods)  │
├──────────────────────────────────────┤
│  🔍 Search: [               ]        │
├──────────────────────────────────────┤
│  🍎 Apple                             │
│     52 cal/100g | Verified by admin  │
│     📊 456 logs | 89 users           │
│     [✏️ Edit] [👁️ View]              │
├──────────────────────────────────────┤
│  🥛 Milk - Whole                      │
│     Brand: Generic | 64 cal/100g     │
│     Verified by admin | 234 logs     │
│     [✏️ Edit] [👁️ View]              │
└──────────────────────────────────────┘
```

---

## 📱 **User Flow Examples**

### **Flow 1: Review & Promote Popular Food**
```
1. Admin opens "User Contributions" dashboard
2. Sees "Homemade Protein Shake" has 12 logs from 3 users
3. Clicks "Promote" button
4. Modal opens showing food data
5. Admin edits:
   - Name: "Protein Shake - Vanilla"
   - Adds missing macros
   - Adds description
   - Adds category
6. Fills admin notes: "Popular contribution - verified nutrition"
7. Clicks "Promote to Pios DB"
8. Success message: "Protein Shake - Vanilla promoted to Pios Food DB"
9. Food disappears from contributions list
10. Food now visible in Pios Food DB manager
```

---

### **Flow 2: Reject Low-Quality Food**
```
1. Admin sees "fdsgdfg" food with 0 logs
2. Clicks "Reject" button
3. Modal asks for reason
4. Admin enters: "Invalid food name"
5. Confirms rejection
6. Food marked as rejected (stays in list with note)
```

---

### **Flow 3: View Statistics**
```
1. Admin opens dashboard
2. Sees statistics cards:
   - 45 user foods pending
   - 12 contributors
   - 8 popular foods (5+ uses)
3. Views top contributors leaderboard
4. Clicks "john_doe" to see their contributions
5. Filters to show only their foods
```

---

## 🎨 **Design Guidelines**

### **Color Coding**
- 🟢 **Green**: Promoted/Verified foods
- 🟡 **Yellow**: Popular foods (good candidates)
- 🔴 **Red**: Low usage or rejected foods
- 🔵 **Blue**: Recent contributions

### **Usage Indicators**
```javascript
function getUsageBadge(timesLogged, uniqueUsers) {
  if (timesLogged >= 10) return '🔥 Very Popular';
  if (timesLogged >= 5) return '⭐ Popular';
  if (timesLogged >= 2) return '👍 Used';
  return '🆕 New';
}
```

### **Sorting Options**
- **Popularity**: Sort by `times_logged DESC`
- **Recent**: Sort by `created_at DESC`
- **Alphabetical**: Sort by `name ASC`

---

## 🔧 **State Management**

```typescript
interface UserFoodsState {
  foods: UserContributedFood[];
  stats: ContributionStats;
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    sortBy: 'popularity' | 'recent' | 'alphabetical';
    minUsage: number;
  };
}

interface UserContributedFood {
  id: number;
  name: string;
  calories_per_100g: number;
  brand?: string;
  distributor?: string;
  created_by: number;
  creator_username: string;
  creator_email: string;
  times_logged: number;
  unique_users: number;
  last_used_at: string;
  created_at: string;
  // ... other nutrition fields
}

interface ContributionStats {
  total_user_foods: number;
  total_contributors: number;
  total_logs_of_user_foods: number;
  avg_usage_per_food: number;
  popular_foods_count: number;
  very_popular_foods_count: number;
}
```

---

## 📊 **API Service Methods**

```typescript
// services/userFoodsService.ts

export const userFoodsService = {
  // Get user-contributed foods
  getUserFoods: async (params: {
    page?: number;
    limit?: number;
    sortBy?: 'popularity' | 'recent' | 'alphabetical';
    minUsage?: number;
  }) => {
    const query = new URLSearchParams(params as any);
    return api.get(`/admin/user-foods?${query}`);
  },

  // Get contribution statistics
  getStats: async () => {
    return api.get('/admin/user-foods/stats');
  },

  // Promote food to Pios Food DB
  promoteFood: async (id: number, data: {
    editedData?: Partial<Food>;
    notes?: string;
  }) => {
    return api.post(`/admin/user-foods/${id}/promote`, data);
  },

  // Reject food contribution
  rejectFood: async (id: number, reason: string) => {
    return api.post(`/admin/user-foods/${id}/reject`, { reason });
  },

  // Delete user food
  deleteFood: async (id: number) => {
    return api.delete(`/admin/user-foods/${id}`);
  },

  // Get Pios Food DB
  getPiosFoodDb: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(params as any);
    return api.get(`/admin/pios-food-db?${query}`);
  }
};
```

---

## ✨ **Key Features to Implement**

### **Must-Have Features:**
- [ ] Dashboard with statistics cards
- [ ] User foods list with sorting and filtering
- [ ] Promotion modal with edit capability
- [ ] Reject confirmation dialog
- [ ] Pios Food DB viewer
- [ ] Pagination controls
- [ ] Loading states
- [ ] Success/error notifications

### **Nice-to-Have Features:**
- [ ] Bulk actions (promote multiple foods)
- [ ] Food preview before promotion
- [ ] Contributor profiles
- [ ] Export statistics to CSV
- [ ] Food comparison tool
- [ ] Automatic suggestions for similar foods
- [ ] Nutrition completeness indicator
- [ ] History of promoted foods

---

## 🎯 **Expected Outcomes**

After implementation, you (Pio) should be able to:

1. **Monitor Contributions**: See what foods users are creating
2. **Identify Quality**: Spot popular foods used by multiple users
3. **Grow Database**: Promote 5-10 quality foods per week
4. **Track Progress**: See Pios Food DB growing over time
5. **Reduce Overhead**: As database grows, users create fewer duplicate foods

**Goal:** Grow Pios Food DB from ~150 foods to 500+ foods within 6 months through strategic promotion of user contributions! 🚀

---

## 📖 **Additional Context**

### **What Changed in Backend:**
- User-created foods are now automatically tracked with `created_by` field
- New database fields: `is_verified`, `verified_by`, `verified_at`, `contribution_notes`, `usage_count`
- Foods have `source` field: `system` (verified) vs `custom` (user-created)
- Admin endpoints to review and promote foods

### **Why This Matters:**
- **Scalability**: Database grows organically without manual data entry
- **Community**: Users contribute to shared resource
- **Quality**: Multiple users using same food = validation
- **Efficiency**: Less duplicate foods over time

---

**Please implement this admin panel to enable organic growth of Pios Food DB through user contributions!**

🎨 **Design Priority**: Focus on usability and quick actions - you'll use this regularly to grow the database.

🚀 **Launch Strategy**: Start by promoting the 10 most popular user-contributed foods, then maintain weekly reviews.
