# 🛠️ Admin Shop Management API

## Overview

Complete API documentation for managing shop items through the admin panel. These endpoints allow administrators to create, read, update, delete, and quickly enable/disable shop items in the rewards store.

**Base URL:** `/api/admin/shop`  
**Authentication:** Requires admin role  
**Headers Required:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

---

## 📋 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/shop` | List all shop items with filters |
| `GET` | `/api/admin/shop/:itemId` | Get detailed item info |
| `POST` | `/api/admin/shop` | Create new shop item |
| `PUT` | `/api/admin/shop/:itemId` | Update shop item |
| `PATCH` | `/api/admin/shop/:itemId/toggle` | **Quick enable/disable** |
| `PATCH` | `/api/admin/shop/:itemId/stock` | Update stock quantity |
| `DELETE` | `/api/admin/shop/:itemId` | Delete shop item |
| `GET` | `/api/admin/shop/stats/summary` | Get shop statistics |

---

## 🔍 GET /api/admin/shop

List all shop items with optional filtering.

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | `theme`, `badge`, `feature`, etc. |
| `is_active` | boolean | Filter by active status | `true`, `false` |
| `search` | string | Search in name/description | `dark mode` |

### Example Request

```bash
# Get all shop items
GET /api/admin/shop

# Get only active themes
GET /api/admin/shop?category=theme&is_active=true

# Search for items
GET /api/admin/shop?search=badge
```

### Response

