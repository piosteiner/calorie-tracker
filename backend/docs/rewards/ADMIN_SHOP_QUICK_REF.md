# 🎯 Admin Shop Management - Quick Reference Card

## Quick Enable/Disable (Most Common Action)

```bash
# Toggle item on/off with one request
PATCH /api/admin/shop/:itemId/toggle
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/admin/shop/5/toggle \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## All Admin Shop Endpoints

```
GET    /api/admin/shop                    # List all items
GET    /api/admin/shop/:id                # Get item details
POST   /api/admin/shop                    # Create new item
PUT    /api/admin/shop/:id                # Update item
PATCH  /api/admin/shop/:id/toggle         # ⚡ Quick enable/disable
PATCH  /api/admin/shop/:id/stock          # Update stock
DELETE /api/admin/shop/:id                # Delete item
GET    /api/admin/shop/stats/summary      # Shop statistics
```

---

## Quick Examples

### List Active Themes
```bash
GET /api/admin/shop?category=theme&is_active=true
```

### Create New Badge
```bash
POST /api/admin/shop
{
  "name": "Champion Badge",
  "category": "badge",
  "cost_points": 2500,
  "is_active": true,
  "item_data": {
    "badge_icon": "🏆",
    "badge_color": "#FFD700"
  }
}
```

### Update Price
```bash
PUT /api/admin/shop/5
{
  "cost_points": 1500
}
```

### Disable Item
```bash
PATCH /api/admin/shop/5/toggle
```

### Check Stats
```bash
GET /api/admin/shop/stats/summary
```

---

## Categories

- `theme` - UI color themes
- `badge` - Achievement badges
- `feature` - Unlockable features
- `avatar` - Profile avatars
- `powerup` - Temporary boosts
- `challenge` - Special challenges

---

## Authentication

All requests require admin authentication:

```
Authorization: Bearer {admin_token}
```

---

## 💡 Pro Tips

1. **Use toggle for quick changes** - Fastest way to enable/disable
2. **Never delete purchased items** - Disable them instead
3. **Check stats regularly** - Monitor what's selling
4. **Set display_order** - Control shop layout

---

**Full Documentation:** `/docs/rewards/ADMIN_SHOP_MANAGEMENT.md`
