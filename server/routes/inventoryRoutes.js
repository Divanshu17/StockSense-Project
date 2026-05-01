const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Forecast = require('../models/Forecast');

router.get('/summary', async (req, res) => {
    try {
        const products = await Product.find();
        const summaries = [];

        for (const product of products) {
            const forecast = await Forecast.findOne({ product_id: product._id })
                .sort({ forecast_date: -1 })
                .limit(1);

            if (!forecast) continue;

            const total_30day_demand = forecast.daily_predictions
                .slice(0, 30)
                .reduce((sum, day) => sum + day.predicted_sales, 0);

            summaries.push({
                sku: product.sku,
                current_stock: product.current_stock,
                total_30day_demand,
                required_order_quantity: Math.max(0, total_30day_demand - product.current_stock)
            });
        }

        res.json(summaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
