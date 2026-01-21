const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables FIRST
const result = dotenv.config();

// Debug: Check if .env loaded
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

console.log('📁 Environment variables loaded successfully');
console.log('✓ DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Only load db AFTER dotenv is configured
const { connectDB } = require('./config/db');

// Connect to PostgreSQL
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Training Tracker API is running with PostgreSQL!',
    database: 'Supabase',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});