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
🔌 **Backend API**: [https://api.calorie-tracker.piogino.ch](https://api.calorie-tracker.piogino.ch)

**Demo Credentials**:
- Username: `demo`
- Password: `demo123`

## Repository layout

| Part | Where | Hosting |
|---|---|---|
| Frontend | repo root (`index.html`, `script.js`, `styles.css`, ...) | GitHub Pages → https://calorie-tracker.piogino.ch |
| Backend API | [`backend/`](backend/) | VPS, `/var/www/calorie-tracker/backend` → https://api.calorie-tracker.piogino.ch |

## Working on the backend (on the VPS)

The server checkout at `/var/www/calorie-tracker` **is** this repository; the `calorie-tracker-api` pm2
process runs straight out of `backend/` (`cwd: /var/www/calorie-tracker/backend`).

- `scripts/save.sh "message"` — commit, rebase on GitHub, push (the backup).
- **Secrets never go in this repo** (it is public). On the server they live in
  `~/.config/calorie-tracker/backend.env`, outside the checkout. Pre-commit and pre-push hooks block
  secret files, credential-looking lines, and any real value from that file.
- After cloning elsewhere, enable the hooks: `git config core.hooksPath scripts/githooks`.

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
mkdir -p ~/.config/calorie-tracker
cp .env.example ~/.config/calorie-tracker/backend.env
# Edit ~/.config/calorie-tracker/backend.env with your database credentials
npm start
```

## Configuration

Update `config.js` to point to your backend API:

```javascript
```javascript
const CONFIG = {
    API_BASE_URL: 'https://api.calorie-tracker.piogino.ch/api',
    DEVELOPMENT_MODE: false // Set to true for offline testing
};

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
calorie-tracker/
├── index.html              # Main HTML file
├── styles.css              # CSS styling
├── script.js               # Frontend JavaScript
├── config.js               # Configuration settings
├── CNAME                   # GitHub Pages domain
├── README.md               # This file
├── docs/                   # Frontend documentation
├── scripts/                # save.sh + git hooks (secret scanning)
└── backend/                # Backend API (runs on the VPS via pm2)
    ├── server.js           # Main server file
    ├── database.js         # Database connection
    ├── ecosystem.config.js # pm2 process definition
    ├── .env.example        # Template; real values live outside the repo
    ├── package.json        # Dependencies
    ├── docs/                # Backend documentation
    └── routes/             # API endpoints
        ├── auth.js         # Authentication
        ├── foods.js        # Food database
        ├── logs.js         # Food logging
        └── user.js         # User management
```

---

**Happy tracking! 🥗**
