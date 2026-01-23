const { Sequelize } = require("sequelize");
const logger = require("../src/utils/logger");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
    evict: 15000,
  },
});

/**
 * Connect to the database and sync models.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info("db_connected", { database: sequelize.config.database });

    await sequelize.sync({ alter: false });
    logger.info("db_synced");
  } catch (error) {
    logger.error("db_connection_failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
