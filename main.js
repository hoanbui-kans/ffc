const express = require('express');
const { fetchData, authenticate } = require('./apiService');
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

// Tạo API endpoints động
routes.forEach(({ path, api, defaultParams }) => {
  app.get(path, (req, res) => {
    fetchData(client.api[api], { ...defaultParams, ...req.query }, res);
  });
});

authenticate();

app.listen(port, 'localhost', () => console.log(`Server is running on port ${port}`));