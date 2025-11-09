const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AqiReadingSchema = new Schema({
  city: { 
    type: String, 
    required: true, 
    index: true,
    trim: true
  },
  aqi: { 
    type: Number, 
    required: true,
    min: 0,
    max: 500
  },
  pollutants: { 
    type: Object, 
    default: {} 
  },
  weather: { 
    type: Object, 
    default: {} 
  },
  recordedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Add indexes for better query performance
AqiReadingSchema.index({ city: 1, recordedAt: -1 });
AqiReadingSchema.index({ recordedAt: 1 });

module.exports = mongoose.model('AqiReading', AqiReadingSchema);