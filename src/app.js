const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./models');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Import routes
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Sync DB
db.Sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

module.exports = app;
