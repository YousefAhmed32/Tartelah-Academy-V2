require('dotenv').config()
const http = require('http')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')
const rateLimit = require('express-rate-limit')
const connectDB = require('./src/config/database')
const routes = require('./src/routes/index')
const { errorHandler, notFound } = require('./src/middleware/errorHandler.middleware')
const { optionalAuth } = require('./src/middleware/auth.middleware')
const socketService = require('./src/services/socket.service')

const app = express()
const httpServer = http.createServer(app)
const PORT = process.env.PORT || 5000

// The single client origin — CLIENT_URL is the preferred name (matches
// DOMAIN/API_URL/CLIENT_URL used across deployment docs); FRONTEND_URL is
// kept as a fallback so any already-configured deployment keeps working
// unchanged. Drives CORS here, email links (auth.controller.js,
// email.service.js), and the Socket.io CORS origin (socket.service.js).
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173'

// No local uploads/ directory to create — every uploaded file goes straight
// into MongoDB GridFS (see src/config/gridfs.js), never local disk.

// Connect to MongoDB and start cron jobs after connection
connectDB().then(async () => {
  const { backfillSubscriptionConsumed } = require('./src/migrations/backfillSubscriptionConsumed')
  await backfillSubscriptionConsumed().catch(err => console.warn('[migration] backfillSubscriptionConsumed warning:', err.message))

  if (process.env.NODE_ENV !== 'test') {
    const { startSessionReminderJob } = require('./src/jobs/sessionReminder.job')
    const { startSubscriptionExpiryJob } = require('./src/jobs/subscriptionExpiry.job')
    const { startTeacherAttendanceSweepJob } = require('./src/jobs/teacherAttendanceSweep.job')
    startSessionReminderJob()
    startSubscriptionExpiryJob()
    startTeacherAttendanceSweepJob()
  }
})

// Initialize Socket.io
socketService.init(httpServer)

// Trust proxy (for production behind nginx/load balancer)
app.set('trust proxy', 1)

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// CORS
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting — role-aware: public visitors get a strict per-IP ceiling,
// while logged-in students/teachers/admins get a much higher per-user ceiling
// (sized for real academy usage: dashboards polling stats, session lists,
// notifications, etc.). All values are configurable via .env.
const RATE_LIMIT_WINDOW_MS = (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000
const RATE_LIMITS_BY_ROLE = {
  admin: parseInt(process.env.RATE_LIMIT_ADMIN) || 3000,
  teacher: parseInt(process.env.RATE_LIMIT_TEACHER) || 1000,
  student: parseInt(process.env.RATE_LIMIT_STUDENT) || 1000,
}
const RATE_LIMIT_PUBLIC = parseInt(process.env.RATE_LIMIT_PUBLIC) || 300

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: (req) => RATE_LIMITS_BY_ROLE[req.user?.role] || RATE_LIMIT_PUBLIC,
  // Logged-in users get their own bucket (by user id) so they aren't sharing
  // a ceiling with everyone else behind the same IP/NAT; anonymous visitors
  // are still keyed by IP.
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'طلبات كثيرة جداً، يرجى الانتظار' },
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_LOGIN) || 100,
  message: { success: false, message: 'محاولات دخول كثيرة، يرجى الانتظار 15 دقيقة' },
})

// Parse cookies
app.use(cookieParser())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Strip Mongo operator keys ($ne, $gt, etc.) from body/query/params so
// clients can't smuggle query operators into Mongoose filters built from
// user input (e.g. admin list-filtering endpoints).
app.use(mongoSanitize())

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// Apply rate limits — optionalAuth first so the limiter can read req.user.role
app.use('/api/v1/auth', authLimiter)
app.use('/api/v1', optionalAuth, limiter)

// API routes
app.use('/api/v1', routes)

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// 404 handler
app.use(notFound)

// Error handler
app.use(errorHandler)

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Tartelah Server running on port ${PORT} [${process.env.NODE_ENV}]`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   API:    http://localhost:${PORT}/api/v1`)
  console.log(`   Socket: ws://localhost:${PORT}\n`)
})

module.exports = app
