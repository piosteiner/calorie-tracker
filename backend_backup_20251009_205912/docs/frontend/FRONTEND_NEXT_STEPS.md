# 🎯 Frontend Copilot: Rewards System - Next Steps

**Date:** October 9, 2025  
**Status:** Backend 100% Ready | Frontend 40% Complete  
**Remaining Work:** 6-8 hours to complete full rewards system UI

---

## 📊 Current State Analysis

### ✅ **What's Already Working (40% Complete)**

Based on the live application screenshot, you have successfully implemented:

1. **✅ Points Display System**
   - Location: "Your Progress" section on main dashboard
   - Shows: Current Points (750), Lifetime Points (750), Level (1)
   - Status: **Fully functional**

2. **✅ Toast Notification System**
   - Appears: Top-right corner after earning points
   - Shows: "+50 Points!" with breakdown ("Food logged!", "50 base points")
   - Animation: Slide-in from right, auto-dismiss
   - Status: **Fully functional**

3. **✅ Daily Reward Integration**
   - Button: "✓ Daily Reward Claimed"
   - Status: **Fully functional**

4. **✅ Points Awarding System**
   - Triggers: After food logging
   - Backend: Returns `pointsAwarded` and `pointsDetails` in response
   - Frontend: Displays toast and updates points
   - Status: **Fully functional**

### ❌ **What's Missing (60% Remaining)**

Three major features need implementation:

1. **❌ Rewards Shop Page** - *Not visible anywhere*
2. **❌ Milestone Progress Visualization** - *Data available but not displayed*
3. **❌ Transaction History** - *Not implemented*

---

## 🎯 **YOUR MISSION: Complete the Rewards System UI**

You will build **3 new components** to complete the rewards system. All backend APIs are ready and tested.

---

## 📋 **TASK 1: Milestone Progress Visualization** (PRIORITY: HIGH)

### Goal
Add visual progress bars to the existing "Your Progress" section showing food and weight logging milestones.

### Location
Enhance the existing "Your Progress" section (where Current Points/Lifetime Points/Level are shown)

### What to Build

Add two progress bar cards below the current points display:

#### Card 1: Food Logging Milestone
```
🍽️ Food Logging Progress
━━━━━━░░░░░░░░░░░░░░ 20% (2/10 logs)
Level 1 → Level 2 | Current: 1.0x → Next: 1.5x multiplier
8 more logs needed to unlock 1.5x points multiplier!
```

#### Card 2: Weight Logging Milestone
```
⚖️ Weight Logging Progress
░░░░░░░░░░░░░░░░░░░░ 0% (0/5 logs)
Level 1 → Level 2 | Current: 1.0x → Next: 1.5x multiplier
5 more logs needed to unlock 1.5x points multiplier!
```

### API Endpoints

**Food Milestone:**
```javascript
GET /api/rewards/milestones/food
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "milestone": {
    "total_logs": 2,
    "current_level": 1,
    "current_multiplier": 1.0,
    "next_level": 2,
    "next_multiplier": 1.5,
    "logs_until_next_level": 8,
    "created_at": "2025-10-09T12:33:03.000Z",
    "last_updated": "2025-10-09T12:33:03.000Z"
  }
}
```

**Weight Milestone:**
```javascript
GET /api/rewards/milestones/weight
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "milestone": {
    "total_logs": 0,
    "current_level": 1,
    "current_multiplier": 1.0,
    "next_level": 2,
    "next_multiplier": 1.5,
    "logs_until_next_level": 5,
    "created_at": "2025-10-09T14:16:52.000Z",
    "last_updated": "2025-10-09T14:16:52.000Z"
  }
}
```

### Implementation Code

