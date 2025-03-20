const express = require('express');
const { fetchData, authenticate } = require('./apiService');
// const rateLimit = require('express-rate-limit');
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
  host: "localhost",
  port: 6379,
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

// const limiter = rateLimit({
//   store: new RedisStore({ 
//     sendCommand: (...args) => redisClient.call(...args),
//   }),
//   windowMs: 1000, 
//   max: 1,
//   message: 'Server chỉ xử lý 1 request mỗi giây. Vui lòng đợi!',
//   keyGenerator: () => 'global'
// }); 

const cacheMiddleware = async (req, res, next) => {
  const cacheKey = `cache:${req.url}`;
  console.log("cacheKey", cacheKey);
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Kiểm tra dữ liệu có trong cache không
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Nếu chưa có cache, tiếp tục request và lưu response vào cache
    const originalSend = res.send;
    res.send = function (body) {
      // Chuyển body về dạng string nếu chưa phải string
      const responseBody = typeof body === "string" ? body : JSON.stringify(body);

      // Kiểm tra nếu response là lỗi 429 thì không cache
      if (!responseBody.includes("API calls quota exceeded!")) {
        redisClient.set(cacheKey, responseBody, "EX", 24 * 60 * 60); // Cache 24 giờ
      }

      originalSend.call(this, body);
    };

    next();
  } catch (err) {
    console.error("Cache error:", err);
    next(); // Nếu Redis lỗi, tiếp tục request bình thường
  }
};

app.use(cacheMiddleware);
// app.use(limiter);

// Tạo API endpoints động
routes.forEach(({ path, api, defaultParams }) => {
  app.get(path, (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    fetchData(client.api[api], { ...defaultParams, ...req.query }, res);
  });
});
 
authenticate();

app.listen(port, 'localhost', () => console.log(`Server is running on port ${port}`));