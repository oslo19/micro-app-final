const mongoose = require('mongoose');
const { Schema } = mongoose;

const progressSchema = new Schema({
  totalScore: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  averageAttempts: { type: Number, default: 0 },
  patternStats: {
    numeric: { attempted: Number, correct: Number },
    symbolic: { attempted: Number, correct: Number },
    shape: { attempted: Number, correct: Number },
    logical: { attempted: Number, correct: Number }
  },
  lastPlayed: { type: Date, default: Date.now }
});

const userSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  username: String,
  displayName: String,
  provider: { type: String, enum: ['email', 'google'] },
  progress: { type: progressSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
module.exports = User; 