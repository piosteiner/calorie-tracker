# Rewards System - Frontend Integration Prompt

## 🎯 Objective
Integrate the complete rewards/points system into the frontend, including points display, milestone tracking, shop functionality, and achievements.

---

## 📡 Backend API Reference

### **Base URL:** `https://api.calorie-tracker.piogino.ch/api`

All endpoints require authentication via `Authorization: Bearer {token}` header.

---

## 🔑 API Endpoints Available

### **1. Get User Points & Milestones**
```http
GET /api/rewards/points
```

**Response:**
```json
{
  "success": true,
  "points": {
    "currentPoints": 700,
    "lifetimePoints": 700,
    "pointsSpent": 0,
    "level": 1,
    "currentStreak": 0,
    "longestStreak": 0,
    "lastActivityDate": null,
    "achievementsCount": 0,
    "itemsOwned": 0,
    "foodMilestone": {
      "level": 1,
      "multiplier": 1.0,
      "currentCount": 2
    },
    "weightMilestone": {
      "level": 1,
      "multiplier": 1.0,
      "currentCount": 0
    }
  }
}
```

### **2. Food/Weight Logging (Already Implemented)**
```http
POST /api/logs
POST /api/weight
```

**Response includes points data:**
```json
{
  "success": true,
  "logId": 38,
  "pointsAwarded": 300,
  "pointsDetails": [
    {
      "points": 50,
      "reason": "food_log",
      "description": "Logged Test Food (1.00x multiplier)"
    },
    {
      "points": 250,
      "reason": "complete_day",
      "description": "Logged all 3 main meals"
    }
  ]
}
```

### **3. Get Transaction History**
```http
GET /api/rewards/transactions?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 7,
      "points": 50,
      "transaction_type": "earn",
      "reason": "food_log",
      "description": "Logged Test Food (1.00x multiplier)",
      "created_at": "2025-10-09T17:25:18.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 8,
    "hasMore": false
  }
}
```

### **4. Get Shop Items**
```http
GET /api/rewards/shop/items?category=theme
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "name": "Premium Theme",
      "description": "Unlock a special theme",
      "category": "theme",
      "cost_points": 500,
      "item_data": {
        "theme_name": "dark-pro",
        "preview_url": "/themes/dark-pro.png"
      },
      "required_level": 1,
      "can_purchase": true,
      "already_owned": false,
      "user_purchase_count": 0
    }
  ],
  "userLevel": 1
}
```

### **5. Purchase Item**
```http
POST /api/rewards/shop/purchase/:itemId
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully purchased Premium Theme!",
  "item": {
    "id": 1,
    "name": "Premium Theme",
    "category": "theme"
  },
  "pointsSpent": 500,
  "remainingPoints": 200
}
```

### **6. Get My Purchases**
```http
GET /api/rewards/shop/purchases
```

**Response:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": 1,
      "name": "Premium Theme",
      "description": "Unlock a special theme",
      "category": "theme",
      "purchased_at": "2025-10-09T18:00:00.000Z",
      "is_active": true,
      "is_equipped": true,
      "expires_at": null,
      "is_expired": false,
      "item_data": {
        "theme_name": "dark-pro"
      }
    }
  ]
}
```

### **7. Equip/Activate Item**
```http
POST /api/rewards/shop/equip/:purchaseId
```

**Response:**
```json
{
  "success": true,
  "message": "Item equipped successfully"
}
```

### **8. Get Achievements**
```http
GET /api/rewards/achievements
```

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "id": 1,
      "achievement_type": "first_food_log",
      "title": "First Steps",
      "description": "Log your first food entry",
      "points_awarded": 500,
      "unlocked_at": "2025-10-09T12:00:00.000Z"
    }
  ],
  "totalAchievements": 1
}
```

### **9. Get Food Milestones (Detailed)**
```http
GET /api/rewards/food-milestones
```

