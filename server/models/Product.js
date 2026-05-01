const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: false
  },
  current_stock: {
    type: Number,
    required: true
  },
  unit_price: {
    type: Number,
    required: true
  },
  reorder_point: {
    type: Number,
    required: true
  },
  last_updated_stock: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
