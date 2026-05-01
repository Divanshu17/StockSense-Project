const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Forecast = require('../models/Forecast');

// GET all products
router.get('/', async (req, res, next) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
});

// POST create new product
router.post('/', async (req, res, next) => {
  try {
    const { name, sku, category, current_stock, unit_price, reorder_point } = req.body;

    console.log('Received product data:', req.body); // Debug log

    // Validate required fields
    if (!name || !sku || current_stock === undefined || !unit_price || reorder_point === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, sku, current_stock, unit_price, reorder_point'
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Create new product
    const product = new Product({
      name,
      sku,
      category: category || '',
      current_stock: parseInt(current_stock),
      unit_price: parseFloat(unit_price),
      reorder_point: parseInt(reorder_point)
    });

    const savedProduct = await product.save();
    console.log('Product saved successfully:', savedProduct); // Debug log

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Product routes are working correctly' });
});

// GET sales for specific product
router.get('/:id/sales', async (req, res) => {
    try {
        const sales = await Sale.find({ product_id: req.params.id });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET latest forecast for specific product
router.get('/:id/forecast', async (req, res) => {
    try {
        const forecast = await Forecast.findOne({ product_id: req.params.id })
            .sort({ forecast_date: -1 })
            .limit(1);
        if (!forecast) {
            return res.status(404).json({ message: 'No forecast found' });
        }
        res.json(forecast);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;