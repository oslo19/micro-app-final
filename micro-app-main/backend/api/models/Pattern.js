const mongoose = require('mongoose');
const { Schema } = mongoose;

const patternSchema = new Schema({
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
  hint: { type: String, required: true },
  explanation: String,
  createdAt: { type: Date, default: Date.now }
});

const Pattern = mongoose.model('Pattern', patternSchema);

module.exports = Pattern; 