# 🎯 Frontend Implementation Prompt: Rewards System Integration

## Overview
Implement the complete rewards/points system UI for the calorie tracker app. The backend API is fully functional and ready at `https://api.calorie-tracker.piogino.ch/api`.

---

## 📋 Implementation Tasks

### **Phase 1: Points Display Integration** (Priority: HIGH)

#### Task 1.1: Add Points Widget to Header
**Location:** Main navigation/header component

**Requirements:**
- Display current points with a star/coin icon
- Show points in format: "⭐ 700 points"
- Make it clickable to navigate to rewards page
- Auto-refresh when points change
- Add subtle animation when points increase

**API Endpoint:**
```javascript
GET /api/rewards/points
Headers: { Authorization: 'Bearer <token>' }

Response:
{
  "success": true,
  "points": {
    "currentPoints": 700,
    "lifetimePoints": 700,
    "level": 1,
    "foodMilestone": { "level": 1, "multiplier": 1.0, "currentCount": 2 },
    "weightMilestone": { "level": 1, "multiplier": 1.0, "currentCount": 0 }
  }
}
```

**Component Code Template:**
```jsx
import { useState, useEffect } from 'react';

function PointsWidget() {
  const [points, setPoints] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchPoints();
    // Set up event listener for points changes
    window.addEventListener('pointsUpdated', fetchPoints);
    return () => window.removeEventListener('pointsUpdated', fetchPoints);
  }, []);

  const fetchPoints = async () => {
    try {
      const response = await fetch('https://api.calorie-tracker.piogino.ch/api/rewards/points', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success && data.points) {
        const newPoints = data.points.currentPoints;
        if (newPoints > points) {
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 1000);
        }
        setPoints(newPoints);
      }
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  };

  return (
    <div 
      className={`points-widget ${isAnimating ? 'points-increase' : ''}`}
      onClick={() => window.location.href = '/rewards'}
      style={{ cursor: 'pointer' }}
    >
      <span className="points-icon">⭐</span>
      <span className="points-value">{points.toLocaleString()}</span>
    </div>
  );
}

export default PointsWidget;
```

**CSS:**
```css
.points-widget {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  font-weight: 600;
  transition: transform 0.2s;
}

.points-widget:hover {
  transform: scale(1.05);
}

.points-widget.points-increase {
  animation: pointsBounce 0.6s ease-out;
}

@keyframes pointsBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.points-icon {
  font-size: 1.2rem;
}

.points-value {
  font-size: 1rem;
}
```

---

#### Task 1.2: Points Toast Notification System
**Location:** Global notification component (or create new)

**Requirements:**
- Show toast when points are earned
- Display: "+[amount] points" with reason
- Auto-dismiss after 4 seconds
- Stack multiple notifications
- Slide in from top-right with fade animation

**When to Show:**
After successful food/weight logging, the API returns:
```javascript
{
  "success": true,
  "log": { /* log data */ },
  "pointsAwarded": 100,
  "pointsDetails": {
    "basePoints": 50,
    "bonusPoints": 50,
    "reason": "Logged breakfast (2x milestone bonus + complete day bonus)"
  }
}
```

**Component Code:**
```jsx
import { useEffect, useState } from 'react';

function PointsToast({ show, points, message, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="points-toast">
      <div className="points-toast-icon">🎉</div>
      <div className="points-toast-content">
        <div className="points-toast-amount">+{points} points</div>
        <div className="points-toast-message">{message}</div>
      </div>
    </div>
  );
}

// Toast Manager
function ToastManager() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Listen for points events
    const handlePointsEarned = (event) => {
      const { points, message } = event.detail;
      setToasts(prev => [...prev, { id: Date.now(), points, message }]);
    };

    window.addEventListener('pointsEarned', handlePointsEarned);
    return () => window.removeEventListener('pointsEarned', handlePointsEarned);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <PointsToast
          key={toast.id}
          show={true}
          points={toast.points}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default ToastManager;
```

**CSS:**
```css
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.points-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  color: white;
  animation: slideInRight 0.3s ease-out;
  min-width: 300px;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.points-toast-icon {
  font-size: 2rem;
}

.points-toast-amount {
  font-size: 1.5rem;
  font-weight: 700;
}

.points-toast-message {
  font-size: 0.875rem;
  opacity: 0.9;
}
```

