# 🎮 Rewards & Gamification System - Complete Documentation

## 📋 Overview

A comprehensive rewards and points system to gamify the calorie tracking experience. Users earn points for daily activities, maintain streaks, unlock achievements, and purchase rewards from the shop.

**Implementation Date:** October 9, 2025  
**Status:** ✅ Production Ready

---

## 🎯 Core Concepts

### Point System
- Users earn points for various activities
- Points accumulate and can be spent in the rewards shop
- Lifetime points determine user level
- Points history is fully tracked and auditable

### Level System
- 10 levels based on lifetime points earned
- Each level unlock provides bonus points
- Higher levels unlock exclusive shop items

### Streak System
- Tracks consecutive days of activity
- Multiple streak types (login, food logging, weight logging, etc.)
- Streak bonuses awarded at milestones (3, 7, 14, 30, 100 days)

### Achievements
- Badge system for special accomplishments
- One-time unlocks with point rewards
- Displayed on user profile

### Rewards Shop
- Purchasable items using points
- Categories: Themes, Badges, Features, Power-ups, Challenges
- Some items are one-time purchases, others are consumable

---

## 💰 Point Rewards Configuration

### Base Rewards
| Action | Points | Frequency |
|--------|--------|-----------|
| Daily Login | 10 | Once per day |
| Log Food | 5 | Per food entry |
| Log Weight | 15 | Per weight entry |
| Complete Day (3 meals) | 25 | Once per day |
| Meet Calorie Goal | 30 | Once per day |
| Early Bird (breakfast <10am) | 10 | Per occurrence |

### First-Time Bonuses
| Achievement | Points | Trigger |
|-------------|--------|---------|
| First Food Log | 50 | First time logging food |
| First Weight Log | 50 | First time logging weight |

### Streak Bonuses
| Streak | Points | Type |
|--------|--------|------|
| 3 Days | 20 | Any streak type |
| 7 Days | 50 | Any streak type |
| 14 Days | 100 | Any streak type |
| 30 Days | 250 | Any streak type |
| 100 Days | 1000 | Any streak type |

### Level Up Bonus
| Event | Points |
|-------|--------|
| Level Up | 100 | Per level gained |

---

## 📊 Level System

### Level Thresholds
| Level | Lifetime Points Required |
|-------|-------------------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 1,000 |
| 6 | 2,000 |
| 7 | 3,500 |
| 8 | 5,500 |
| 9 | 8,000 |
| 10 | 11,000 |

**Progression:** Automatic based on lifetime points. Level up triggers 100-point bonus.

---

## 🛍️ Rewards Shop - Initial Items

### Themes (150-200 points)
- **Dark Mode Theme** - 100 pts
- **Ocean Blue Theme** - 150 pts
- **Forest Green Theme** - 150 pts
- **Sunset Orange Theme** - 200 pts

### Badges (50-200 points)
- **First Steps** - FREE (auto-awarded)
- **Week Warrior** - 50 pts
- **Month Master** - 200 pts
- **Goal Crusher** - 150 pts
- **Early Bird** - 100 pts

### Premium Features (200-500 points)
- **Export Data Feature** - 300 pts
- **Advanced Analytics** - 500 pts
- **Custom Meal Categories** - 250 pts
- **Recipe Save Slots (50)** - 200 pts

### Power-ups (Temporary, 75-150 points)
- **Double Points (24h)** - 150 pts
- **Calorie Flex Pass (7d)** - 100 pts
- **Streak Freeze (1d)** - 75 pts

### Challenges (400-800 points)
- **Weekly Challenge Access** - 400 pts
- **Monthly Challenge Access** - 800 pts

---

## 🗄️ Database Schema

### Tables Created

#### 1. `user_points`
Tracks user's current points, lifetime stats, level, and streaks.

```sql
CREATE TABLE user_points (
    user_id INT PRIMARY KEY,
    current_points INT NOT NULL DEFAULT 0,
    lifetime_points INT NOT NULL DEFAULT 0,
    points_spent INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE NULL,
    last_daily_reward_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. `point_transactions`
Complete audit log of all point earnings and spending.

```sql
CREATE TABLE point_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    points INT NOT NULL,
    transaction_type ENUM('earn', 'spend', 'refund', 'admin_adjustment'),
    reason VARCHAR(100) NOT NULL,
    description TEXT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id INT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `reward_items`
