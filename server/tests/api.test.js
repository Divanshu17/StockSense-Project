const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
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
  await Product.deleteMany({});
  await Sale.deleteMany({});
  await Forecast.deleteMany({});
});

describe('API Tests', () => {
  describe('Products API', () => {
    test('GET /api/products should return all products', async () => {
      await Product.create({
        name: 'Test Product',
        sku: 'TP001',
        current_stock: 10,
        reorder_point: 5,
        unit_price: 5,
        stock: 10 // if your schema still uses this field
      });
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('Dashboard API', () => {
    test('GET /api/dashboard/alerts should return low stock alerts', async () => {
      // Create a product and a forecast to avoid validation errors
      const product = await Product.create({
        name: 'Low Stock Product',
        sku: 'LSP001',
        current_stock: 2,
        reorder_point: 5,
        unit_price: 10
      });
      await Forecast.create({
        product: product._id,
        forecast_period_days: 30,
        forecasted_sales: 20
      });
      const res = await request(app)
        .get('/api/dashboard/alerts')
        .expect(200);
      expect(res.body).toHaveProperty('alerts');
      expect(Array.isArray(res.body.alerts)).toBeTruthy();
    });
  });

  describe('Inventory API', () => {
    test('GET /api/inventory/summary should return inventory summary', async () => {
      // Create a product to ensure the endpoint has data
      await Product.create({
        name: 'Inventory Product',
        sku: 'IP001',
        current_stock: 20,
        reorder_point: 10,
        unit_price: 15
      });
      const res = await request(app)
        .get('/api/inventory/summary')
        .expect(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });
});
