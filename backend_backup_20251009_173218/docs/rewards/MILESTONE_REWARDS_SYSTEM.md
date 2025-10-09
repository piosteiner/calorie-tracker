# 🎮 Milestone-Based Rewards System

## 🎯 Philosophy: Healthy Progress, Not FOMO

This rewards system is designed to encourage **consistent, healthy habits without creating anxiety or fear of missing out (FOMO)**. Instead of streak-based rewards that punish users for missing a day, we use **milestone-based progression** that celebrates accumulative achievements.

### Key Principles:
- ✅ **No punishment for breaks** - Life happens, and that's okay
- ✅ **Rewards scale with experience** - More activity = better rewards
- ✅ **Separate progression tracks** - Food and weight logging each have their own levels
- ✅ **Positive reinforcement only** - Every action is celebrated

### Same-Day Logging Requirement

**Points are only awarded for logging on the same day.** This design choice reinforces the habit of **immediate tracking** without relying on anxiety-inducing streaks.

#### Why Same-Day Only?

- **Rewards the habit**: Encourages real-time tracking, which builds stronger habits
- **No backfill gaming**: Users can't "game" the system by mass-logging past data
- **Still allows backfilling**: Users can still log past data for personal record-keeping, they just won't earn points
- **No streak pressure**: Unlike streak systems, there's no penalty for missing a day—you simply don't earn points for that day

#### How It Works

✅ **Logging food/weight today** → Earns points (with milestone multiplier applied)  
❌ **Logging food/weight for past dates** → No points earned (data is still saved for your records)

This approach keeps the focus on **building daily habits** while removing the FOMO and anxiety that comes with streak-based systems.

---

## 💰 Point Rewards

**Note:** All point rewards below are only awarded for **same-day logging**. You can backfill data for past dates, but points are only earned when logging on the current day.

### Base Point Values

| Action | Base Points | Notes |
|--------|-------------|-------|
| **Daily Login** | 100 pts | Once per day |
| **Food Log** | 50 pts | Multiplied by food milestone level |
| **Weight Log** | 150 pts | Multiplied by weight milestone level |
| **First Food Log** | 500 pts | One-time bonus |
| **First Weight Log** | 500 pts | One-time bonus |
| **Early Bird** | 100 pts | Log breakfast before 10am |
| **Complete Day** | 250 pts | Log all 3 main meals |
| **Milestone Level Up** | 250 pts | Reach new milestone level |

---

## 📊 Food Logging Milestones

Each milestone level increases your food logging point multiplier by **0.1x**.

| Level | Total Logs Required | Point Multiplier | Example Reward |
|-------|---------------------|------------------|----------------|
| **1** | 0 | 1.0x | 50 pts per log |
| **2** | 10 | 1.1x | 55 pts per log |
| **3** | 25 | 1.2x | 60 pts per log |
| **4** | 50 | 1.3x | 65 pts per log |
| **5** | 100 | 1.4x | 70 pts per log |
| **6** | 200 | 1.5x | 75 pts per log |
| **7** | 350 | 1.6x | 80 pts per log |
| **8** | 500 | 1.7x | 85 pts per log |
| **9** | 750 | 1.8x | 90 pts per log |
| **10** | 1000 | 1.9x | 95 pts per log |
| **11** | 1500 | 2.0x | 100 pts per log |
| **12** | 2000 | 2.1x | 105 pts per log |

### Progression Example

- **Day 1-10**: Level 1 (1.0x) - Earning 50 pts per food log
- **Day 11-25**: Level 2 (1.1x) - Now earning 55 pts per food log + 250pt level-up bonus
- **Day 26-50**: Level 3 (1.2x) - Now earning 60 pts per food log + 250pt level-up bonus
- And so on...

---

## ⚖️ Weight Logging Milestones

Each milestone level increases your weight logging point multiplier by **0.1x**.

| Level | Total Logs Required | Point Multiplier | Example Reward |
|-------|---------------------|------------------|----------------|
| **1** | 0 | 1.0x | 150 pts per log |
| **2** | 5 | 1.1x | 165 pts per log |
| **3** | 10 | 1.2x | 180 pts per log |
| **4** | 20 | 1.3x | 195 pts per log |
| **5** | 35 | 1.4x | 210 pts per log |
| **6** | 50 | 1.5x | 225 pts per log |
| **7** | 75 | 1.6x | 240 pts per log |
| **8** | 100 | 1.7x | 255 pts per log |
| **9** | 150 | 1.8x | 270 pts per log |
| **10** | 200 | 1.9x | 285 pts per log |
| **11** | 300 | 2.0x | 300 pts per log |
| **12** | 400 | 2.1x | 315 pts per log |

---

## 🎯 API Endpoints

### Get Your Points
```bash
GET /api/rewards/points
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "points": {
    "user_id": 1,
    "current_points": 250,
    "lifetime_points": 450,
    "points_spent": 200,
    "level": 3,
    "total_transactions": 45
  }
}
```

### Get Food Milestones
```bash
GET /api/rewards/food-milestones
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "milestone": {
    "total_logs": 75,
    "current_level": 4,
    "current_multiplier": 1.30,
    "next_level": 5,
    "next_multiplier": 1.40,
    "logs_until_next_level": 25
  }
}
```

### Get Weight Milestones
```bash
GET /api/rewards/weight-milestones
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "milestone": {
    "total_logs": 15,
    "current_level": 3,
    "current_multiplier": 1.20,
    "next_level": 4,
    "next_multiplier": 1.30,
    "logs_until_next_level": 5
  }
}
```

### Claim Daily Reward
```bash
POST /api/rewards/daily-reward
Authorization: Bearer {token}
```