**Response:**
```json
{
  "success": true,
  "milestone": {
    "total_logs": 12,
    "current_level": 2,
    "current_multiplier": "1.10",
    "next_level": 3,
    "next_multiplier": "1.20",
    "logs_until_next_level": 13,
    "created_at": "2025-10-09T12:33:03.000Z",
    "last_updated": "2025-10-09T12:33:03.000Z"
  }
}
```

### **10. Get Leaderboard**
```http
GET /api/rewards/leaderboard?limit=100
```

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "user_id": 1,
      "username": "demo",
      "current_points": 700,
      "level": 1
    }
  ],
  "myRank": {
    "rank": 1,
    "user_id": 1,
    "username": "demo",
    "current_points": 700,
    "level": 1
  }
}
```

### **11. Claim Daily Login Reward**
```http
POST /api/rewards/daily-reward
```

**Response:**
```json
{
  "success": true,
  "message": "You earned 100 points for logging in today!",
  "pointsAwarded": 100
}
```

---

## 🎨 Frontend Tasks

### **TASK 1: Points Display Widget** ⭐ CRITICAL

**Location:** Header/Navigation bar

**Requirements:**
1. Create a persistent points widget visible on all pages
2. Display current points, level, and streak
3. Click to expand and show more details
4. Auto-refresh after any point-earning action

**Implementation:**
```jsx
// Example Component: PointsWidget.jsx
import React, { useState, useEffect } from 'react';

const PointsWidget = () => {
  const [points, setPoints] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    const response = await fetch('/api/rewards/points', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setPoints(data.points);
    }
  };

  if (!points) return null;

  return (
    <div className="points-widget" onClick={() => setExpanded(!expanded)}>
      {/* Compact View */}
      <div className="points-compact">
        <span className="points-icon">💎</span>
        <span className="points-value">{points.currentPoints}</span>
        <span className="level-badge">Lv {points.level}</span>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="points-expanded">
          <div className="stat">
            <span className="label">Lifetime Points:</span>
            <span className="value">{points.lifetimePoints}</span>
          </div>
          <div className="stat">
            <span className="label">Current Streak:</span>
            <span className="value">🔥 {points.currentStreak} days</span>
          </div>
          <div className="stat">
            <span className="label">Food Milestone:</span>
            <span className="value">
              Level {points.foodMilestone?.level} 
              ({points.foodMilestone?.multiplier}x multiplier)
            </span>
          </div>
          <button onClick={() => window.location.href = '/rewards'}>
            View Shop
          </button>
        </div>
      )}
    </div>
  );
};
```

**CSS Suggestions:**
```css
.points-widget {
  position: relative;
  cursor: pointer;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.points-widget:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.points-compact {
  display: flex;
  align-items: center;
  gap: 6px;
}

.points-value {
  font-weight: 700;
  font-size: 16px;
}

.level-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.points-expanded {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 16px;
  min-width: 280px;
  color: #333;
  z-index: 1000;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.stat:last-of-type {
  border-bottom: none;
}
```

---

### **TASK 2: Points Toast Notifications** ⭐ CRITICAL

**When:** After food/weight logging actions

**Requirements:**
1. Show animated toast when points are earned
2. Display total points and breakdown
3. Celebrate milestone achievements with special effects

**Implementation:**
```jsx
// Modify existing food logging handler
const handleFoodLog = async (foodData) => {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(foodData)
  });

  const data = await response.json();

  if (data.success) {
    // Show success message
    showSuccessToast(`Logged ${data.entry.foodName}`);

    // Show points earned
    if (data.pointsAwarded > 0) {
      showPointsToast(data.pointsAwarded, data.pointsDetails);
    }

    // Refresh points widget
    window.dispatchEvent(new Event('points-updated'));
  }
};

