const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  predicted_sales: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const forecastSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  forecast_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  forecast_period_days: {
    type: Number,
    required: true
  },
  predictions: [predictionSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Forecast', forecastSchema);