### Get Transaction History
```bash
GET /api/rewards/transactions?limit=50&offset=0
Authorization: Bearer {token}
```

### Get Shop Items
```bash
GET /api/rewards/shop
GET /api/rewards/shop?category=theme
Authorization: Bearer {token}
```

### Purchase Item
```bash
POST /api/rewards/shop/:itemId/purchase
Authorization: Bearer {token}
```

### Get Leaderboard
```bash
GET /api/rewards/leaderboard?limit=100
Authorization: Bearer {token}
```

---

## 🗄️ Database Schema

### user_food_milestones
```sql
CREATE TABLE user_food_milestones (
    user_id INT PRIMARY KEY,
    total_logs INT DEFAULT 0,
    milestone_level INT DEFAULT 1,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_weight_milestones
```sql
CREATE TABLE user_weight_milestones (
    user_id INT PRIMARY KEY,
    total_logs INT DEFAULT 0,
    milestone_level INT DEFAULT 1,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛍️ Rewards Shop

The shop system remains unchanged. Users can spend points on:

- **Themes** (1000-2000 pts): Dark mode, Ocean, Forest, Sunset
- **Badges** (500-2000 pts): Achievement badges to display
- **Features** (2000-5000 pts): Export data, Advanced analytics
- **Power-ups** (750-1500 pts): Double points (24hr), Calorie flex
- **Challenges** (4000-8000 pts): Weekly/Monthly challenge access

---

## 🎨 Frontend Integration

### Display Current Multipliers

```javascript
// Fetch milestones
const foodMilestone = await fetch('/api/rewards/food-milestones', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

const weightMilestone = await fetch('/api/rewards/weight-milestones', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Display in UI
<div className="milestone-info">
  <div className="food-milestone">
    <h3>🍽️ Food Logging</h3>
    <p>Level {foodMilestone.current_level}</p>
    <p>{foodMilestone.current_multiplier}x multiplier</p>
    <progress 
      value={foodMilestone.total_logs} 
      max={foodMilestone.total_logs + foodMilestone.logs_until_next_level}
    />
    <small>{foodMilestone.logs_until_next_level} logs until next level</small>
  </div>

  <div className="weight-milestone">
    <h3>⚖️ Weight Tracking</h3>
    <p>Level {weightMilestone.current_level}</p>
    <p>{weightMilestone.current_multiplier}x multiplier</p>
    <progress 
      value={weightMilestone.total_logs} 
      max={weightMilestone.total_logs + weightMilestone.logs_until_next_level}
    />
    <small>{weightMilestone.logs_until_next_level} logs until next level</small>
  </div>
</div>
```

### Show Points Earned with Multiplier

When logging food/weight, show the breakdown:

```javascript
// After successful food log
{
  "success": true,
  "pointsAwarded": 7,
  "pointsDetails": [
    {
      "reason": "food_log",
      "points": 7,
      "basePoints": 5,
      "multiplier": 1.4
    }
  ]
}

// Display as:
"You earned 7 points! (5 base × 1.4x multiplier)"
```

---

## 📈 User Journey Examples

### New User (First Week)
**Day 1:**
- Register → 0 pts
- Daily login → +100 pts
- First food log → +50 pts (1.0x) + 500 pts bonus = **550 pts**
- 2 more food logs → +100 pts (50×2)
- **Total: 750 pts, Level 1**

**Day 7 (10th food log):**
- Daily login → +100 pts
- 10th food log triggers Level 2! → +50 pts + 250 pts level-up bonus
- **Now earning 55 pts per food log (1.1x multiplier)**

### Active User (1 Month)
- ~90 food logs → Level 5 (1.4x multiplier)
- ~30 weight logs → Level 5 (1.4x multiplier)
- Earning 70 pts per food log
- Earning 210 pts per weight log
- **Total: ~12,000 pts accumulated**

### Power User (6 Months)
- ~550 food logs → Level 8 (1.7x multiplier)
- ~120 weight logs → Level 8 (1.7x multiplier)
- Earning 85 pts per food log
- Earning 255 pts per weight log
- **Can afford premium features and themes!**

---

## 🧪 Testing Scenarios

### Test Milestone Progression

```bash
# Check initial milestone (should be level 1)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/food-milestones

# Log 10 foods to reach level 2
for i in {1..10}; do
  curl -X POST -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"food_id": 1, "quantity": 1, "log_date": "2025-10-09"}' \
    http://localhost:3000/api/logs
done

# Verify level up
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/food-milestones
# Should show: level 2, multiplier 1.1

# Check transactions for level-up bonus
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/transactions
# Should see "food_milestone_level_up" transaction with 25 pts
```

---

## 🔒 Benefits of Milestone System

### ✅ No FOMO
Users can take breaks without losing progress. Total logs are cumulative and never reset.

### ✅ Positive Motivation
Every action is rewarded. The more you use the app, the more points you earn per action.

### ✅ Long-term Engagement
Multipliers create exponential growth in rewards, keeping power users engaged.

### ✅ Flexible Pacing
Users progress at their own speed. No pressure to maintain daily streaks.

### ✅ Separate Tracking
Food and weight milestones are independent, allowing users to focus on what matters most to them.

---

## 🚀 Future Enhancements

### Phase 2 Ideas (No FOMO):
- **Monthly Challenges**: Optional challenges that don't reset if missed
- **Achievement Badges**: Celebrate total milestones (100 logs, 500 logs, 1000 logs)
- **Seasonal Themes**: Special shop items available seasonally (but no pressure to buy)
- **Community Goals**: Collective milestone tracking (supportive, not competitive)

---

**Remember:** The goal is to support healthy habits, not create anxiety. Every user progresses at their own pace, and that's perfectly okay! 🌟