**Integration in Food/Weight Logging:**
```javascript
// After successful food log:
const response = await fetch('/api/logs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(logData)
});

const data = await response.json();

if (data.success && data.pointsAwarded > 0) {
  // Trigger toast notification
  window.dispatchEvent(new CustomEvent('pointsEarned', {
    detail: {
      points: data.pointsAwarded,
      message: data.pointsDetails.reason
    }
  }));
  
  // Trigger points widget refresh
  window.dispatchEvent(new Event('pointsUpdated'));
}
```

---

### **Phase 2: Rewards/Shop Page** (Priority: HIGH)

#### Task 2.1: Create Rewards Page
**Location:** New page at `/rewards` or `/shop`

**Page Sections:**
1. **Points Summary Card** (top)
2. **Shop Items Grid** (main)
3. **My Purchases** (expandable section)
4. **Milestones Progress** (sidebar or bottom)

**API Endpoints:**
```javascript
// Get shop items
GET /api/rewards/shop/items
GET /api/rewards/shop/items?category=theme

// Purchase item
POST /api/rewards/shop/items/:itemId/purchase

// Get user purchases
GET /api/rewards/shop/my-purchases
```

**Component Structure:**
```jsx
function RewardsPage() {
  const [points, setPoints] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    fetchPoints();
    fetchShopItems();
    fetchMyPurchases();
  }, []);

  const fetchShopItems = async (category = null) => {
    const url = category && category !== 'all'
      ? `/api/rewards/shop/items?category=${category}`
      : '/api/rewards/shop/items';
    
    const response = await fetch(`https://api.calorie-tracker.piogino.ch${url}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (data.success) {
      setItems(data.items);
    }
  };

  const purchaseItem = async (itemId) => {
    try {
      const response = await fetch(
        `https://api.calorie-tracker.piogino.ch/api/rewards/shop/items/${itemId}/purchase`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}\n\nRemaining points: ${data.remainingPoints}`);
        fetchPoints();
        fetchShopItems(selectedCategory);
        fetchMyPurchases();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (error) {
      alert('Failed to purchase item');
    }
  };

  return (
    <div className="rewards-page">
      <header className="rewards-header">
        <h1>Rewards Shop</h1>
        {points && (
          <div className="points-summary">
            <div className="points-card">
              <span className="label">Current Points</span>
              <span className="value">⭐ {points.currentPoints.toLocaleString()}</span>
            </div>
            <div className="points-card">
              <span className="label">Lifetime Points</span>
              <span className="value">{points.lifetimePoints.toLocaleString()}</span>
            </div>
            <div className="points-card">
              <span className="label">Level</span>
              <span className="value">Level {points.level}</span>
            </div>
          </div>
        )}
      </header>

      <div className="category-filters">
        {['all', 'theme', 'avatar', 'badge', 'power_up'].map(cat => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat);
              fetchShopItems(cat === 'all' ? null : cat);
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {items.map(item => (
          <ShopItemCard
            key={item.id}
            item={item}
            userPoints={points?.currentPoints || 0}
            onPurchase={purchaseItem}
          />
        ))}
      </div>

      {purchases.length > 0 && (
        <section className="my-purchases">
          <h2>My Purchases</h2>
          <div className="purchases-grid">
            {purchases.map(purchase => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Shop Item Card Component:**
```jsx
function ShopItemCard({ item, userPoints, onPurchase }) {
  const canAfford = userPoints >= item.cost_points;
  const canPurchase = item.can_purchase && canAfford;

  return (
    <div className={`shop-item ${!canPurchase ? 'disabled' : ''}`}>
      <div className="item-badge">
        {item.category === 'theme' && '🎨'}
        {item.category === 'avatar' && '👤'}
        {item.category === 'badge' && '🏆'}
        {item.category === 'power_up' && '⚡'}
      </div>
      
      <h3>{item.name}</h3>
      <p className="item-description">{item.description}</p>
      
      <div className="item-footer">
        <div className="item-cost">
          <span className="cost-icon">⭐</span>
          <span className="cost-value">{item.cost_points.toLocaleString()}</span>
        </div>
        
        <button
          className="purchase-btn"
          disabled={!canPurchase}
          onClick={() => onPurchase(item.id)}
        >
          {item.already_owned ? '✓ Owned' : 
           !canAfford ? '🔒 Locked' : 
           'Purchase'}
        </button>
      </div>
      
      {item.required_level > 1 && (
        <div className="level-requirement">
          Requires Level {item.required_level}
        </div>
      )}
    </div>
  );
}
```

**CSS for Rewards Page:**
```css
.rewards-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.rewards-header {
  margin-bottom: 2rem;
}

.points-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.points-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  text-align: center;
}

.points-card .label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.points-card .value {
  font-size: 1.75rem;
  font-weight: 700;
}

.category-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1.25rem;
  border: 2px solid #667eea;
  background: white;
  border-radius: 20px;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f0f4ff;
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.shop-item {
  position: relative;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s;
}

.shop-item:hover {
  border-color: #667eea;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.shop-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-badge {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.shop-item h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.item-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  min-height: 60px;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-cost {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #667eea;
}

.purchase-btn {
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.purchase-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.purchase-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.level-requirement {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #fef3c7;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  color: #92400e;
  font-weight: 600;
}
```

---

### **Phase 3: Progress Dashboard** (Priority: MEDIUM)

#### Task 3.1: Create Progress/Stats Page
**Location:** New page at `/progress` or section in `/rewards`

**Features:**
1. Food logging milestone progress bar
2. Weight logging milestone progress bar
3. Level progress indicator
4. Recent transactions history
5. Achievements display

**API Endpoints:**
```javascript
GET /api/rewards/milestones/food
GET /api/rewards/milestones/weight
GET /api/rewards/transactions?limit=20
GET /api/rewards/achievements
```

**Component:**
```jsx
function ProgressDashboard() {
  const [foodMilestone, setFoodMilestone] = useState(null);
  const [weightMilestone, setWeightMilestone] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchMilestones();
    fetchTransactions();
  }, []);

  const fetchMilestones = async () => {
    const [food, weight] = await Promise.all([
      fetch('https://api.calorie-tracker.piogino.ch/api/rewards/milestones/food', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json()),
      fetch('https://api.calorie-tracker.piogino.ch/api/rewards/milestones/weight', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json())
    ]);

    if (food.success) setFoodMilestone(food.milestone);
    if (weight.success) setWeightMilestone(weight.milestone);
  };

  return (
    <div className="progress-dashboard">
      <h1>Your Progress</h1>

      {foodMilestone && (
        <div className="milestone-card">
          <h3>🍽️ Food Logging Milestone</h3>
          <div className="milestone-info">
            <span>Level {foodMilestone.current_level}</span>
            <span>{foodMilestone.current_multiplier}x Points Multiplier</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(foodMilestone.total_logs / 
                  (foodMilestone.total_logs + foodMilestone.logs_until_next_level)) * 100}%` 
              }}
            />
          </div>
          <p className="progress-text">
            {foodMilestone.total_logs} / {foodMilestone.total_logs + foodMilestone.logs_until_next_level} logs
            {foodMilestone.next_level && ` (${foodMilestone.logs_until_next_level} more to Level ${foodMilestone.next_level})`}
          </p>
        </div>
      )}

      {weightMilestone && (
        <div className="milestone-card">
          <h3>⚖️ Weight Logging Milestone</h3>
          <div className="milestone-info">
            <span>Level {weightMilestone.current_level}</span>
            <span>{weightMilestone.current_multiplier}x Points Multiplier</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(weightMilestone.total_logs / 
                  (weightMilestone.total_logs + weightMilestone.logs_until_next_level)) * 100}%` 
              }}
            />
          </div>
          <p className="progress-text">
            {weightMilestone.total_logs} / {weightMilestone.total_logs + weightMilestone.logs_until_next_level} logs
            {weightMilestone.next_level && ` (${weightMilestone.logs_until_next_level} more to Level ${weightMilestone.next_level})`}
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="transactions-section">
          <h3>Recent Activity</h3>
          <div className="transactions-list">
            {transactions.map(tx => (
              <div key={tx.id} className="transaction-item">
                <span className="tx-type">
                  {tx.transaction_type === 'earn' ? '✅' : '💸'}
                </span>
                <span className="tx-description">{tx.description}</span>
                <span className={`tx-amount ${tx.transaction_type}`}>
                  {tx.transaction_type === 'earn' ? '+' : '-'}
                  {tx.points_amount}
                </span>
                <span className="tx-date">
                  {new Date(tx.transaction_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**CSS:**
```css
.progress-dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.milestone-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.milestone-info {
  display: flex;
  justify-content: space-between;
  margin: 1rem 0;
  font-weight: 600;
  color: #667eea;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease-out;
}

.progress-text {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.transactions-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.transaction-item {
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  align-items: center;
}

.tx-type {
  font-size: 1.5rem;
}

.tx-amount {
  font-weight: 700;
  font-size: 1.125rem;
}

.tx-amount.earn {
  color: #10b981;
}

.tx-amount.spend {
  color: #ef4444;
}

.tx-date {
  color: #9ca3af;
  font-size: 0.875rem;
}
```

---

## 🧪 Testing Checklist

After implementation, verify each feature:

### Points Display
- [ ] Points widget shows in header
- [ ] Points value updates after logging food/weight
- [ ] Widget animates when points increase
- [ ] Clicking widget navigates to rewards page

### Toast Notifications
- [ ] Toast appears after earning points
- [ ] Shows correct point amount and reason
- [ ] Auto-dismisses after 4 seconds
- [ ] Multiple toasts stack properly
- [ ] Animation is smooth

### Rewards Shop
- [ ] All shop items display correctly
- [ ] Category filters work
- [ ] Can purchase items with sufficient points
- [ ] Purchase button disabled for insufficient points
- [ ] "Owned" status shows for purchased items
- [ ] Points deduct correctly after purchase
- [ ] Confirmation message displays

### Progress Dashboard
- [ ] Food milestone progress bar displays
- [ ] Weight milestone progress bar displays
- [ ] Progress percentages calculate correctly
- [ ] Transaction history shows recent activity
- [ ] Earn/spend transactions have correct colors

### Integration
- [ ] All API calls include auth token
- [ ] Error handling for failed requests
- [ ] Loading states for async operations
- [ ] Responsive design on mobile devices

---

## 📚 API Quick Reference

**Base URL:** `https://api.calorie-tracker.piogino.ch/api`

**Authentication:** All endpoints require `Authorization: Bearer <token>` header

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/rewards/points` | Get user's current points and stats |
| GET | `/rewards/shop/items` | Get all shop items |
| GET | `/rewards/shop/items?category=theme` | Get items by category |
| POST | `/rewards/shop/items/:id/purchase` | Purchase an item |
| GET | `/rewards/shop/my-purchases` | Get user's purchased items |
| GET | `/rewards/milestones/food` | Get food logging milestone |
| GET | `/rewards/milestones/weight` | Get weight logging milestone |
| GET | `/rewards/transactions` | Get transaction history |
| GET | `/rewards/leaderboard` | Get points leaderboard |

---

## 🎨 Design System

**Colors:**
- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Success: `#10b981`
- Error: `#ef4444`
- Warning: `#f59e0b`
- Text primary: `#1f2937`
- Text secondary: `#6b7280`

**Typography:**
- Use existing app fonts
- Points values: Bold, 700 weight
- Labels: 600 weight

**Spacing:**
- Use rem units (1rem = 16px)
- Card padding: 1.5rem - 2rem
- Gap between elements: 0.75rem - 1rem

---

## 🚀 Implementation Priority

1. **Start with Phase 1** (Points Display) - Quick wins, high impact
2. **Then Phase 2** (Rewards Shop) - Core feature
3. **Finally Phase 3** (Progress Dashboard) - Enhancement

---

## 💡 Tips

- Use `localStorage.getItem('token')` for authentication
- Dispatch custom events for cross-component communication
- Test with real API calls from the start
- Handle loading and error states
- Make it mobile-responsive
- Add subtle animations for better UX

---

## ✅ Definition of Done

All features implemented when:
- [ ] Points widget visible in header
- [ ] Toast notifications working
- [ ] Can browse shop items
- [ ] Can purchase items
- [ ] Progress dashboard shows milestones
- [ ] All API integrations working
- [ ] Responsive on mobile
- [ ] Error handling implemented
- [ ] Code reviewed and tested

---

**Need help?** Reference the full documentation at:
`/docs/frontend/REWARDS_FRONTEND_INTEGRATION.md`

**Backend API Status:** ✅ Fully functional and deployed
