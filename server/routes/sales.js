// routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// GET all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('product_id', 'name sku unit_price') // Populate product details
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: sales
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sales' });
  }
});

// POST create new sale
router.post('/', async (req, res) => {
  try {
    const { product_id, quantity_sold } = req.body;

    // Validate required fields
    if (!product_id || !quantity_sold) {
      return res.status(400).json({
        success: false,
        error: 'Product ID and quantity are required'
      });
    }

    // Check if product exists
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check stock availability
    if (quantity_sold > product.current_stock) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${product.current_stock}`
      });
    }

    // Create sale
    const sale = new Sale({
      product_id,
      quantity_sold,
      date: new Date()
    });

    await sale.save();

    // Update product stock
    product.current_stock -= quantity_sold;
    await product.save();

    // Populate product details in response
    const savedSale = await Sale.findById(sale._id)
      .populate('product_id', 'name sku unit_price');

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: savedSale
    });

  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(500).json({ success: false, error: 'Failed to record sale' });
  }
});

// GET recent sales (last 10)
router.get('/recent', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('product_id', 'name sku')
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: sales
    });
  } catch (err) {
    console.error('Error fetching recent sales:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent sales' });
  }
});
// In routes/salesRoutes.js - update the GET /recent endpoint:
router.get('/recent', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('product_id', 'name sku unit_price current_stock') // Include unit_price
      .sort({ date: -1 })
      .limit(20); // Increased limit for more sales
    
    // Transform the data to include calculated total
    const transformedSales = sales.map(sale => ({
      _id: sale._id,
      product_name: sale.product_id?.name || 'Unknown Product',
      product_sku: sale.product_id?.sku || 'N/A',
      quantity_sold: sale.quantity_sold,
      unit_price: sale.product_id?.unit_price || 0,
      date: sale.date,
      total: sale.quantity_sold * (sale.product_id?.unit_price || 0)
    }));
    
    res.json({
      success: true,
      data: transformedSales
    });
  } catch (err) {
    console.error('Error fetching recent sales:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent sales' });
  }
});

// Also update the GET / endpoint:
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('product_id', 'name sku unit_price current_stock')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      data: sales
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sales' });
  }
});
// GET all sales with pagination and filtering
router.get('/all', async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, product } = req.query;
    
    // Build query
    let query = {};
    
    // Date filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Product filtering
    if (product) {
      // Find product by name or SKU
      const products = await Product.find({
        $or: [
          { name: { $regex: product, $options: 'i' } },
          { sku: { $regex: product, $options: 'i' } }
        ]
      }).select('_id');
      
      const productIds = products.map(p => p._id);
      query.product_id = { $in: productIds };
    }
    
    // Get total count for pagination
    const total = await Sale.countDocuments(query);
    
    // Get sales with pagination
    const sales = await Sale.find(query)
      .populate('product_id', 'name sku unit_price category')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Calculate summary stats
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => {
      return sum + (sale.quantity_sold * (sale.product_id?.unit_price || 0));
    }, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity_sold, 0);
    
    res.json({
      success: true,
      data: sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalSales,
        totalRevenue,
        totalQuantity,
        averageSaleValue: totalRevenue / totalSales || 0
      }
    });
  } catch (err) {
    console.error('Error fetching all sales:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch sales' });
  }
});

module.exports = router;