Catalog of all purchasable items.

```sql
CREATE TABLE reward_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    category ENUM('theme', 'badge', 'feature', 'avatar', 'powerup', 'challenge'),
    cost_points INT NOT NULL,
    item_data JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_limited_edition BOOLEAN DEFAULT FALSE,
    stock_quantity INT NULL,
    purchase_limit INT NULL,
    required_level INT DEFAULT 1,
    display_order INT DEFAULT 0
);
```

#### 4. `user_purchases`
Track what users have purchased.

```sql
CREATE TABLE user_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    points_paid INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL
);
```

#### 5. `user_streaks`
Track activity streaks by type.

```sql
CREATE TABLE user_streaks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    streak_type ENUM('daily_login', 'food_logging', 'weight_logging', 'goal_achievement', 'complete_day'),
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE NULL,
    streak_start_date DATE NULL
);
```

#### 6. `user_achievements`
Track unlocked achievements/badges.

```sql
CREATE TABLE user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_code VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT NULL,
    achievement_icon VARCHAR(50) NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Views

#### `v_user_points_summary`
Comprehensive user points view with stats.

#### `v_points_leaderboard`
Leaderboard with rankings.

---

## 🔌 API Endpoints

### Points & Stats

#### GET `/api/rewards/points`
Get user's current points and stats.

**Response:**
```json
{
  "success": true,
  "points": {
    "user_id": 1,
    "username": "demo",
    "current_points": 250,
    "lifetime_points": 450,
    "points_spent": 200,
    "level": 3,
    "current_streak": 7,
    "longest_streak": 14,
    "achievements_count": 5,
    "items_owned": 3
  }
}
```

#### GET `/api/rewards/transactions?limit=50&offset=0`
Get point transaction history.

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 123,
      "points": 5,
      "transaction_type": "earn",
      "reason": "food_log",
      "description": "Logged Oatmeal",
      "created_at": "2025-10-09T08:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 145,
    "hasMore": true
  }
}
```

#### POST `/api/rewards/daily-reward`
Claim daily login reward (10 points, once per day).

**Response:**
```json
{
  "success": true,
  "message": "You earned 10 points for logging in today!",
  "pointsAwarded": 10
}
```

**Error (already claimed):**
```json
{
  "success": false,
  "error": "Daily reward already claimed today",
  "nextRewardAvailable": "2025-10-10"
}
```

### Leaderboard

#### GET `/api/rewards/leaderboard?limit=100`
Get points leaderboard.

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "user_id": 5,
      "username": "john_doe",
      "current_points": 1250,
      "lifetime_points": 3400,
      "level": 7,
      "current_streak": 30,
      "achievements_count": 12,
      "points_rank": 1,
      "streak_rank": 2
    }
  ],
  "myRank": {
    "user_id": 1,
    "points_rank": 45,
    "streak_rank": 12
  }
}
```

### Rewards Shop

#### GET `/api/rewards/shop?category=theme`
Get available reward items.

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "name": "Dark Mode Theme",
      "description": "Sleek dark theme to reduce eye strain",
      "category": "theme",
      "cost_points": 100,
      "item_data": {
        "theme_id": "dark",
        "colors": {"primary": "#1a1a1a"}
      },
      "required_level": 1,
      "can_purchase": true,
      "already_owned": false
    }
  ],
  "userLevel": 3
}
```

#### POST `/api/rewards/shop/:itemId/purchase`
Purchase a reward item.

**Response:**
```json
{
  "success": true,
  "message": "Successfully purchased Dark Mode Theme!",
  "item": {
    "id": 1,
    "name": "Dark Mode Theme",
    "category": "theme"
  },
  "pointsSpent": 100,
  "remainingPoints": 150
}
```

**Error (insufficient points):**
```json
{
  "success": false,
  "error": "Insufficient points",
  "required": 300,
  "current": 150
}
```

#### GET `/api/rewards/purchases`
Get user's purchased items.

