const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const scoresRoutes = require('./routes/scores');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'scores-api',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/scores', scoresRoutes);
app.use((req, res) => {
  res.status(404).json({ error: `Route non trouvée : ${req.method} ${req.originalUrl}` });
});
app.use(errorHandler);

module.exports = app;
