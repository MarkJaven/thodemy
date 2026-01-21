const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected via Supabase!');
    console.log(`📊 Database: ${sequelize.config.database}`);
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('📋 Database tables synced!');
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };