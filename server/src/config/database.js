const mongoose = require('mongoose')

const RETRY_DELAY_MS = 5000

async function connectDB() {
  while (true) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        dbName: 'tartelah',
      })
      console.log(`✅ MongoDB connected: ${conn.connection.host}`)
      return conn
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message} — retrying in ${RETRY_DELAY_MS / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
}

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB runtime error:', error.message)
})

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect...')
})

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received: closing MongoDB connection...`)
  await mongoose.connection.close()
  console.log('MongoDB connection closed. Exiting.')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

module.exports = connectDB