const showPointsToast = (totalPoints, details) => {
  // Create animated toast
  const toast = document.createElement('div');
  toast.className = 'points-toast';
  
  let html = `
    <div class="points-toast-header">
      <span class="points-icon">✨</span>
      <span class="points-total">+${totalPoints} points</span>
    </div>
  `;

  if (details && details.length > 1) {
    html += '<div class="points-breakdown">';
    details.forEach(detail => {
      html += `
        <div class="points-item">
          <span class="description">${detail.description}</span>
          <span class="points">+${detail.points}</span>
        </div>
      `;
    });
    html += '</div>';
  }

  toast.innerHTML = html;
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add('show'), 100);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};
```

**CSS:**
```css
.points-toast {
  position: fixed;
  top: 80px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  transform: translateX(400px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 10000;
  min-width: 280px;
}

.points-toast.show {
  transform: translateX(0);
  opacity: 1;
}

.points-toast-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.points-icon {
  font-size: 24px;
  animation: sparkle 1s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.points-breakdown {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.points-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.points-item .description {
  opacity: 0.9;
}

.points-item .points {
  font-weight: 600;
}
```

---

### **TASK 3: Rewards/Shop Page** ⭐ HIGH PRIORITY

**Route:** `/rewards` or `/shop`

**Requirements:**
1. Display available shop items in a grid
2. Show user's current points at the top
3. Filter by category (themes, avatars, boosts)
4. Purchase confirmation modal
5. Show owned items with "Equipped" badge

**Implementation:**
```jsx
// RewardsPage.jsx
import React, { useState, useEffect } from 'react';

const RewardsPage = () => {
  const [points, setPoints] = useState(null);
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch points
    const pointsRes = await fetch('/api/rewards/points', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pointsData = await pointsRes.json();
    setPoints(pointsData.points);

    // Fetch shop items
    const itemsRes = await fetch('/api/rewards/shop/items', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const itemsData = await itemsRes.json();
    setItems(itemsData.items);

    // Fetch purchases
    const purchasesRes = await fetch('/api/rewards/shop/purchases', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const purchasesData = await purchasesRes.json();
    setPurchases(purchasesData.purchases);
  };

  const handlePurchase = async (itemId) => {
    if (!confirm('Are you sure you want to purchase this item?')) return;

    const response = await fetch(`/api/rewards/shop/purchase/${itemId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      fetchData(); // Refresh
      window.dispatchEvent(new Event('points-updated'));
    } else {
      alert(data.error);
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  return (
    <div className="rewards-page">
      {/* Header */}
      <div className="rewards-header">
        <h1>Rewards Shop</h1>
        <div className="points-balance">
          <span className="label">Your Points:</span>
          <span className="value">💎 {points?.currentPoints || 0}</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <button 
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          All Items
        </button>
        <button 
          className={selectedCategory === 'theme' ? 'active' : ''}
          onClick={() => setSelectedCategory('theme')}
        >
          🎨 Themes
        </button>
        <button 
          className={selectedCategory === 'avatar' ? 'active' : ''}
          onClick={() => setSelectedCategory('avatar')}
        >
          👤 Avatars
        </button>
        <button 
          className={selectedCategory === 'boost' ? 'active' : ''}
          onClick={() => setSelectedCategory('boost')}
        >
          🚀 Boosts
        </button>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="shop-item">
            <div className="item-header">
              <span className="item-icon">{getCategoryIcon(item.category)}</span>
              {item.already_owned && (
                <span className="owned-badge">✓ Owned</span>
              )}
            </div>
            <h3>{item.name}</h3>
            <p className="description">{item.description}</p>
            <div className="item-footer">
              <div className="price">
                <span className="icon">💎</span>
                <span className="value">{item.cost_points}</span>
              </div>
              {item.can_purchase && !item.already_owned ? (
                <button 
                  className="purchase-btn"
                  onClick={() => handlePurchase(item.id)}
                  disabled={points?.currentPoints < item.cost_points}
                >
                  {points?.currentPoints >= item.cost_points ? 'Purchase' : 'Not Enough Points'}
                </button>
              ) : (
                <button className="purchase-btn" disabled>
                  {item.already_owned ? 'Owned' : 'Locked'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* My Purchases Section */}
      {purchases.length > 0 && (
        <div className="my-purchases">
          <h2>My Items</h2>
          <div className="purchases-list">
            {purchases.map(purchase => (
              <div key={purchase.id} className="purchase-item">
                <span className="icon">{getCategoryIcon(purchase.category)}</span>
                <span className="name">{purchase.name}</span>
                {purchase.is_equipped && (
                  <span className="equipped-badge">✓ Equipped</span>
                )}
                {!purchase.is_equipped && purchase.category !== 'boost' && (
                  <button onClick={() => equipItem(purchase.id)}>
                    Equip
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getCategoryIcon = (category) => {
  const icons = {
    theme: '🎨',
    avatar: '👤',
    boost: '🚀',
    badge: '🏆'
  };
  return icons[category] || '🎁';
};
```

---

### **TASK 4: Progress Dashboard** ⭐ MEDIUM PRIORITY

**Route:** `/progress` or integrate into existing dashboard

**Requirements:**
1. Show milestone progress with visual bars
2. Display achievement cards
3. Show transaction history
4. Leaderboard widget

**Implementation:**
```jsx
// ProgressDashboard.jsx
const ProgressDashboard = () => {
  const [milestones, setMilestones] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    // Fetch food milestones
    const foodRes = await fetch('/api/rewards/food-milestones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const foodData = await foodRes.json();

    // Fetch achievements
    const achRes = await fetch('/api/rewards/achievements', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const achData = await achRes.json();

    // Fetch transactions
    const txRes = await fetch('/api/rewards/transactions?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const txData = await txRes.json();

    setMilestones(foodData.milestone);
    setAchievements(achData.achievements);
    setTransactions(txData.transactions);
  };

  return (
    <div className="progress-dashboard">
      {/* Milestones Section */}
      <div className="milestones-section">
        <h2>Food Logging Progress</h2>
        <div className="milestone-card">
          <div className="milestone-header">
            <span className="level">Level {milestones?.current_level}</span>
            <span className="multiplier">{milestones?.current_multiplier}x Multiplier</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${(milestones?.total_logs / (milestones?.total_logs + milestones?.logs_until_next_level)) * 100}%`
              }}
            />
          </div>
          <div className="milestone-footer">
            <span>{milestones?.total_logs} logs completed</span>
            <span>{milestones?.logs_until_next_level} until next level</span>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="achievements-section">
        <h2>Achievements Unlocked ({achievements.length})</h2>
        <div className="achievements-grid">
          {achievements.map(achievement => (
            <div key={achievement.id} className="achievement-card">
              <div className="achievement-icon">🏆</div>
              <h3>{achievement.title}</h3>
              <p>{achievement.description}</p>
              <div className="points-earned">+{achievement.points_awarded} points</div>
              <div className="unlock-date">
                {new Date(achievement.unlocked_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="transactions-section">
        <h2>Recent Activity</h2>
        <div className="transactions-list">
          {transactions.map(tx => (
            <div key={tx.id} className="transaction-item">
              <div className="tx-icon">
                {tx.transaction_type === 'earn' ? '✨' : '🛒'}
              </div>
              <div className="tx-details">
                <div className="tx-description">{tx.description}</div>
                <div className="tx-date">
                  {new Date(tx.created_at).toLocaleString()}
                </div>
              </div>
              <div className={`tx-points ${tx.transaction_type === 'earn' ? 'earn' : 'spend'}`}>
                {tx.transaction_type === 'earn' ? '+' : '-'}{tx.points}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 🎯 Points System Rules (For UI Messaging)

### **How Points Are Earned:**
- 🍽️ **Food Log:** 50 points × milestone multiplier
- ⚖️ **Weight Log:** 150 points × milestone multiplier
- ✅ **Complete Day:** 250 points (log breakfast, lunch, dinner)
- 🎉 **First Food Log:** 500 points (one-time)
- 🎉 **First Weight Log:** 500 points (one-time)
- 🌅 **Daily Login:** 100 points (once per day)

### **Milestone Multipliers:**
| Level | Logs Required | Multiplier |
|-------|--------------|------------|
| 1 | 0 | 1.0× |
| 2 | 10 | 1.1× |
| 3 | 25 | 1.2× |
| 4 | 50 | 1.3× |
| 5 | 100 | 1.4× |
| 10 | 1000 | 1.9× |
| 12 | 2000 | 2.1× |

### **Important Rules:**
- ⚠️ **Same-day only:** Points awarded only for logs dated today
- 📈 **Milestone progression:** Separate for food and weight logging
- 🔄 **Real-time updates:** Points widget should refresh after any earning action

---

## 🎨 Design Guidelines

### **Color Scheme:**
```css
/* Points/Rewards Theme */
--rewards-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--rewards-gold: #FFD700;
--rewards-silver: #C0C0C0;
--rewards-bronze: #CD7F32;

/* Status Colors */
--earn-green: #10B981;
--spend-red: #EF4444;
--locked-gray: #9CA3AF;
```

### **Icons to Use:**
- 💎 Points
- ⭐ Level
- 🔥 Streak
- 🏆 Achievement
- 🎨 Theme
- 👤 Avatar
- 🚀 Boost
- ✨ Earned
- 🛒 Spent

---

## ✅ Testing Checklist

After implementation, test the following:

1. **Points Widget:**
   - [ ] Displays correctly in header
   - [ ] Shows current points and level
   - [ ] Expands to show details
   - [ ] Updates after earning points

2. **Food Logging:**
   - [ ] Points toast appears after logging
   - [ ] Shows correct points amount
   - [ ] Shows bonus for complete day
   - [ ] Widget updates automatically

3. **Shop Page:**
   - [ ] All items display correctly
   - [ ] Can filter by category
   - [ ] Purchase button works
   - [ ] Shows "Owned" for purchased items
   - [ ] Disables purchase when insufficient points

4. **Progress Dashboard:**
   - [ ] Milestone progress bars work
   - [ ] Achievements display
   - [ ] Transaction history loads
   - [ ] All dates format correctly

5. **Edge Cases:**
   - [ ] Handles 0 points gracefully
   - [ ] Shows appropriate message when locked
   - [ ] Handles API errors
   - [ ] Works on mobile devices

---

## 🚀 Quick Start

1. **Install dependencies** (if not already):
   ```bash
   # No additional dependencies needed, uses standard fetch API
   ```

2. **Add Points Widget to Layout:**
   ```jsx
   // In your main layout/header component
   import PointsWidget from './components/PointsWidget';
   
   <Header>
     <Navigation />
     <PointsWidget />
     <UserMenu />
   </Header>
   ```

3. **Modify Food Logging Handler:**
   ```jsx
   // After successful food log
   if (response.data.pointsAwarded > 0) {
     showPointsToast(response.data.pointsAwarded, response.data.pointsDetails);
     window.dispatchEvent(new Event('points-updated'));
   }
   ```

4. **Add Rewards Route:**
   ```jsx
   // In your router
   <Route path="/rewards" element={<RewardsPage />} />
   <Route path="/progress" element={<ProgressDashboard />} />
   ```

5. **Listen for Points Updates:**
   ```jsx
   // In PointsWidget component
   useEffect(() => {
     const handleUpdate = () => fetchPoints();
     window.addEventListener('points-updated', handleUpdate);
     return () => window.removeEventListener('points-updated', handleUpdate);
   }, []);
   ```

---

## 📞 Support

If you encounter any issues:

1. Check browser console for API errors
2. Verify authentication token is valid
3. Check network tab for failed requests
4. Ensure backend is running at `https://api.calorie-tracker.piogino.ch`

**Backend Status Check:**
```bash
curl https://api.calorie-tracker.piogino.ch/health
```

**Test Points Endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.calorie-tracker.piogino.ch/api/rewards/points
```

---

## 🎉 Expected Outcome

After completing this integration, users will:
- ✅ See their points balance in real-time
- ✅ Get rewarded with points for every healthy action
- ✅ Track their progress with milestone levels
- ✅ Purchase rewards from the shop
- ✅ Unlock achievements
- ✅ Compete on leaderboards
- ✅ Feel motivated to continue logging!

---

**Good luck with the integration! The backend is fully functional and ready to support all these features. 🚀**
