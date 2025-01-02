const mongoose = require('mongoose');
const { Schema } = mongoose;

const generatedPatternSchema = new Schema({
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
  hint: String,
  explanation: String,
  generatedAt: { type: Date, default: Date.now }
});

// Add index for faster lookups
generatedPatternSchema.index({ sequence: 1 });

const GeneratedPattern = mongoose.model('GeneratedPattern', generatedPatternSchema);
module.exports = GeneratedPattern; 