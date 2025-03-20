const axios = require('axios');
const client = require('ssi-fcdata');
const config = require('./config.js');
const { pusher } = require('./apiPusherService.js');

const apiClient = axios.create({
  baseURL: config.market.ApiUrl,
  timeout: 5000,
});

// Hàm xác thực và khởi tạo WebSocket
async function authenticate() {
  try {
    const response = await apiClient.post(client.api.GET_ACCESS_TOKEN, {
      consumerID: config.market.ConsumerId,
      consumerSecret: config.market.ConsumerSecret,
    });

    if (response.data.status === 200) {
      const token = "Bearer " + response.data.data.accessToken;
      // Gán token cho mọi request sau này
      apiClient.interceptors.request.use((config) => {
        config.headers.Authorization = token;
        return config;
      });

      // // Khởi tạo WebSocket
      // client.initStream({ url: config.market.HubUrl, token });

      // client.bind(client.events.onConnected, () => client.switchChannel("X:ALL"));

      // client.bind(client.events.onData, async (data) => { 
      //   await pusher.trigger(["channel"], "SSIEvent", data)
      // });
        
      // client.start();

    } else {
      console.error("Authentication Failed:", response.data.message);
    }
  } catch (error) {
    console.error("Auth Error:", error.message);
  }
}

// Hàm gửi request chung
// async function fetchData(apiEndpoint, queryParams, res) {
//   try {
//     const response = await apiClient.get(apiEndpoint, { params: queryParams });
//     res.json(response.data);
//   } catch (error) {
//     console.error("API Error:", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// }

module.exports = { apiClient, authenticate };