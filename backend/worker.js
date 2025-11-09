require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');
const ingestOnce = require('./jobs/ingest');
const MONGOURI = process.env.MONGOURI || 'mongodb://localhost:27017/aqidb';

// Expanded list of major cities for data ingestion
const CITIES = (process.env.INGESTCITIES || 
  "Delhi,Mumbai,Bangalore,Chennai,Kolkata,Hyderabad,Pune,Ahmedabad,Jaipur,Lucknow," +
  "Patna,Noida,Gurgaon,Bhopal,Indore,Thane,Surat,Vadodara,Kanpur,Nagpur," +
  "New York,London,Tokyo,Paris,Sydney,Dubai,Moscow,Beijing,Singapore,Berlin," +
  "Los Angeles,Chicago,Houston,Phoenix,Philadelphia,San Antonio,San Diego,Dallas,San Jose,Madrid")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

console.log('Worker starting with cities:', CITIES);

async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected successfully');
        
        // Run immediately on start
        console.log('Running initial ingestion...');
        await ingestOnce(CITIES);
        console.log('Initial ingestion completed');

        // Schedule hourly at minute 5 to avoid top-of-hour spikes
        cron.schedule('5 * * * *', async () => {
            try {
                console.log('Starting scheduled hourly ingestion...');
                await ingestOnce(CITIES);
                console.log('Scheduled ingestion completed');
            } catch (e) {
                console.error('Scheduled ingest error', e);
            }
        });
        
        console.log('Worker initialized and running. Next run scheduled for 5 minutes past the hour.');
    } catch (err) {
        console.error('Worker initialization error:', err);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log("Shutting down worker gracefully...");
    try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
});

main().catch(err => {
    console.error('Worker fatal error:', err);
    process.exit(1);
});