# 🍎 Calorie Tracker Web Application

A modern, responsive web application for tracking daily calorie intake with user authentication and cloud synchronization.

## Features

- **User Authentication**: Login with predetermined users
- **Food Logging**: Search and log food items with quantities
- **Calorie Calculation**: Automatic calorie calculation based on food database
- **Daily Tracking**: Monitor daily calorie intake vs. goals
- **Offline Support**: Works offline with local storage and syncs when online
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Instant feedback and progress tracking

## Live Demo

🌐 **Frontend**: [https://calorie-tracker.piogino.ch](https://calorie-tracker.piogino.ch)

**Demo Credentials**:
- Username: `demo`
- Password: `demo123`

## Architecture

### Frontend (GitHub Pages)
- **HTML5** with semantic structure
- **CSS3** with modern styling and responsive design
- **Vanilla JavaScript** (ES6+) with class-based architecture
- **Local Storage** for offline functionality

### Backend (Cloud Server)
- **Node.js** with Express.js framework
- **MySQL** database with optimized schema
- **JWT** authentication with session management
- **RESTful API** with comprehensive endpoints
- **Rate limiting** and security middleware

## Quick Start

### For Users
1. Visit [https://calorie-tracker.piogino.ch](https://calorie-tracker.piogino.ch)
2. Login with `demo` / `demo123`
3. Start logging your food intake!

### For Developers

#### Frontend Testing
```bash
# Use local server
python -m http.server 8000
# Visit http://localhost:8000
```

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start
```

## Configuration

Update `config.js` to point to your backend API:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-api-domain.com/api',
    DEVELOPMENT_MODE: false // Set to true for offline testing
};
```

## Deployment

### Frontend (GitHub Pages)
Already configured with custom domain: `calorie-tracker.piogino.ch`

### Backend (Cloud Server)
See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Technologies Used

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Local Storage API
- Fetch API for HTTP requests
- CSS Grid and Flexbox for layout

### Backend
- Node.js & Express.js
- MySQL with mysql2 driver
- JWT for authentication
- bcryptjs for password hashing
- Security middleware (Helmet, CORS, Rate limiting)

## File Structure

```
calories-tracker/
├── index.html              # Main HTML file
├── styles.css              # CSS styling  
├── script.js               # Frontend JavaScript
├── config.js               # Configuration settings
├── CNAME                   # GitHub Pages domain
├── README.md               # This file
├── DATABASE_SCHEMA.md      # Database design
├── DEPLOYMENT_GUIDE.md     # Deployment instructions
└── backend/                # Backend API (deploy to cloud server)
    ├── server.js           # Main server file
    ├── database.js         # Database connection
    ├── package.json        # Dependencies
    └── routes/             # API endpoints
        ├── auth.js         # Authentication
        ├── foods.js        # Food database
        ├── logs.js         # Food logging
        └── user.js         # User management
```

---

**Happy tracking! 🥗**
