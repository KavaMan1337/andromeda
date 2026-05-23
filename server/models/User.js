import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  since: {
    type: Date,
    default: Date.now,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  orders: [{
    id: Number,
    name: String,
    tier: String,
    date: String,
    price: String,
    licenseKey: String,
  }],
  isNew: {
    type: Boolean,
    default: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  usedPromos: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  suppressReservedKeysWarning: true,
});

export default mongoose.model('User', UserSchema);