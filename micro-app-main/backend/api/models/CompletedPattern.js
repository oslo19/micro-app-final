const mongoose = require('mongoose');
const { Schema } = mongoose;

const completedPatternSchema = new Schema({
  userId: { type: String, required: true },
  sequence: { type: String, required: true },
  answer: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['numeric', 'symbolic', 'shape', 'logical'],
    required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  completedAt: { type: Date, default: Date.now }
});

const CompletedPattern = mongoose.model('CompletedPattern', completedPatternSchema);
module.exports = CompletedPattern; 