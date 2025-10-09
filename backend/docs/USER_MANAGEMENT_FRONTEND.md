# 🎯 Frontend Implementation: User Management & Password Change

**Date:** October 9, 2025  
**Status:** Backend Ready ✅ | Frontend To-Do 📋  
**Implementation Time:** 3-4 hours

---

## 📊 Overview

Implement two new features:
1. **Admin Panel: Create New Users** - Allow admins to create regular user accounts
2. **User Settings: Change Password** - Allow users to change their own password

**Backend Status:** ✅ All APIs ready and tested  
**API Base:** `https://api.calorie-tracker.piogino.ch/api`

---

## 🎯 FEATURE 1: Admin - Create New Users

### Goal
Add a "Create User" form/modal in the admin panel to create new regular user accounts.

### Location
Admin panel page (wherever you display the user list)

### What to Build

A form or modal with these fields:
- Username (required, min 3 characters)
- Password (required, min 6 characters)
- Confirm Password (required, must match)
- Email (optional, valid email format)
- Daily Calorie Goal (optional, default 2200, range 1000-5000)

### API Endpoint

**Create User:**
```javascript
POST /api/admin/users
Headers: { 
  Authorization: 'Bearer <admin_token>',
  Content-Type: 'application/json'
}

Request Body:
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",        // Optional
  "dailyCalorieGoal": 2200            // Optional, default 2200
}

Response (Success):
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 5,
    "username": "newuser",
    "email": "user@example.com",
    "dailyCalorieGoal": 2200,
    "role": "user"
  }
}

Response (Error - Username exists):
{
  "success": false,
  "error": "Username already exists"
}

Response (Error - Validation):
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

### Implementation Code

```jsx
import { useState } from 'react';

