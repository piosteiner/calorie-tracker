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
| Frontend | [`web/`](web/) — everything in it is published, nothing else | GitHub Pages (domain in `web/CNAME`) |
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
cd web && python3 -m http.server 8000
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

Update `web/config.js` to point to your backend API:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://api.calorie-tracker.piogino.ch/api',
    DEVELOPMENT_MODE: false // Set to true for offline testing
};
```

## Deployment

### Frontend (GitHub Pages)
Every push to `main` that changes `web/` is published by `.github/workflows/pages.yml`
(it runs `scripts/build-site.sh`, which copies `web/` and checks that every referenced file exists).

### Backend (Cloud Server)
See [`docs/deployment.md`](docs/deployment.md). After backend changes: `pm2 restart calorie-tracker-api`.

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
├── web/                    # The website (published to GitHub Pages as is)
│   ├── index.html          # The app; privacy.html, share.html are the other pages
│   ├── script.js           # Main app logic (CalorieTracker)
│   ├── app-ui.js, app.css  # Tabs, quick add, redesign styles
│   ├── styles.css          # Older base styles
│   ├── feedback.js         # Feedback button + admin feedback list
│   ├── config.js           # API address and settings
│   ├── sw.js               # Service worker
│   └── vendor/             # Chart.js
├── backend/                # API (runs on the VPS via pm2)
│   ├── server.js, database.js, ecosystem.config.js
│   ├── routes/, controllers/, services/, middleware/, jobs/
│   ├── migrations/         # SQL migrations
│   └── scripts/            # Manual test scripts for the API
├── docs/                   # API reference, database schema, deployment, rewards
└── scripts/                # build-site.sh, save.sh, git hooks (secret scanning)
```

---

**Happy tracking! 🥗**