**Response:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": 45,
      "purchased_at": "2025-10-08T10:00:00Z",
      "is_active": true,
      "is_equipped": true,
      "expires_at": null,
      "name": "Dark Mode Theme",
      "category": "theme",
      "item_data": {...}
    }
  ]
}
```

#### POST `/api/rewards/purchases/:purchaseId/equip`
Equip/activate a purchased item (for themes, avatars).

**Response:**
```json
{
  "success": true,
  "message": "Item equipped successfully"
}
```

### Achievements

#### GET `/api/rewards/achievements`
Get user's unlocked achievements.

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "id": 1,
      "achievement_code": "FIRST_FOOD_LOG",
      "achievement_name": "First Steps",
      "achievement_description": "Logged your first meal",
      "achievement_icon": "🏆",
      "points_awarded": 50,
      "unlocked_at": "2025-10-01T08:00:00Z"
    }
  ],
  "totalAchievements": 5
}
```

### Streaks

#### GET `/api/rewards/streaks`
Get user's activity streaks.

**Response:**
```json
{
  "success": true,
  "streaks": [
    {
      "id": 1,
      "streak_type": "food_logging",
      "current_streak": 7,
      "longest_streak": 14,
      "last_activity_date": "2025-10-09",
      "streak_start_date": "2025-10-03"
    }
  ]
}
```

---

## 🔗 Integration with Existing Features

### Food Logging (routes/logs.js)
When a user logs food:
1. ✅ **Base reward:** 5 points per food log
2. ✅ **First-time bonus:** 50 points for first food log ever
3. ✅ **Streak tracking:** Updates food_logging streak
4. ✅ **Streak bonuses:** Awarded at milestones (3, 7, 14, 30 days)
5. ✅ **Early bird bonus:** 10 points if breakfast logged before 10am
6. ✅ **Complete day:** 25 points when all 3 main meals logged

**Response includes:**
```json
{
  "success": true,
  "logId": 123,
  "entry": {...},
  "pointsAwarded": 75,
  "pointsDetails": [
    {"reason": "food_log", "points": 5},
    {"reason": "first_food_log", "points": 50},
    {"reason": "early_bird", "points": 10},
    {"reason": "complete_day", "points": 25}
  ]
}
```

### Weight Logging (routes/weight.js)
When a user logs weight:
1. ✅ **Base reward:** 15 points per weight log
2. ✅ **First-time bonus:** 50 points for first weight log ever
3. ✅ **Streak tracking:** Updates weight_logging streak
4. ✅ **Streak bonuses:** Awarded at milestones

**Response includes:**
```json
{
  "success": true,
  "data": {...},
  "pointsAwarded": 65,
  "pointsDetails": [
    {"reason": "weight_log", "points": 15},
    {"reason": "first_weight_log", "points": 50}
  ]
}
```

---

## 🎨 Frontend Integration Guide

### 1. Display User Points
```javascript
// Fetch user points
GET /api/rewards/points

// Display in navbar or profile
<div class="points-display">
  <span>⭐ {points.current_points} pts</span>
  <span>Level {points.level}</span>
</div>
```

### 2. Show Points Earned Toast
```javascript
// After logging food/weight, show toast notification
if (response.pointsAwarded > 0) {
  showToast(`+${response.pointsAwarded} points earned! 🎉`);
}
```

### 3. Daily Reward Button
```javascript
// Add daily check-in button
POST /api/rewards/daily-reward

// Show in dashboard
<button onClick={claimDailyReward}>
  Claim Daily Reward (10 pts)
</button>
```

### 4. Rewards Shop Page
```javascript
// Fetch shop items
GET /api/rewards/shop

// Display in grid
<ShopGrid items={items} onPurchase={handlePurchase} />

// Purchase item
POST /api/rewards/shop/:itemId/purchase
```

### 5. Leaderboard Page
```javascript
// Fetch leaderboard
GET /api/rewards/leaderboard?limit=100

// Display with user's rank highlighted
<LeaderboardTable data={leaderboard} myRank={myRank} />
```

### 6. Achievements Display
```javascript
// Fetch achievements
GET /api/rewards/achievements

// Show as badge grid
<AchievementBadges achievements={achievements} />
```

