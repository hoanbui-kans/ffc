require('dotenv').config();

const Pusher = require("pusher")

const pusher = new Pusher({
  appId: process.env.PUSHER_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  useTLS: false, 
  cluster: process.env.PUSHER_CLUSTER,
})

module.exports = { pusher };