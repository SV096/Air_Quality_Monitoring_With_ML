// backend/models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: false, 
    index: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  favorites: { 
    type: [String], 
    default: [] 
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  }
});

// Add index for email
UserSchema.index({ email: 1 });

module.exports = mongoose.model('User', UserSchema);