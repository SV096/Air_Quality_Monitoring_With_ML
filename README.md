# Air Quality Monitoring Application

A full-stack web application for monitoring and forecasting air quality index (AQI) for cities worldwide.

## Features

- Real-time AQI data for major cities
- Historical AQI data and trends
- Machine learning-powered AQI forecasting
- User authentication and favorites
- Responsive design with dark/light mode

## Tech Stack

### Backend

- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication

### Frontend

- React with Vite
- Tailwind CSS for styling
- Chart.js for data visualization

### Machine Learning

- Python with FastAPI
- Scikit-learn for forecasting

## Project Structure

```
├── backend/
│   ├── jobs/
│   │   └── ingest.js          # Data ingestion script
│   ├── models/
│   │   ├── AqiReading.js      # AQI reading model
│   │   └── User.js            # User model
│   ├── routes/
│   │   ├── aqi.js             # Historical AQI data routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── cities.js          # City search routes
│   │   ├── favorites.js       # User favorites routes
│   │   ├── forecast.js        # AQI forecast routes
│   │   ├── live.js            # Real-time AQI routes
│   │   └── test.js            # Test routes
│   ├── utils/
│   │   ├── cityTester.js      # City testing utilities
│   │   └── cityValidator.js   # City validation utilities
│   ├── .env                   # Environment variables
│   ├── .env.example           # Example environment variables
│   ├── middleware_auth.js     # Authentication middleware
│   ├── package.json           # Backend dependencies
│   ├── server.js              # Main server file
│   └── worker.js              # Background data processing
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx     # Main layout component
│   │   ├── pages/
│   │   │   ├── ApiTest.jsx    # API testing page
│   │   │   ├── Auth.jsx       # Authentication page
│   │   │   ├── Compare.jsx    # City comparison page
│   │   │   ├── Dashboard.jsx  # Main dashboard page
│   │   │   ├── Favorites.jsx  # User favorites page
│   │   │   ├── Forecast.jsx   # AQI forecast page
│   │   │   ├── History.jsx    # Historical data page
│   │   │   ├── Live.jsx       # Real-time data page
│   │   │   └── MapView.jsx    # Map visualization page
│   │   ├── main.jsx           # App entry point
│   │   └── styles.css         # Global styles
│   ├── .env                   # Frontend environment variables
│   ├── index.html             # HTML template
│   ├── package.json           # Frontend dependencies
│   ├── postcss.config.js      # PostCSS configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── vite.config.mjs        # Vite configuration
└── ml/
    ├── requirements.txt       # Python dependencies
    └── service.py             # ML forecasting service
```

## Setup

1. **Prerequisites**: Node.js (v16+), Python (v3.8+), MongoDB

2. **Backend**:

   ```bash
   cd backend
   npm install
   # Create .env file with required variables
   npm start
   ```

3. **Frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **ML Service**:
   ```bash
   cd ml
   pip install -r requirements.txt
   python service.py
   ```
