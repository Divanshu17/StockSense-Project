const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Forecast = require('../models/Forecast');

// Helper function to calculate days until stockout
const calculateDaysToStockout = (currentStock, predictions) => {
    let remainingStock = currentStock;
    
    for (let i = 0; i < predictions.length; i++) {
        remainingStock -= predictions[i].predicted_sales;
        if (remainingStock <= 0) {
            return i + 1; // Return the day number (1-based) when stock depletes
        }
    }
    return null; // Return null if no stockout within prediction period
};

// GET /api/dashboard/alerts
router.get('/alerts', async (req, res) => {
    try {
        const products = await Product.find({});
        const alertProducts = [];

        for (const product of products) {
            // Get latest forecast for the product
            const forecast = await Forecast.findOne({ product_id: product._id })
                .sort({ forecast_date: -1 })
                .limit(1);

            if (forecast && forecast.predictions.length > 0) {
                const daysToStockout = calculateDaysToStockout(
                    product.current_stock,
                    forecast.predictions.slice(0, 30) // Look at next 30 days
                );

                // Add to alerts if stockout is predicted within 7 days
                if (daysToStockout !== null && daysToStockout <= 7) {
                    alertProducts.push({
                        _id: product._id,
                        name: product.name,
                        sku: product.sku,
                        current_stock: product.current_stock,
                        daysToStockout,
                        reorder_point: product.reorder_point
                    });
                }
            }
        }

        res.json({
            count: alertProducts.length,
            alerts: alertProducts
        });

    } catch (error) {
        console.error('Dashboard alerts error:', error);
        res.status(500).json({
            message: 'Error fetching stock alerts',
            error: error.message
        });
    }
});

module.exports = router;
