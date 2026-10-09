const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.set('trust proxy', 1); // Render/Railway sit behind one proxy; needed for real client IPs
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use('/api', globalLimiter, routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
