require('dotenv').config();

module.exports = {  
	market: {
		HubUrl: "wss://fc-datahub.ssi.com.vn/",
		ApiUrl: "https://fc-data.ssi.com.vn/",
		ConsumerId: process.env.CONSUMER_ID,
		ConsumerSecret: process.env.CONSUMER_SECRET
	},
};