function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    dailyCalorieGoal: 2200
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.dailyCalorieGoal < 1000 || formData.dailyCalorieGoal > 5000) {
      newErrors.dailyCalorieGoal = 'Must be between 1000 and 5000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.calorie-tracker.piogino.ch/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          dailyCalorieGoal: formData.dailyCalorieGoal
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ User created successfully!\n\nUsername: ${data.user.username}\nID: ${data.user.id}`);
        
        // Reset form
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          dailyCalorieGoal: 2200
        });
        setErrors({});
        
        // Callback to refresh user list
        if (onUserCreated) onUserCreated(data.user);
        
        // Close modal
        onClose();
      } else {
        alert(`❌ Failed to create user: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Create user error:', error);
      alert('❌ Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dailyCalorieGoal' ? parseInt(value) || 2200 : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Create New User</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-user-form">
          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">
              Username <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username (min 3 characters)"
              className={errors.username ? 'error' : ''}
              required
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 6 characters)"
              className={errors.password ? 'error' : ''}
              required
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className={errors.confirmPassword ? 'error' : ''}
              required
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email (Optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {/* Daily Calorie Goal */}
          <div className="form-group">
            <label htmlFor="dailyCalorieGoal">Daily Calorie Goal</label>
            <input
              type="number"
              id="dailyCalorieGoal"
              name="dailyCalorieGoal"
              value={formData.dailyCalorieGoal}
              onChange={handleChange}
              min="1000"
              max="5000"
              step="50"
              className={errors.dailyCalorieGoal ? 'error' : ''}
            />
            {errors.dailyCalorieGoal && <span className="error-text">{errors.dailyCalorieGoal}</span>}
            <small className="help-text">Range: 1000-5000 calories</small>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
```

### CSS Styling

```css
.create-user-modal {
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.create-user-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.required {
  color: #ef4444;
}

.form-group input {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input.error {
  border-color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.875rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-cancel:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-cancel:disabled,
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Integration

Add a "Create User" button in your admin panel:

```jsx
// In your admin users page
import CreateUserModal from './components/CreateUserModal';

function AdminUsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState([]);

  const handleUserCreated = (newUser) => {
    // Refresh the user list
    fetchUsers();
  };

  const fetchUsers = async () => {
    // Your existing fetch users logic
  };

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <button 
          className="btn-create-user"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Create New User
        </button>
      </div>

      {/* User list table */}
      <div className="users-table">
        {/* Your existing user list */}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
}
```

---

## 🎯 FEATURE 2: User Settings - Change Password

### Goal
Allow users to change their own password from their account settings or profile page.

### Location
User settings page or profile page

### What to Build

A password change form with:
- Current Password (required)
- New Password (required, min 6 characters)
- Confirm New Password (required, must match)
- Show/Hide password toggles (optional but recommended)

### API Endpoint

**Change Password:**
```javascript
PUT /api/user/change-password
Headers: { 
  Authorization: 'Bearer <user_token>',
  Content-Type: 'application/json'
}

Request Body:
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456",
  "confirmPassword": "newpass456"
}

Response (Success):
{
  "success": true,
  "message": "Password changed successfully"
}

Response (Error - Wrong current password):
{
  "success": false,
  "error": "Current password is incorrect"
}

Response (Error - Passwords don't match):
{
  "success": false,
  "error": "New password and confirmation do not match"
}

Response (Error - Same password):
{
  "success": false,
  "error": "New password must be different from current password"
}
```

### Implementation Code

```jsx
import { useState } from 'react';

function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword || formData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.calorie-tracker.piogino.ch/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('✅ Password changed successfully!');
        
        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setErrors({});
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        alert(`❌ ${data.error || 'Failed to change password'}`);
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('❌ Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="change-password-section">
      <div className="section-header">
        <h2>🔒 Change Password</h2>
        <p className="section-description">
          Update your password to keep your account secure
        </p>
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="change-password-form">
        {/* Current Password */}
        <div className="form-group">
          <label htmlFor="currentPassword">
            Current Password <span className="required">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter current password"
              className={errors.currentPassword ? 'error' : ''}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => togglePasswordVisibility('current')}
            >
              {showPasswords.current ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.currentPassword && (
            <span className="error-text">{errors.currentPassword}</span>
          )}
        </div>

        {/* New Password */}
        <div className="form-group">
          <label htmlFor="newPassword">
            New Password <span className="required">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password (min 6 characters)"
              className={errors.newPassword ? 'error' : ''}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => togglePasswordVisibility('new')}
            >
              {showPasswords.new ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.newPassword && (
            <span className="error-text">{errors.newPassword}</span>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword">
            Confirm New Password <span className="required">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              className={errors.confirmPassword ? 'error' : ''}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => togglePasswordVisibility('confirm')}
            >
              {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword}</span>
          )}
        </div>

        {/* Password Requirements */}
        <div className="password-requirements">
          <p className="requirements-title">Password Requirements:</p>
          <ul>
            <li className={formData.newPassword.length >= 6 ? 'met' : ''}>
              At least 6 characters
            </li>
            <li className={formData.newPassword && formData.currentPassword !== formData.newPassword ? 'met' : ''}>
              Different from current password
            </li>
            <li className={formData.newPassword && formData.newPassword === formData.confirmPassword ? 'met' : ''}>
              Passwords match
            </li>
          </ul>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn-change-password" disabled={loading}>
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

export default ChangePasswordForm;
```

### CSS Styling

```css
.change-password-section {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.75rem;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.section-description {
  color: #6b7280;
  font-size: 0.95rem;
}

.success-message {
  padding: 1rem;
  background: #d1fae5;
  border: 2px solid #10b981;
  border-radius: 8px;
  color: #065f46;
  font-weight: 600;
  margin-bottom: 1.5rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.change-password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
}

.password-input-wrapper input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-input-wrapper input.error {
  border-color: #ef4444;
}

.toggle-password {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.toggle-password:hover {
  opacity: 1;
}

.password-requirements {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.requirements-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.password-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.password-requirements li {
  padding: 0.25rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.password-requirements li::before {
  content: '○';
  font-size: 1rem;
}

.password-requirements li.met {
  color: #10b981;
  font-weight: 500;
}

.password-requirements li.met::before {
  content: '✓';
  color: #10b981;
  font-weight: 700;
}

.btn-change-password {
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.btn-change-password:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-change-password:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Integration

Add to user settings/profile page:

```jsx
// In your user settings page
import ChangePasswordForm from './components/ChangePasswordForm';

function UserSettingsPage() {
  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      {/* Other settings sections */}
      <section className="profile-section">
        {/* Profile info */}
      </section>

      {/* Password Change Section */}
      <ChangePasswordForm />

      {/* Other settings */}
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### Admin - Create User
- [ ] Form validates all required fields
- [ ] Username must be at least 3 characters
- [ ] Password must be at least 6 characters
- [ ] Passwords must match
- [ ] Email validation works (if provided)
- [ ] Calorie goal stays within 1000-5000 range
- [ ] Shows error if username already exists
- [ ] Successfully creates user with all fields
- [ ] Successfully creates user without optional fields
- [ ] User list refreshes after creation
- [ ] Modal closes after success
- [ ] Works on mobile devices

### User - Change Password
- [ ] Form validates all required fields
- [ ] Current password is required
- [ ] New password must be 6+ characters
- [ ] Passwords must match
- [ ] Shows error if current password is wrong
- [ ] Prevents using same password as new password
- [ ] Password visibility toggle works
- [ ] Requirements checklist updates in real-time
- [ ] Success message displays
- [ ] Form clears after success
- [ ] Success message auto-dismisses
- [ ] Works on mobile devices

---

## 📋 API Summary

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/api/admin/users` | Create new user | Admin only |
| PUT | `/api/user/change-password` | Change own password | Authenticated users |

**Both endpoints require:** `Authorization: Bearer <token>` header

---

## 🎨 Design Guidelines

**Colors:**
- Primary: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Success: `#10b981`
- Error: `#ef4444`
- Required marker: `#ef4444`

**Form Validation:**
- Show errors inline below each field
- Red border for invalid fields
- Green checkmarks for requirements met

**User Experience:**
- Clear, helpful error messages
- Real-time validation feedback
- Success confirmation messages
- Loading states during API calls
- Disable buttons during submission

---

## 💡 Security Best Practices

1. **Password Requirements:**
   - Minimum 6 characters (enforced by backend)
   - Must be different from current password
   - Passwords must match

2. **Error Messages:**
   - Don't reveal if username exists during failed login
   - Generic "incorrect password" messages
   - Log security events on backend

3. **Form Behavior:**
   - Clear sensitive data after submission
   - No password auto-fill for new password
   - Use secure password input fields

---

## 🚀 Implementation Order

### Day 1: Admin Create User (1.5-2 hours)
1. Create `CreateUserModal` component
2. Add form validation
3. Integrate API call
4. Add to admin panel with button
5. Test complete flow

### Day 2: User Change Password (1.5-2 hours)
1. Create `ChangePasswordForm` component
2. Add password visibility toggles
3. Add real-time requirement validation
4. Integrate API call
5. Add to settings page
6. Test complete flow

---

## ✅ Definition of Done

**Admin Create User:**
- [ ] Modal opens from admin panel
- [ ] All validation works correctly
- [ ] Can create user with all fields
- [ ] Can create user with minimal fields
- [ ] Proper error handling
- [ ] User list updates after creation
- [ ] Mobile responsive

**User Change Password:**
- [ ] Form displays in settings page
- [ ] All validation works correctly
- [ ] Password visibility toggle works
- [ ] Requirements checklist updates
- [ ] Can change password successfully
- [ ] Proper error handling
- [ ] Success message displays
- [ ] Mobile responsive

---

## 🆘 Need Help?

**Test Credentials:**
- Admin: Check your .env file for admin credentials
- User: Create with the new create user form!

**API Base URL:**
```
https://api.calorie-tracker.piogino.ch/api
```

**Testing APIs:**
```bash
# Create user (admin token required)
curl -X POST https://api.calorie-tracker.piogino.ch/api/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","email":"test@test.com"}'

# Change password (user token required)
curl -X PUT https://api.calorie-tracker.piogino.ch/api/user/change-password \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"old","newPassword":"new123","confirmPassword":"new123"}'
```

---

**Backend Status:** ✅ 100% Ready  
**Estimated Implementation Time:** 3-4 hours  
**Let's build great user management! 🚀**
