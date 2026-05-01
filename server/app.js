const express = require('express');
const app = express();

const salesRouter = require('./routes/sales');
app.use('/api/sales', salesRouter);

module.exports = app;