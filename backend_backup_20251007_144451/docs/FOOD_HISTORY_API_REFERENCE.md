# Food Log History API Endpoints - Quick Reference

## Overview
Three new endpoints have been added to support viewing historical food logs.

---

## 1. GET /api/logs/history

**Purpose:** Get a paginated list of all days with food logs

**Auth:** Required (Bearer token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 30 | Number of days to return (1-100) |
| offset | integer | No | 0 | Number of days to skip |

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "log_date": "2025-10-07T00:00:00.000Z",
      "meals_count": 2,
      "total_calories": "4.00",
      "first_log_time": "2025-10-07T00:56:21.000Z",
      "last_log_time": "2025-10-07T00:56:34.000Z"
    }
  ],
  "pagination": {
    "limit": 30,
    "offset": 0,
    "totalDays": 3,
    "hasMore": false
  }
}
```

**Example Usage:**
```bash
curl -X GET "https://api.example.com/api/logs/history?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. GET /api/logs/dates

**Purpose:** Get all dates with logs within a date range (for calendar views)

**Auth:** Required (Bearer token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| startDate | string (YYYY-MM-DD) | No | 90 days ago | Start of date range |
| endDate | string (YYYY-MM-DD) | No | Today | End of date range |

**Response:**
```json
{
  "success": true,
  "dates": [
    {
      "log_date": "2025-10-07T00:00:00.000Z",
      "meals_count": 2,
      "total_calories": "4.00"
    }
  ],
  "period": {
    "startDate": "2025-07-09",
    "endDate": "2025-10-07"
  }
}
```

**Example Usage:**
```bash
curl -X GET "https://api.example.com/api/logs/dates?startDate=2025-09-01&endDate=2025-10-07" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. GET /api/logs

**Purpose:** Get detailed food log entries for a specific date

**Auth:** Required (Bearer token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| date | string (YYYY-MM-DD) | No | Today | Date to retrieve logs for |

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 4,
      "food_name": "apple",
      "quantity": "2.00",
      "unit": "pieces",
      "calories": "190.00",
      "created_at": "2025-09-20T16:43:15.000Z",
      "updated_at": "2025-09-20T16:43:15.000Z",
      "log_date": "2025-09-20T00:00:00.000Z"
    }
  ],
  "totalCalories": 190,
  "date": "2025-09-20"
}
```

**Example Usage:**
```bash
curl -X GET "https://api.example.com/api/logs?date=2025-09-20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Implementation Flow

### Flow 1: List View
1. Call `/api/logs/history` to get list of days
2. Display each day with summary info
3. When user clicks a day, call `/api/logs?date=YYYY-MM-DD` for details
4. Use pagination for "Load More" functionality

### Flow 2: Calendar View
1. Call `/api/logs/dates` with appropriate date range (e.g., current month)
2. Render calendar and highlight dates that have logs
3. When user clicks a date, call `/api/logs?date=YYYY-MM-DD` for details

---

## Error Handling

All endpoints return error responses in this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Validation error (invalid date format, invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `500` - Server error

---

## Authentication

All endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get the token from the login response and store it in localStorage or sessionStorage:

```javascript
const token = localStorage.getItem('authToken');
```

---

## Date Format

All dates must be in ISO 8601 format:
- Query parameters: `YYYY-MM-DD` (e.g., `2025-10-07`)
- Response dates: ISO 8601 with timezone (e.g., `2025-10-07T00:00:00.000Z`)

Convert response dates to local format:
```javascript
const date = new Date('2025-10-07T00:00:00.000Z');
const formattedDate = date.toLocaleDateString(); // "10/7/2025" (US locale)
```

---

## Performance Considerations

1. **Pagination:** Use reasonable limit values (10-30) to avoid large payloads
2. **Caching:** Consider caching history data to reduce API calls
3. **Date Range:** For calendar views, limit to 1-3 months at a time
4. **Lazy Loading:** Implement infinite scroll for better UX

---

## Testing Endpoints

### Test with cURL:

```bash
# 1. Login first
TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}' \
  | jq -r '.token')

# 2. Get history
curl -X GET "http://localhost:3000/api/logs/history?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get dates for calendar
curl -X GET "http://localhost:3000/api/logs/dates" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get specific day details
curl -X GET "http://localhost:3000/api/logs?date=2025-09-20" \
  -H "Authorization: Bearer $TOKEN"
```

### Test with JavaScript (Browser Console):

```javascript
// Get token from localStorage
const token = localStorage.getItem('authToken');

// Test history endpoint
fetch('/api/logs/history?limit=10', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);

// Test dates endpoint
fetch('/api/logs/dates', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);

// Test specific date
fetch('/api/logs?date=2025-09-20', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```
