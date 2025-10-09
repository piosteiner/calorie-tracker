# 🎮 Milestone Rewards System - Quick Reference

## ⚠️ Same-Day Logging Requirement

**Points are only awarded for same-day logging.** Users can backfill data for past dates, but points are only earned when logging on the current day. This reinforces the habit of immediate tracking without streak-based pressure.

## 💰 How Users Earn Points

| Action | Base Points | Multiplier | Notes |
|--------|-------------|------------|-------|
| Daily Login | 100 | N/A | Once per day |
| Log Food | 50 | Food milestone level | Scales with experience |
| Log Weight | 150 | Weight milestone level | Scales with experience |
| First Food Log | 500 | N/A | One-time |
| First Weight Log | 500 | N/A | One-time |
| Early Bird Breakfast | 100 | N/A | Before 10am |
| Complete Day (3 meals) | 250 | N/A | Breakfast, lunch, dinner |
| Milestone Level Up | 250 | N/A | Per level reached |

## 📊 Milestone System

### Food Logging Levels
Each level increases multiplier by 0.1x:

| Level | Logs | Multiplier | Points/Log |
|-------|------|------------|------------|
| 1 | 0 | 1.0x | 50 pts |
| 2 | 10 | 1.1x | 55 pts |
| 3 | 25 | 1.2x | 60 pts |
| 4 | 50 | 1.3x | 65 pts |
| 5 | 100 | 1.4x | 70 pts |
| 6 | 200 | 1.5x | 75 pts |
| 7 | 350 | 1.6x | 80 pts |
| 8 | 500 | 1.7x | 85 pts |
| 9 | 750 | 1.8x | 90 pts |
| 10 | 1000 | 1.9x | 95 pts |
| 11 | 1500 | 2.0x | 100 pts |
| 12 | 2000 | 2.1x | 105 pts |

### Weight Logging Levels
Each level increases multiplier by 0.1x:

| Level | Logs | Multiplier | Points/Log |
|-------|------|------------|------------|
| 1 | 0 | 1.0x | 150 pts |
| 2 | 5 | 1.1x | 165 pts |
| 3 | 10 | 1.2x | 180 pts |
| 4 | 20 | 1.3x | 195 pts |
| 5 | 35 | 1.4x | 210 pts |
| 6 | 50 | 1.5x | 225 pts |
| 7 | 75 | 1.6x | 240 pts |
| 8 | 100 | 1.7x | 255 pts |
| 9 | 150 | 1.8x | 270 pts |
| 10 | 200 | 1.9x | 285 pts |
| 11 | 300 | 2.0x | 300 pts |
| 12 | 400 | 2.1x | 315 pts |

## 🎯 Quick API Reference

### Get Points
```bash
GET /api/rewards/points
```

### Get Food Milestones
```bash
GET /api/rewards/food-milestones
```

### Get Weight Milestones
```bash
GET /api/rewards/weight-milestones
```

### Claim Daily Reward
```bash
POST /api/rewards/daily-reward
```

### Get Shop Items
```bash
GET /api/rewards/shop
GET /api/rewards/shop?category=theme
```

### Purchase Item
```bash
POST /api/rewards/shop/:itemId/purchase
```

### Get Leaderboard
```bash
GET /api/rewards/leaderboard?limit=100
```

### Get Achievements
```bash
GET /api/rewards/achievements
```

### Get Transaction History
```bash
GET /api/rewards/transactions?limit=50&offset=0
```

## 📊 Level Progression

| Level | Lifetime Points | Unlocks |
|-------|----------------|---------|
| 1 | 0 | Basic themes |
| 2 | 1,000 | More themes |
| 3 | 2,500 | Premium features |
| 4 | 5,000 | Advanced items |
| 5 | 10,000 | Exclusive content |
| 6 | 20,000 | Power-ups |
| 7 | 35,000 | Challenges |
| 8 | 55,000 | Elite items |
| 9 | 80,000 | Master items |
| 10 | 110,000 | Ultimate items |

## 🛍️ Shop Categories

