const jwt = require('jsonwebtoken');
require('dotenv').config({
  path: process.env.ENV_FILE || require('path').join(require('os').homedir(), '.config/calorie-tracker/backend.env'),
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET not set (check ~/.config/calorie-tracker/backend.env)');
  process.exit(1);
}
const sessionId = '199465eee618040e3eaf209622b0f7f79304516c04d2a62516c03fe3a6b2ee19';

const token = jwt.sign({ sessionId }, JWT_SECRET, { expiresIn: '1h' });
console.log('JWT Token:', token);