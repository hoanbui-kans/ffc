const express = require('express');
const { fetchData, authenticate } = require('./apiService');
const rateLimit = require('express-rate-limit');
const Redis = require("ioredis");
const { RedisStore } = require("rate-limit-redis"); // Đúng cú pháp import
const client = require('ssi-fcdata');

const app = express();

const port = 3020; 

const routes = [
  { path: '/Securities', api: 'GET_SECURITIES_LIST', defaultParams: { market: 'HOSE', pageIndex: 4, pageSize: 100 } },
  { path: '/SecuritiesDetails', api: 'GET_SECURITIES_DETAILs', defaultParams: { market: 'HOSE', symbol: '', pageIndex: 1, pageSize: 1000 } },
  { path: '/IndexComponents', api: 'GET_INDEX_COMPONENTS', defaultParams: { indexCode: '', pageIndex: 1, pageSize: 1000 } },
  { path: '/IndexList', api: 'GET_INDEX_LIST', defaultParams: { exchange: 'HOSE', pageIndex: 1, pageSize: 1000 } },
  { path: '/DailyOhlc', api: 'GET_DAILY_OHLC', defaultParams: { symbol: 'VN30F2112', fromDate: '06/12/2021', toDate: '16/12/2021', pageIndex: 1, pageSize: 1000, ascending: true } },
  { path: '/IntradayOhlc', api: 'GET_INTRADAY_OHLC', defaultParams: { symbol: 'VN30F1M', fromDate: '15/11/2025', toDate: '15/12/2025', pageIndex: 1, pageSize: 1000, ascending: false } },
  { path: '/DailyIndex', api: 'GET_DAILY_INDEX', defaultParams: { indexId: 'HNX30', fromDate: '11/03/2025', toDate: '11/03/2025', pageIndex: 1, pageSize: 1000, ascending: true } },
  { path: '/DailyStockPrice', api: 'GET_DAILY_STOCKPRICE', defaultParams: { symbol: 'VN30F1M', market: '', fromDate: '01/03/2025', toDate: '11/03/2025', pageIndex: 1, pageSize: 1000 } }
]; 

const redisClient = new Redis({
  host: "103.221.222.19",
  port: 6379,
  password: "XZ$d5OCQ162&Sthm", // Nếu Redis yêu cầu mật khẩu
  retryStrategy: (times) => Math.min(times * 50, 2000), // Tự động thử lại khi mất kết nối
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully!");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

redisClient.on("ready", () => {
  console.log("🚀 Redis is ready to use!");
});

redisClient.on("reconnecting", () => {
  console.warn("🔄 Redis is reconnecting...");
});

redisClient.on("end", () => {
  console.warn("⚠️ Redis connection closed.");
});

const limiter = rateLimit({
  store: new RedisStore({ 
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 1000,
  max: 1,
  message: 'Server chỉ xử lý 1 request mỗi giây. Vui lòng đợi!',
  keyGenerator: () => 'global'
}); 

const cacheMiddleware = async (req, res, next) => {
  const cacheKey = `cache:${req.url}`;

  try {
    // Kiểm tra xem dữ liệu đã có trong cache chưa
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Phục vụ từ cache");
      return res.json(JSON.parse(cachedData)); // Trả dữ liệu từ cache và bỏ qua các middleware sau
    }

    // Nếu chưa có cache, tiếp tục xử lý request và lưu response vào cache
    const originalSend = res.send;
    res.send = async function (body) {
      await redisClient.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(body)); // Cache 24 giờ
      originalSend.call(this, body);
    };

    next(); // Tiếp tục xử lý middleware tiếp theo (bao gồm rate limit)
  } catch (err) {
    console.error("Cache error:", err);
    next(); // Nếu Redis gặp lỗi, tiếp tục request như bình thường
  }
};

app.use(cacheMiddleware);
app.use(limiter);

// Tạo API endpoints động
routes.forEach(({ path, api, defaultParams }) => {
  app.get(path, (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    fetchData(client.api[api], { ...defaultParams, ...req.query }, res);
  });
});
 
authenticate();

app.listen(port, 'localhost', () => console.log(`Server is running on port ${port}`));