```jsx
import { useState, useEffect } from 'react';

function MilestoneProgressBars() {
  const [foodMilestone, setFoodMilestone] = useState(null);
  const [weightMilestone, setWeightMilestone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMilestones();
    
    // Listen for updates when food/weight is logged
    window.addEventListener('milestonesUpdated', fetchMilestones);
    return () => window.removeEventListener('milestonesUpdated', fetchMilestones);
  }, []);

  const fetchMilestones = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = 'https://api.calorie-tracker.piogino.ch/api';
      
      const [foodRes, weightRes] = await Promise.all([
        fetch(`${baseUrl}/rewards/milestones/food`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/rewards/milestones/weight`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const foodData = await foodRes.json();
      const weightData = await weightRes.json();

      if (foodData.success) setFoodMilestone(foodData.milestone);
      if (weightData.success) setWeightMilestone(weightData.milestone);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
      setLoading(false);
    }
  };

  const calculateProgress = (current, needed) => {
    return (current / (current + needed)) * 100;
  };

  if (loading) return <div>Loading milestones...</div>;

  return (
    <div className="milestones-container">
      {/* Food Milestone */}
      {foodMilestone && (
        <div className="milestone-card food-milestone">
          <div className="milestone-header">
            <span className="milestone-icon">🍽️</span>
            <h3>Food Logging Progress</h3>
          </div>
          
          <div className="milestone-stats">
            <span className="level-badge">Level {foodMilestone.current_level}</span>
            <span className="multiplier">{foodMilestone.current_multiplier}x Points</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill food"
                style={{ 
                  width: `${calculateProgress(
                    foodMilestone.total_logs, 
                    foodMilestone.logs_until_next_level
                  )}%` 
                }}
              />
            </div>
            <span className="progress-text">
              {foodMilestone.total_logs} / {foodMilestone.total_logs + foodMilestone.logs_until_next_level} logs
            </span>
          </div>

          {foodMilestone.next_level && (
            <div className="milestone-next">
              <p>
                🎯 <strong>{foodMilestone.logs_until_next_level} more logs</strong> to reach Level {foodMilestone.next_level}
              </p>
              <p className="multiplier-boost">
                Unlock {foodMilestone.next_multiplier}x multiplier!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weight Milestone */}
      {weightMilestone && (
        <div className="milestone-card weight-milestone">
          <div className="milestone-header">
            <span className="milestone-icon">⚖️</span>
            <h3>Weight Logging Progress</h3>
          </div>
          
          <div className="milestone-stats">
            <span className="level-badge">Level {weightMilestone.current_level}</span>
            <span className="multiplier">{weightMilestone.current_multiplier}x Points</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill weight"
                style={{ 
                  width: `${calculateProgress(
                    weightMilestone.total_logs, 
                    weightMilestone.logs_until_next_level
                  )}%` 
                }}
              />
            </div>
            <span className="progress-text">
              {weightMilestone.total_logs} / {weightMilestone.total_logs + weightMilestone.logs_until_next_level} logs
            </span>
          </div>

          {weightMilestone.next_level && (
            <div className="milestone-next">
              <p>
                🎯 <strong>{weightMilestone.logs_until_next_level} more logs</strong> to reach Level {weightMilestone.next_level}
              </p>
              <p className="multiplier-boost">
                Unlock {weightMilestone.next_multiplier}x multiplier!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MilestoneProgressBars;
```

### CSS Styling

```css
.milestones-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.milestone-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.milestone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.milestone-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.milestone-icon {
  font-size: 2rem;
}

.milestone-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.milestone-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.level-badge {
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.multiplier {
  padding: 0.25rem 0.75rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.progress-bar-container {
  margin: 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease-out;
  position: relative;
}

.progress-fill.food {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-fill.weight {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.milestone-next {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.milestone-next p {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.multiplier-boost {
  color: #059669 !important;
  font-weight: 600 !important;
}
```

### Integration

Add this component to your existing "Your Progress" section:

```jsx
// In your main dashboard component
<section className="your-progress">
  <h2>Your Progress</h2>
  
  {/* Existing points display */}
  <div className="points-display">
    <div>Current Points: {currentPoints}</div>
    <div>Lifetime Points: {lifetimePoints}</div>
    <div>Level: {level}</div>
  </div>

  {/* NEW: Add milestone progress bars */}
  <MilestoneProgressBars />
</section>
```

### When to Update

Trigger a refresh after food/weight logging:

```javascript
// After successful food log:
window.dispatchEvent(new Event('milestonesUpdated'));

// After successful weight log:
window.dispatchEvent(new Event('milestonesUpdated'));
```

---

## 📋 **TASK 2: Rewards Shop Page** (PRIORITY: HIGH)

### Goal
Create a completely new page where users can browse and purchase reward items using their points.

### Location
Create new route: `/rewards` or `/shop`

### What to Build

A full-page shop interface with:

1. **Header Section**
   - Page title: "Rewards Shop"
   - Points summary card (current points, level)
   - Call-to-action: "Earn more points by logging food & weight!"

2. **Category Filters**
   - Buttons: All, Themes, Avatars, Badges, Power-ups
   - Active state styling

3. **Shop Items Grid**
   - Responsive grid (3-4 columns desktop, 1-2 mobile)
   - Each item card shows:
     - Icon/emoji
     - Name
     - Description
     - Point cost
     - Purchase button
     - "Owned" badge if already purchased
     - Lock icon if level requirement not met

4. **Purchase Flow**
   - Click "Purchase" → Show confirmation dialog
   - Display item details and cost
   - Confirm → API call → Success message
   - Update points display
   - Mark item as "Owned"

### API Endpoints

**Get Shop Items:**
```javascript
GET /api/rewards/shop/items
GET /api/rewards/shop/items?category=theme
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "items": [
    {
      "id": 1,
      "name": "Dark Mode Theme",
      "description": "Enable dark mode across the entire app",
      "category": "theme",
      "cost_points": 500,
      "item_data": { "theme_id": "dark", "duration_hours": null },
      "is_limited_edition": false,
      "stock_quantity": null,
      "purchase_limit": 1,
      "required_level": 1,
      "user_purchase_count": 0,
      "can_purchase": true,
      "already_owned": false
    },
    {
      "id": 2,
      "name": "Golden Star Badge",
      "description": "Show off your dedication with this exclusive badge",
      "category": "badge",
      "cost_points": 1000,
      "required_level": 5,
      "can_purchase": false,
      "already_owned": false
    }
  ],
  "userLevel": 1
}
```

**Purchase Item:**
```javascript
POST /api/rewards/shop/items/:itemId/purchase
Headers: { Authorization: 'Bearer <token>' }

Response (Success):
{
  "success": true,
  "message": "Successfully purchased Dark Mode Theme!",
  "item": {
    "id": 1,
    "name": "Dark Mode Theme",
    "category": "theme"
  },
  "pointsSpent": 500,
  "remainingPoints": 250
}

Response (Error):
{
  "success": false,
  "error": "Insufficient points",
  "required": 500,
  "current": 250
}
```

**Get My Purchases:**
```javascript
GET /api/rewards/shop/my-purchases
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "purchases": [
    {
      "id": 1,
      "name": "Dark Mode Theme",
      "description": "Enable dark mode across the entire app",
      "category": "theme",
      "purchased_at": "2025-10-09T15:30:00.000Z",
      "is_active": true,
      "is_equipped": true,
      "expires_at": null
    }
  ]
}
```

### Implementation Code

```jsx
import { useState, useEffect } from 'react';

function RewardsShopPage() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const baseUrl = 'https://api.calorie-tracker.piogino.ch/api';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user points
      const pointsRes = await fetch(`${baseUrl}/rewards/points`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pointsData = await pointsRes.json();
      if (pointsData.success && pointsData.points) {
        setUserPoints(pointsData.points.currentPoints);
        setUserLevel(pointsData.points.level);
      }

      // Fetch shop items
      const categoryParam = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const itemsRes = await fetch(`${baseUrl}/rewards/shop/items${categoryParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setItems(itemsData.items);
      }

      // Fetch user purchases
      const purchasesRes = await fetch(`${baseUrl}/rewards/shop/my-purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const purchasesData = await purchasesRes.json();
      if (purchasesData.success) {
        setPurchases(purchasesData.purchases);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch shop data:', error);
      setLoading(false);
    }
  };

  const handlePurchaseClick = (item) => {
    setSelectedItem(item);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(
        `${baseUrl}/rewards/shop/items/${selectedItem.id}/purchase`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        // Success!
        alert(`✅ ${data.message}\n\n💰 Points spent: ${data.pointsSpent}\n⭐ Remaining: ${data.remainingPoints}`);
        
        // Refresh data
        setShowPurchaseModal(false);
        setSelectedItem(null);
        fetchData();
        
        // Trigger points widget update
        window.dispatchEvent(new Event('pointsUpdated'));
      } else {
        alert(`❌ Purchase failed: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Failed to purchase item. Please try again.');
      console.error('Purchase error:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      theme: '🎨',
      avatar: '👤',
      badge: '🏆',
      power_up: '⚡',
      challenge: '🎯'
    };
    return icons[category] || '✨';
  };

  if (loading) return <div className="loading">Loading shop...</div>;

  return (
    <div className="rewards-shop-page">
      {/* Header */}
      <header className="shop-header">
        <h1>🏪 Rewards Shop</h1>
        <p className="subtitle">Spend your points on exclusive rewards!</p>
        
        <div className="user-stats">
          <div className="stat-card">
            <span className="stat-label">Your Points</span>
            <span className="stat-value">⭐ {userPoints.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Your Level</span>
            <span className="stat-value">Level {userLevel}</span>
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <div className="category-filters">
        {['all', 'theme', 'avatar', 'badge', 'power_up'].map(cat => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Shop Items Grid */}
      <div className="shop-grid">
        {items.length === 0 ? (
          <p className="no-items">No items available in this category</p>
        ) : (
          items.map(item => (
            <div key={item.id} className={`shop-item-card ${!item.can_purchase ? 'locked' : ''}`}>
              <div className="item-icon">{getCategoryIcon(item.category)}</div>
              
              <h3 className="item-name">{item.name}</h3>
              <p className="item-description">{item.description}</p>
              
              {item.required_level > userLevel && (
                <div className="level-requirement">
                  🔒 Requires Level {item.required_level}
                </div>
              )}
              
              <div className="item-footer">
                <div className="item-cost">
                  <span className="cost-icon">⭐</span>
                  <span className="cost-value">{item.cost_points.toLocaleString()}</span>
                </div>
                
                <button
                  className="purchase-btn"
                  disabled={!item.can_purchase || item.already_owned}
                  onClick={() => handlePurchaseClick(item)}
                >
                  {item.already_owned ? '✓ Owned' : 
                   userPoints < item.cost_points ? '🔒 Not enough points' :
                   item.required_level > userLevel ? '🔒 Level locked' :
                   'Purchase'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* My Purchases Section */}
      {purchases.length > 0 && (
        <section className="my-purchases-section">
          <h2>📦 My Purchases</h2>
          <div className="purchases-grid">
            {purchases.map(purchase => (
              <div key={purchase.id} className="purchase-card">
                <div className="purchase-icon">{getCategoryIcon(purchase.category)}</div>
                <div className="purchase-info">
                  <h4>{purchase.name}</h4>
                  <p className="purchase-date">
                    Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                  </p>
                  {purchase.is_equipped && <span className="equipped-badge">✓ Equipped</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Purchase</h3>
            <div className="modal-item">
              <div className="modal-icon">{getCategoryIcon(selectedItem.category)}</div>
              <h4>{selectedItem.name}</h4>
              <p>{selectedItem.description}</p>
            </div>
            <div className="modal-cost">
              <span>Cost:</span>
              <span className="cost-amount">⭐ {selectedItem.cost_points.toLocaleString()}</span>
            </div>
            <div className="modal-balance">
              <span>Your balance:</span>
              <span>⭐ {userPoints.toLocaleString()}</span>
            </div>
            <div className="modal-after">
              <span>After purchase:</span>
              <span>⭐ {(userPoints - selectedItem.cost_points).toLocaleString()}</span>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPurchaseModal(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmPurchase}>
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RewardsShopPage;
```

### CSS Styling

```css
.rewards-shop-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.shop-header {
  text-align: center;
  margin-bottom: 3rem;
}

.shop-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #6b7280;
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.user-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  min-width: 180px;
  text-align: center;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
}

.category-filters {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #667eea;
  background: white;
  border-radius: 24px;
  color: #667eea;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f0f4ff;
  transform: translateY(-2px);
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.shop-item-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.shop-item-card:hover:not(.locked) {
  border-color: #667eea;
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.15);
  transform: translateY(-4px);
}

.shop-item-card.locked {
  opacity: 0.6;
}

.item-icon {
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.item-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.75rem;
  text-align: center;
}

.item-description {
  color: #6b7280;
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 1.5rem;
  flex-grow: 1;
  min-height: 60px;
}

.level-requirement {
  background: #fef3c7;
  color: #92400e;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 2px solid #f3f4f6;
}

.item-cost {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.purchase-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.purchase-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.purchase-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 500px;
  width: 90%;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h3 {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #1f2937;
}

.modal-item {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
}

.modal-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-item h4 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.modal-item p {
  color: #6b7280;
  font-size: 0.95rem;
}

.modal-cost,
.modal-balance,
.modal-after {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  font-size: 1.125rem;
}

.modal-after {
  border-top: 2px solid #e5e7eb;
  padding-top: 1rem;
  margin-top: 0.5rem;
  font-weight: 700;
}

.cost-amount {
  color: #ef4444;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* My Purchases Section */
.my-purchases-section {
  margin-top: 4rem;
  padding-top: 3rem;
  border-top: 2px solid #e5e7eb;
}

.my-purchases-section h2 {
  font-size: 1.75rem;
  margin-bottom: 2rem;
  color: #1f2937;
}

.purchases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.purchase-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  align-items: center;
}

.purchase-icon {
  font-size: 2.5rem;
}

.purchase-info {
  flex: 1;
}

.purchase-info h4 {
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
  color: #1f2937;
}

.purchase-date {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

.equipped-badge {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .rewards-shop-page {
    padding: 1rem;
  }
  
  .shop-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .category-filters {
    gap: 0.5rem;
  }
  
  .filter-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}
```

### Router Setup

Add route in your router configuration:

```javascript
// Example with React Router
import RewardsShopPage from './pages/RewardsShopPage';

// In your routes:
<Route path="/rewards" element={<RewardsShopPage />} />
// or
<Route path="/shop" element={<RewardsShopPage />} />
```

### Navigation

Add link to navigation menu:

```jsx
<nav>
  {/* ... other nav items ... */}
  <a href="/rewards" className="nav-link">
    🏪 Rewards Shop
  </a>
</nav>
```

---

## 📋 **TASK 3: Transaction History** (PRIORITY: MEDIUM)

### Goal
Display a list of recent points transactions (earned and spent) in the "Your Progress" section.

### Location
Add below the milestone progress bars in "Your Progress" section

### What to Build

A collapsible transaction history showing:
- Recent 20 transactions
- Each transaction shows:
  - Icon (✅ for earned, 💸 for spent)
  - Description
  - Points amount (+/- with color)
  - Date
  - Running balance (optional)

### API Endpoint

```javascript
GET /api/rewards/transactions?limit=20
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "transactions": [
    {
      "id": 8,
      "points_amount": 250,
      "transaction_type": "earn",
      "description": "Complete Day Bonus (100% of daily calories logged)",
      "category": "bonus",
      "transaction_date": "2025-10-09T17:46:23.000Z"
    },
    {
      "id": 7,
      "points_amount": 50,
      "transaction_type": "earn",
      "description": "Logged food",
      "category": "food_log",
      "transaction_date": "2025-10-09T17:46:23.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 8,
    "hasMore": false
  }
}
```

### Implementation Code

```jsx
import { useState, useEffect } from 'react';

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchTransactions();
    }
    
    // Listen for new transactions
    window.addEventListener('pointsUpdated', fetchTransactions);
    return () => window.removeEventListener('pointsUpdated', fetchTransactions);
  }, [expanded]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        'https://api.calorie-tracker.piogino.ch/api/rewards/transactions?limit=20',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="transaction-history">
      <button 
        className="history-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span>📜 Transaction History</span>
        <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="transactions-container">
          {loading ? (
            <p className="loading-text">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet. Start earning points by logging food!</p>
          ) : (
            <div className="transactions-list">
              {transactions.map(tx => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-icon">
                    {tx.transaction_type === 'earn' ? '✅' : '💸'}
                  </div>
                  <div className="tx-details">
                    <div className="tx-description">{tx.description}</div>
                    <div className="tx-date">{formatDate(tx.transaction_date)}</div>
                  </div>
                  <div className={`tx-amount ${tx.transaction_type}`}>
                    {tx.transaction_type === 'earn' ? '+' : '-'}
                    {tx.points_amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
```

### CSS Styling

```css
.transaction-history {
  margin-top: 2rem;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  font-weight: 600;
  transition: all 0.2s;
}

.history-toggle:hover {
  filter: brightness(1.1);
}

.toggle-icon {
  font-size: 0.875rem;
  transition: transform 0.3s;
}

.transactions-container {
  padding: 1.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transaction-item {
  display: grid;
  grid-template-columns: 50px 1fr auto;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  align-items: center;
  transition: all 0.2s;
}

.transaction-item:hover {
  background: #f3f4f6;
  transform: translateX(4px);
}

.tx-icon {
  font-size: 2rem;
  text-align: center;
}

.tx-details {
  flex: 1;
}

.tx-description {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.tx-date {
  font-size: 0.875rem;
  color: #9ca3af;
}

.tx-amount {
  font-size: 1.5rem;
  font-weight: 700;
  white-space: nowrap;
}

.tx-amount.earn {
  color: #10b981;
}

.tx-amount.spend {
  color: #ef4444;
}

.loading-text,
.no-transactions {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

/* Scrollbar styling */
.transactions-container::-webkit-scrollbar {
  width: 8px;
}

.transactions-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.transactions-container::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 4px;
}

.transactions-container::-webkit-scrollbar-thumb:hover {
  background: #764ba2;
}
```

### Integration

Add to "Your Progress" section:

```jsx
<section className="your-progress">
  <h2>Your Progress</h2>
  
  {/* Points display */}
  <div className="points-display">...</div>

  {/* Milestone progress bars */}
  <MilestoneProgressBars />

  {/* Transaction history */}
  <TransactionHistory />
</section>
```

---

## 🧪 **Testing Checklist**

After implementing each task, verify:

### Milestone Progress Bars
- [ ] Bars display correctly with proper percentages
- [ ] Shows current and next level information
- [ ] Multiplier values are correct (1.0x, 1.5x, etc.)
- [ ] Updates after logging food/weight
- [ ] Responsive on mobile devices
- [ ] Shimmer animation works smoothly

### Rewards Shop
- [ ] Shop items load correctly
- [ ] Category filters work
- [ ] Can browse all items
- [ ] Purchase button disabled when insufficient points
- [ ] Purchase confirmation modal appears
- [ ] Purchase completes successfully
- [ ] Points deduct correctly
- [ ] "Owned" badge shows after purchase
- [ ] Level requirements display correctly
- [ ] My Purchases section shows owned items
- [ ] Responsive on mobile

### Transaction History
- [ ] Toggle expands/collapses correctly
- [ ] Transactions load and display
- [ ] Earn transactions show in green with +
- [ ] Spend transactions show in red with -
- [ ] Dates format correctly ("2 hours ago", etc.)
- [ ] Updates after new transactions
- [ ] Scrollable if many transactions
- [ ] Responsive on mobile

---

## 🚀 **Implementation Order**

### Day 1: Milestone Progress (2-3 hours)
1. Create `MilestoneProgressBars` component
2. Add API calls for food and weight milestones
3. Style progress bars with gradients and animations
4. Integrate into "Your Progress" section
5. Test on desktop and mobile

### Day 2: Rewards Shop (4-5 hours)
1. Create `RewardsShopPage` component
2. Set up routing to `/rewards`
3. Implement shop items grid
4. Add category filtering
5. Build purchase confirmation modal
6. Add "My Purchases" section
7. Test full purchase flow
8. Add navigation link

### Day 3: Transaction History (1-2 hours)
1. Create `TransactionHistory` component
2. Implement collapsible design
3. Add API integration
4. Style transaction items
5. Test expand/collapse
6. Integrate into "Your Progress"

---

## 🎨 **Design Principles**

### Colors
- **Primary Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Success/Earn**: `#10b981` (green)
- **Error/Spend**: `#ef4444` (red)
- **Warning**: `#f59e0b` (orange)
- **Text Primary**: `#1f2937`
- **Text Secondary**: `#6b7280`
- **Background**: `#f9fafb`

### Typography
- **Headings**: Bold, 1.5rem - 2.5rem
- **Body**: Regular, 0.875rem - 1rem
- **Labels**: Semi-bold (600), 0.875rem
- **Values**: Bold (700), 1.5rem - 2rem

### Spacing
- Use rem units (1rem = 16px)
- Consistent gaps: 0.5rem, 1rem, 1.5rem, 2rem
- Card padding: 1.5rem - 2rem
- Section margins: 2rem - 3rem

### Animations
- Transitions: 0.2s - 0.3s
- Hover effects: `transform: translateY(-2px)` or `scale(1.05)`
- Progress bars: Smooth 0.5s width transitions
- Modals: Fade in (0.2s) + slide up (0.3s)

---

## 💡 **Pro Tips**

1. **Use the existing points widget**: Don't recreate it - just enhance it
2. **Test with real API calls**: Don't mock data - backend is 100% ready
3. **Mobile first**: Design for mobile, then scale up
4. **Error handling**: Add try-catch and user-friendly error messages
5. **Loading states**: Show loading spinners for async operations
6. **Accessibility**: Add aria-labels and keyboard navigation
7. **Performance**: Use React.memo for heavy components
8. **Events**: Use custom events for cross-component updates

---

## 📚 **API Reference**

All endpoints are at: `https://api.calorie-tracker.piogino.ch/api`

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/rewards/points` | Get user's points & stats | ✅ Ready |
| GET | `/rewards/milestones/food` | Food logging milestone | ✅ Ready |
| GET | `/rewards/milestones/weight` | Weight logging milestone | ✅ Ready |
| GET | `/rewards/transactions` | Transaction history | ✅ Ready |
| GET | `/rewards/shop/items` | Get shop items | ✅ Ready |
| POST | `/rewards/shop/items/:id/purchase` | Purchase item | ✅ Ready |
| GET | `/rewards/shop/my-purchases` | User's purchases | ✅ Ready |
| GET | `/rewards/leaderboard` | Points leaderboard | ✅ Ready |
| POST | `/rewards/daily-reward` | Claim daily reward | ✅ Ready |

All require: `Authorization: Bearer <token>` header

---

## ✅ **Definition of Done**

You're done when:

- [ ] Milestone progress bars show in "Your Progress" section
- [ ] Both food and weight milestones display correctly
- [ ] Progress bars update after logging
- [ ] New `/rewards` page is accessible from navigation
- [ ] Can browse shop items with category filters
- [ ] Can purchase items with points
- [ ] Purchase confirmation works correctly
- [ ] "My Purchases" section shows owned items
- [ ] Transaction history is collapsible and shows recent activity
- [ ] All features work on desktop and mobile
- [ ] Error handling is in place
- [ ] Loading states are implemented
- [ ] Code is clean and commented

---

## 🆘 **Need Help?**

**Documentation:**
- Full API Reference: `/docs/frontend/REWARDS_FRONTEND_INTEGRATION.md`
- Implementation Guide: `/docs/frontend/FRONTEND_IMPLEMENTATION_PROMPT.md`
- System Status: `/docs/REWARDS_SYSTEM_STATUS.md`

**Testing:**
- Login: Use username `demo`, password `demo123`
- API Base URL: `https://api.calorie-tracker.piogino.ch/api`
- Test in browser console with provided fetch examples

**Backend Status:**
- ✅ 100% functional and deployed
- ✅ All endpoints tested and working
- ✅ Database fully populated
- ✅ Detailed logging enabled

---

## 🎯 **Quick Start Command**

```bash
# 1. Create the component files
touch src/components/MilestoneProgressBars.jsx
touch src/components/TransactionHistory.jsx
touch src/pages/RewardsShopPage.jsx

# 2. Copy the code from this document

# 3. Add routing for /rewards page

# 4. Import and add to your dashboard:
import MilestoneProgressBars from './components/MilestoneProgressBars';
import TransactionHistory from './components/TransactionHistory';

# 5. Test each feature as you build it

# 6. Celebrate when done! 🎉
```

---

**Estimated Total Time:** 6-8 hours  
**Backend Status:** ✅ 100% Ready  
**Your Progress:** 40% → 100% 🚀

**LET'S BUILD THE BEST REWARDS SYSTEM! 💪**
