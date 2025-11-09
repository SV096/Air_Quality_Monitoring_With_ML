require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const citiesRouter = require('./routes/cities');
const liveRouter = require('./routes/live');
const aqiRouter = require('./routes/aqi');
const authRouter = require('./routes/auth');
const favRouter = require('./routes/favorites');
const forecastRouter = require('./routes/forecast');

const app = express();

// Use CORS for frontend
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    };
    res.status(200).json(healthCheck);
});

// API routes
app.use('/api/cities', citiesRouter);
app.use('/api/live', liveRouter);
app.use('/api/aqi', aqiRouter);
app.use('/api/auth', authRouter);
app.use('/api/favorites', favRouter);
app.use('/api/forecast', forecastRouter);

const PORT = process.env.PORT || 4000;
const MONGOURI = process.env.MONGOURI || 'mongodb://localhost:27017/aqidb';

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Connect to MongoDB and start server
mongoose.connect(MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log("Shutting down server gracefully...");
            server.close(() => {
                console.log("Server closed");
                mongoose.connection.close(() => {
                    console.log("MongoDB connection closed");
                    process.exit(0);
                });
            });
        });
    })
    .catch(err => {
        console.error("MongoDB connection error:", err.message);
        // Start server even without DB for basic functionality
        const server = app.listen(PORT, () => {
            console.log(`Server running without DB on port ${PORT}`);
        });
        
        // Graceful shutdown for no-DB mode
        process.on('SIGINT', () => {
            console.log("Shutting down server gracefully...");
            server.close(() => {
                console.log("Server closed");
                process.exit(0);
            });
        });
    });