```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "name": "Dark Mode Theme",
      "description": "Sleek dark theme to reduce eye strain",
      "category": "theme",
      "cost_points": 1000,
      "item_data": {
        "theme_id": "dark",
        "colors": {
          "primary": "#1a1a1a",
          "accent": "#4a9eff"
        }
      },
      "is_active": true,
      "is_limited_edition": false,
      "stock_quantity": null,
      "purchase_limit": null,
      "required_level": 1,
      "display_order": 1,
      "total_purchases": 15,
      "total_revenue": 15000,
      "created_at": "2025-10-09T12:00:00.000Z",
      "updated_at": "2025-10-09T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

## 🔍 GET /api/admin/shop/:itemId

Get detailed information about a specific shop item including purchase history.

### Example Request

```bash
GET /api/admin/shop/1
```

### Response

```json
{
  "success": true,
  "item": {
    "id": 1,
    "name": "Dark Mode Theme",
    "description": "Sleek dark theme to reduce eye strain",
    "category": "theme",
    "cost_points": 1000,
    "item_data": {
      "theme_id": "dark",
      "colors": {
        "primary": "#1a1a1a",
        "accent": "#4a9eff"
      }
    },
    "is_active": true,
    "total_purchases": 15,
    "unique_purchasers": 12,
    "recent_purchases": [
      {
        "id": 45,
        "user_id": 5,
        "username": "john_doe",
        "purchased_at": "2025-10-09T10:30:00.000Z",
        "is_equipped": true
      }
    ]
  }
}
```

---

## ➕ POST /api/admin/shop

Create a new shop item.

### Request Body

```json
{
  "name": "Purple Theme",
  "description": "Elegant purple theme",
  "category": "theme",
  "cost_points": 1500,
  "item_data": {
    "theme_id": "purple",
    "colors": {
      "primary": "#6a0dad",
      "accent": "#da70d6"
    }
  },
  "is_active": true,
  "is_limited_edition": false,
  "stock_quantity": null,
  "purchase_limit": null,
  "required_level": 1,
  "display_order": 5
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Item name |
| `description` | string | No | Item description |
| `category` | enum | ✅ Yes | `theme`, `badge`, `feature`, `avatar`, `powerup`, `challenge` |
| `cost_points` | integer | ✅ Yes | Point cost (>= 0) |
| `item_data` | JSON | No | Custom data for the item |
| `is_active` | boolean | No | Default: `true` |
| `is_limited_edition` | boolean | No | Default: `false` |
| `stock_quantity` | integer | No | `null` = unlimited |
| `purchase_limit` | integer | No | Max per user, `null` = unlimited |
| `required_level` | integer | No | Default: `1` |
| `display_order` | integer | No | Default: `0` |

### Response

```json
{
  "success": true,
  "message": "Shop item created successfully",
  "itemId": 19
}
```

---

## ✏️ PUT /api/admin/shop/:itemId

Update an existing shop item. Only include fields you want to update.

### Request Body

```json
{
  "name": "Dark Mode Theme (Updated)",
  "cost_points": 1200,
  "is_active": false
}
```

### Response

```json
{
  "success": true,
  "message": "Shop item updated successfully"
}
```

---

## ⚡ PATCH /api/admin/shop/:itemId/toggle

**Quick toggle active status** - Enables or disables an item with a single request. Perfect for quick management!

### Example Request

```bash
PATCH /api/admin/shop/1/toggle
```

### Response

```json
{
  "success": true,
  "message": "Shop item disabled successfully",
  "is_active": false
}
```

### Use Cases

- Temporarily disable items during maintenance
- Seasonal items (enable during holidays, disable after)
- Quick inventory management
- A/B testing different items

---

## 📦 PATCH /api/admin/shop/:itemId/stock

Update stock quantity for limited edition items.

### Request Body

```json
{
  "stock_quantity": 50
}
```

### Response

```json
{
  "success": true,
  "message": "Stock quantity updated successfully",
  "stock_quantity": 50
}
```

---

## ❌ DELETE /api/admin/shop/:itemId

Delete a shop item. **Only works if item has never been purchased.**

### Example Request

```bash
DELETE /api/admin/shop/19
```

### Response Success

```json
{
  "success": true,
  "message": "Shop item deleted successfully"
}
```

### Response Error (Already Purchased)

```json
{
  "success": false,
  "message": "Cannot delete item that has been purchased. Consider disabling it instead.",
  "purchases": 15
}
```

**💡 Tip:** If an item has been purchased, use the toggle endpoint to disable it instead of deleting.

---

## 📊 GET /api/admin/shop/stats/summary

Get comprehensive shop statistics and analytics.

### Example Request

```bash
GET /api/admin/shop/stats/summary
```

### Response

```json
{
  "success": true,
  "summary": {
    "total_items": 18,
    "active_items": 15,
    "inactive_items": 3,
    "total_purchases": 234,
    "unique_customers": 45,
    "total_revenue": 156000
  },
  "top_items": [
    {
      "id": 1,
      "name": "Dark Mode Theme",
      "category": "theme",
      "cost_points": 1000,
      "purchase_count": 45,
      "unique_buyers": 40,
      "revenue": 45000
    }
  ],
  "category_breakdown": [
    {
      "category": "theme",
      "item_count": 4,
      "purchase_count": 89,
      "revenue": 135000
    },
    {
      "category": "badge",
      "item_count": 5,
      "purchase_count": 67,
      "revenue": 45500
    }
  ]
}
```

---

## 🎯 Common Workflows

### 1. **Quick Enable/Disable Item**

```bash
# Disable an item
PATCH /api/admin/shop/5/toggle

# Enable it again
PATCH /api/admin/shop/5/toggle
```

### 2. **Create Seasonal Limited Item**

```bash
POST /api/admin/shop
Content-Type: application/json

{
  "name": "Halloween Badge",
  "description": "Spooky Halloween exclusive badge",
  "category": "badge",
  "cost_points": 2000,
  "is_active": true,
  "is_limited_edition": true,
  "stock_quantity": 100,
  "purchase_limit": 1,
  "item_data": {
    "badge_icon": "🎃",
    "badge_color": "#ff6600"
  }
}
```

### 3. **Bulk Disable Items by Category**

```bash
# 1. Get all themes
GET /api/admin/shop?category=theme

# 2. Loop and disable each
PATCH /api/admin/shop/1/toggle
PATCH /api/admin/shop/2/toggle
PATCH /api/admin/shop/3/toggle
```

### 4. **Check Shop Performance**

```bash
# Get overall stats
GET /api/admin/shop/stats/summary

# Get specific item details
GET /api/admin/shop/5
```

---

## 🔐 Security & Logging

All admin shop operations are:
- ✅ **Authenticated** - Requires valid admin token
- ✅ **Authorized** - Requires admin role
- ✅ **Logged** - All actions logged to console with admin username
- ✅ **Protected** - Prevents deletion of purchased items

### Log Examples

```
Admin jane_admin created shop item: Purple Theme (ID: 19)
Admin jane_admin disabled shop item: Week Warrior Badge (ID: 6)
Admin jane_admin updated stock for Halloween Badge to 50
Admin jane_admin deleted shop item: Test Item (ID: 20)
```

---

## 📝 Item Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `theme` | UI color themes | Dark Mode, Ocean Blue, Forest Green |
| `badge` | Achievement badges | First Steps, Week Warrior, Goal Crusher |
| `feature` | Unlockable features | Export Data, Advanced Analytics |
| `avatar` | Profile avatars | Character skins, profile pictures |
| `powerup` | Temporary boosts | Double Points (24h), Calorie Flex Pass |
| `challenge` | Special challenges | Weekly Challenge Access |

---

## ⚠️ Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "success": false,
  "message": "Name, category, and cost_points are required"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Shop item not found"
}
```

**500 Server Error**
```json
{
  "success": false,
  "message": "Failed to create shop item",
  "error": "Detailed error message"
}
```

---

## 💡 Best Practices

1. **Use Toggle for Temporary Changes** - Don't delete items, disable them
2. **Set Display Order** - Control how items appear in the shop
3. **Limited Editions Need Stock** - Always set `stock_quantity` for limited items
4. **Test Before Enabling** - Create items as `is_active: false`, test, then enable
5. **Monitor Statistics** - Regular check the stats endpoint for performance
6. **Document Custom Data** - Keep notes on what `item_data` contains for each category

---

*Last updated: October 9, 2025*
