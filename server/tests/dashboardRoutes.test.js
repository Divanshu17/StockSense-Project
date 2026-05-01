const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app'); // Ensure your app is properly exported
const Product = require('../models/Product');
const Forecast = require('../models/Forecast');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear all collections
    await Product.deleteMany({});
    await Forecast.deleteMany({});
    
    // Setup test data
    const product = await Product.create({
        name: 'Test Product',
        sku: 'TST-001',
        current_stock: 10,
        reorder_point: 5,
        unit_price: 10
    });

    await Forecast.create({
        product_id: product._id,
        forecast_date: new Date(),
        predictions: Array(30).fill().map((_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            predicted_sales: 2 // 2 units per day means stockout in 5 days
        }))
    });
});

describe('Dashboard Routes Tests', () => {
    describe('GET /api/dashboard/alerts', () => {
        test('should return alerts for products near stockout', async () => {
            const response = await request(app)
                .get('/api/dashboard/alerts')
                .expect(200);

            expect(response.body).toHaveProperty('count');
            expect(response.body).toHaveProperty('alerts');
            expect(response.body.alerts.length).toBe(1);
            expect(response.body.alerts[0]).toHaveProperty('daysToStockout');
            expect(response.body.alerts[0].daysToStockout).toBeLessThanOrEqual(7);
        });

        test('should not include products with sufficient stock', async () => {
            // Create a product with high stock
            const wellStockedProduct = await Product.create({
                name: 'Well Stocked Product',
                sku: 'TST-002',
                current_stock: 100,
                reorder_point: 20
            });

            await Forecast.create({
                product_id: wellStockedProduct._id,
                forecast_date: new Date(),
                predictions: Array(30).fill().map((_, i) => ({
                    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
                    predicted_sales: 1
                }))
            });

            const response = await request(app)
                .get('/api/dashboard/alerts')
                .expect(200);

            const wellStockedAlert = response.body.alerts.find(
                alert => alert.sku === 'TST-002'
            );
            expect(wellStockedAlert).toBeUndefined();
        });

        test('should handle products with no forecasts', async () => {
            await Product.create({
                name: 'No Forecast Product',
                sku: 'TST-003',
                current_stock: 5,
                reorder_point: 10
            });

            const response = await request(app)
                .get('/api/dashboard/alerts')
                .expect(200);

            const noForecastProduct = response.body.alerts.find(
                alert => alert.sku === 'TST-003'
            );
            expect(noForecastProduct).toBeUndefined();
        });
    });
});
