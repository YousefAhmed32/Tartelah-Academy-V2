require('dotenv').config()
const http = require('http')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const fs = require('fs')
const path = require('path')
const connectDB = require('./src/config/database')
const routes = require('./src/routes/index')
const { errorHandler, notFound } = require('./src/middleware/errorHandler.middleware')
const socketService = require('./src/services/socket.service')

const app = express()
const httpServer = http.createServer(app)
const PORT = process.env.PORT || 5000

// Ensure upload directories exist
;['uploads/avatars', 'uploads/payment-proofs', 'uploads/homework', 'uploads/articles', 'uploads/courses'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// Connect to MongoDB and start cron jobs after connection
connectDB().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    const { startSessionReminderJob } = require('./src/jobs/sessionReminder.job')
    const { startSubscriptionExpiryJob } = require('./src/jobs/subscriptionExpiry.job')
    startSessionReminderJob()
    startSubscriptionExpiryJob()
  }
  if (process.env.NODE_ENV !== 'production') {
    const { ensureDevAccounts } = require('./src/seed/devSeed')
    ensureDevAccounts().catch(err => console.warn('[DEV] devSeed warning:', err.message))
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
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'طلبات كثيرة جداً، يرجى الانتظار' },
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 500 : 20,
  message: { success: false, message: 'محاولات دخول كثيرة، يرجى الانتظار 15 دقيقة' },
})

// Parse cookies
app.use(cookieParser())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Apply rate limits
app.use('/api/v1/auth', authLimiter)
app.use('/api/v1', limiter)

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
