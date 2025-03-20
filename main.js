const express = require('express');
const { apiClient, authenticate } = require('./apiService');
const Redis = require("ioredis");
const client = require('ssi-fcdata');
const PQueue = require("p-queue").default;

require('dotenv').config();

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

const config = process.env.REDIS_CONNECT_TYPE == "socket" ? {
  path: "/home/zroudqkr/redis/redis.sock",
} : {
  host: "localhost",
  port: 6379,
}

/* Redis */
const redisClient = new Redis(config);

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

/* PQueue */
const queue = new PQueue({ interval: 1000, intervalCap: 1 });

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
    next(); 
  }
};

app.use(cacheMiddleware);
// app.use(limiter);

async function fetchData (path, queryParams, res, cacheKey) {
  try {
    const response = await apiClient.get(path, { params: queryParams });
    const { data } = response;
    if(data && data.status == "Success"){
      console.log('data', JSON.stringify(data))
      redisClient.setex(cacheKey, 24 * 60 * 60, JSON.stringify(data)); // Cache 1 giây
      return res.json(data);
    } else {
      queue.add(async() => {
        await fetchData(path, queryParams, res, cacheKey);
      })
    }
  } catch (error) {
    console.error("❌ API Error:", error.message);
    return res.status(500).json({ message: "Lỗi server khi gọi API." });
  }
}

// Tạo API endpoints động
routes.forEach(({ path, api, defaultParams }) => {
  app.get(path, async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const cacheKey = `cache:${path}:${JSON.stringify(req.query)}`;
    const queryParams = { ...defaultParams, ...req.query };
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        const parserCache = JSON.parse(cachedData);
        if(parserCache.data) {
          console.log("🚀 Phục vụ từ cache (1s)");
          return res.json();
        }
      }
      queue.add(async() => {
        await fetchData(client.api[api], queryParams, res, cacheKey, 0);
      })
    } catch (err) {
      console.error("Redis error:", err);
      await fetchData(client.api[api], queryParams, res, cacheKey, 0);
    }
  });
});
 
authenticate();

app.listen(port, 'localhost', () => console.log(`Server is running on port ${port}`));