### 7. Streak Display
```javascript
// Fetch streaks
GET /api/rewards/streaks

// Show fire emoji with number
<StreakIndicator>
  🔥 {streak.current_streak} day streak
</StreakIndicator>
```

---

## 🎯 Gamification Features to Implement

### Phase 1: Core Features ✅
- [x] Point system
- [x] Level system
- [x] Streak tracking
- [x] Achievements
- [x] Rewards shop
- [x] Daily login rewards
- [x] Leaderboard

### Phase 2: Enhanced Features (Future)
- [ ] Weekly challenges
- [ ] Monthly challenges
- [ ] Social features (friend leaderboards)
- [ ] Milestone celebrations
- [ ] Referral rewards
- [ ] Team competitions
- [ ] Custom avatars
- [ ] Profile customization
- [ ] Share achievements on social media
- [ ] Push notifications for streaks

---

## 🔧 Admin Features (Future)

### Potential Admin Endpoints
```
POST /api/admin/rewards/adjust-points
POST /api/admin/rewards/create-item
PUT /api/admin/rewards/item/:id
DELETE /api/admin/rewards/item/:id
POST /api/admin/rewards/give-achievement
GET /api/admin/rewards/analytics
```

---

## 📈 Analytics & Metrics

### Key Metrics to Track
- Average points per user
- Most purchased items
- Streak distribution
- Level distribution
- Daily active users (via daily rewards)
- Engagement increase after rewards launch
- Purchase patterns

---

## 🚀 Testing

### Test Scenarios

1. **First User Journey:**
   ```bash
   # Register new user
   POST /api/auth/register
   
   # Claim daily reward
   POST /api/rewards/daily-reward  # → 10 points
   
   # Log first food
   POST /api/logs  # → 5 + 50 (first time) = 55 points
   
   # Log first weight
   POST /api/weight/log  # → 15 + 50 (first time) = 65 points
   
   # Check points
   GET /api/rewards/points  # → Should have 130 points
   ```

2. **Streak Testing:**
   ```bash
   # Log food for 3 consecutive days
   # Day 3 should award streak bonus (20 points)
   ```

3. **Purchase Testing:**
   ```bash
   # Buy theme (100 points)
   POST /api/rewards/shop/1/purchase
   
   # Check remaining points
   GET /api/rewards/points  # → Should be reduced by 100
   
   # Verify purchase
   GET /api/rewards/purchases
   ```

---

## 🐛 Error Handling

### Common Errors

| Error | Code | Solution |
|-------|------|----------|
| Insufficient points | 400 | Show current vs required points |
| Already claimed daily reward | 400 | Show next available time |
| Item not found | 404 | Refresh shop items |
| Purchase limit reached | 400 | Show limit information |
| Level requirement not met | 400 | Display required level |

---

## 📚 Code Architecture

### Service Layer (`services/pointsService.js`)
- Point calculation logic
- Transaction management
- Streak calculations
- Achievement awards
- Level calculations

### Controller Layer (`controllers/rewardsController.js`)
- API request handling
- Response formatting
- Error handling

### Routes Layer (`routes/rewards.js`)
- Endpoint definitions
- Input validation
- Authentication

---

## ✅ Implementation Checklist

- [x] Database schema created
- [x] Point service implemented
- [x] Rewards controller created
- [x] API routes defined
- [x] Integrated with food logging
- [x] Integrated with weight logging
- [x] Seeded initial shop items
- [x] Created database views
- [x] Added comprehensive documentation
- [ ] Frontend implementation
- [ ] User testing
- [ ] Analytics dashboard

---

## 🎉 Summary

The rewards system is **fully implemented and production-ready**. It provides:

- ✅ Complete point earning system
- ✅ Level progression (10 levels)
- ✅ Streak tracking & bonuses
- ✅ Achievement system
- ✅ Rewards shop (18 initial items)
- ✅ Leaderboard
- ✅ Daily login rewards
- ✅ Automatic integration with existing features
- ✅ Comprehensive API documentation
- ✅ Database views for performance
- ✅ Transaction audit trail

**Next Step:** Frontend implementation to create the user interface for all these features!