- **Themes** (1000-2000 pts): Dark mode, Ocean, Forest, Sunset
- **Badges** (500-2000 pts): Achievement badges
- **Features** (2000-5000 pts): Export data, Advanced analytics
- **Power-ups** (750-1500 pts): Double points, Calorie flex
- **Challenges** (4000-8000 pts): Weekly, Monthly challenges

## 🏆 Achievement Codes

- `FIRST_FOOD_LOG` - First meal logged
- `FIRST_WEIGHT_LOG` - First weight logged

## 📱 Frontend Integration Checklist

- [ ] Display points in navbar
- [ ] Show milestone levels with progress bars
- [ ] Display current multipliers for food & weight
- [ ] Add daily reward button
- [ ] Create rewards shop page
- [ ] Build leaderboard page
- [ ] Show achievements grid
- [ ] Toast notifications for points earned (with multiplier shown)
- [ ] Purchase confirmation modal
- [ ] Equipped items indicator
- [ ] Milestone level-up celebration animation

## 🎨 UI Suggestions

### Points & Milestones Display
```html
<div class="rewards-header">
  <div class="points-badge">⭐ {points} pts</div>
  <div class="milestone-food">�️ Lv{level} ({multiplier}x)</div>
  <div class="milestone-weight">⚖️ Lv{level} ({multiplier}x)</div>
</div>
```

### Milestone Progress Card
```html
<div class="milestone-card">
  <h3>🍽️ Food Logging - Level {level}</h3>
  <p>Current Multiplier: {multiplier}x</p>
  <p>Earning {basePoints * multiplier} pts per log</p>
  <progress value="{totalLogs}" max="{totalLogs + logsUntilNext}" />
  <small>{logsUntilNext} logs until Level {nextLevel}</small>
</div>
```

### Points Earned Toast
```html
<div class="toast-notification">
  <h4>+{points} Points!</h4>
  <p>{basePoints} base × {multiplier}x = {totalPoints} pts</p>
</div>
```

## 🔧 Testing Commands

```bash
# Check health
curl http://localhost:3000/health

# Get user points (requires auth)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/points

# Claim daily reward
curl -X POST -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/daily-reward

# Get shop
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/rewards/shop
```

## 📈 Expected User Journey

1. **Day 1:**
   - Register → 0 pts
   - Daily login → +100 pts
   - First food log → +50 pts + 500 pts bonus = **550 pts**
   - 2 more food logs → +100 pts (50×2)
   - **Total: 750 pts, Food Level 1**

2. **Day 7 (10th food log):**
   - Daily login → +100 pts
   - 10th food log → **Level 2 milestone!** → +50 pts + 250 pts bonus
   - **Now earning 55 pts per food log (1.1x multiplier)**

3. **Week 4 (25th food log):**
   - Daily login → +100 pts
   - 25th food log → **Level 3 milestone!** → +55 pts + 250 pts bonus
   - **Now earning 60 pts per food log (1.2x multiplier)**

4. **Month 2 (100th food log):**
   - Food logging Level 5 (1.4x multiplier)
   - Earning 70 pts per food log
   - **Total: ~8,000-10,000 pts accumulated**
   - Can purchase first theme! 🎨

5. **Month 6 (500th food log):**
   - Food logging Level 8 (1.7x multiplier)
   - Earning 85 pts per food log
   - Weight logging Level 8 (1.7x multiplier)
   - Earning 255 pts per weight log
   - **Can afford premium features!**

## 💡 Engagement Tips

- Show milestone progress bars prominently
- Celebrate level-ups with animations
- Display "next milestone" countdown
- Show multiplier in real-time when logging
- Highlight multiplier increases: "You're now earning 1.5x points!"
- Weekly summary: "You logged 20 meals this week and earned 140 points!"
- Remind users they can take breaks without losing progress
- Show long-term goals: "You're 50 logs away from Level 6!"

---

## ✅ Benefits of Milestone System

### No FOMO
- Take breaks guilt-free
- Progress never resets
- Cumulative achievements only

### Positive Motivation  
- Every action rewarded
- Multipliers create exponential growth
- Long-term engagement

### Flexible Pacing
- Progress at your own speed
- No pressure for daily activity
- Separate food & weight tracking

---

**Healthy habits, not anxiety! 🌟**
