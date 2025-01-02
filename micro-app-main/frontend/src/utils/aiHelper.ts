import { Pattern, AIHint } from '../types';

export function generateAIHint(pattern: Pattern, userAttempts: number): AIHint {
  // Simulate AI-generated hints based on pattern type and user attempts
  const baseHint = pattern.hint;
  let additionalHint = '';
  let confidence = 0.9;
  
  if (userAttempts === 1) {
    switch (pattern.type) {
      case 'numeric':
        additionalHint = 'Try looking for mathematical operations between numbers';
        break;
      case 'symbolic':
        additionalHint = 'Focus on the pattern of symbols and their arrangement';
        break;
      case 'logical':
        additionalHint = 'Think about common sequences or words these might represent';
        break;
    }
    confidence = 0.85;
  } else if (userAttempts >= 2) {
    additionalHint = pattern.explanation;
    confidence = 0.95;
  }

  return {
    hint: `${baseHint}${additionalHint ? '. ' + additionalHint : ''}`,
    confidence,
    reasoning: `Based on the ${pattern.type} pattern and difficulty level: ${pattern.difficulty}`
  };
}