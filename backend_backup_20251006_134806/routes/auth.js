const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const db = require('../database');
const router = express.Router();

// Login endpoint
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Create session
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.createSession(sessionId, user.id, expiresAt);

        // Create JWT token
        const token = jwt.sign(
            { 
                sessionId,
                userId: user.id,
                username: user.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                dailyCalorieGoal: user.daily_calorie_goal
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed'
        });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            await db.deleteSession(decoded.sessionId);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.json({
            success: true,
            message: 'Logged out'
        });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const session = await db.getSession(decoded.sessionId);

        if (!session) {
            return res.status(401).json({
                error: 'Invalid session'
            });
        }

        res.json({
            valid: true,
            user: {
                id: session.user_id,
                username: session.username,
                dailyCalorieGoal: session.daily_calorie_goal
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            error: 'Invalid token'
        });
    }
});

// Register endpoint (optional - for future use)
router.post('/register', [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('email').optional().isEmail().withMessage('Invalid email format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, password, email, dailyCalorieGoal = 2000 } = req.body;

        // Check if user exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({
                error: 'Username already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        await db.createUser(username, passwordHash, email, dailyCalorieGoal);

        res.status(201).json({
            success: true,
            message: 'User created successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed'
        });
    }
});

module.exports = router;