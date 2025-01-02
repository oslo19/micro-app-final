const axios = require('axios');
const Pattern = require('../models/Pattern');
const CompletedPattern = require('../models/CompletedPattern');
const GeneratedPattern = require('../models/GeneratedPattern');

const validatePattern = async (pattern) => {
    try {
        // Add timeout and retry logic
        const config = {
            timeout: 5000, // 5 second timeout
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            maxRetries: 2
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [{ 
                    role: "user", 
                    content: `Is the pattern ${pattern.sequence} ambiguous? Answer only yes or no.`
                }],
                temperature: 0.3
            },
            config
        );

        // Simplified check
        const answer = response.data.choices[0].message.content.toLowerCase();
        return answer.includes('no');

    } catch (error) {
        console.error('Validation error:', error);
        return true; // Allow pattern on validation error
    }
};

// Add this function to check for existing patterns
const isPatternUnique = async (sequence, type, difficulty) => {
  try {
    // For numeric patterns, check if we have a similar pattern with different numbers
    if (type === 'numeric') {
      // Extract the pattern structure (e.g., "+2" from "2,4,6,8")
      const numbers = sequence.split(',').map(n => parseInt(n.trim()));
      const difference = numbers[1] - numbers[0];
      
      // Find patterns with similar structure
      const existingPatterns = await GeneratedPattern.find({ type });
      for (const pattern of existingPatterns) {
        const existingNumbers = pattern.sequence.split(',').map(n => parseInt(n.trim()));
        const existingDiff = existingNumbers[1] - existingNumbers[0];
        if (existingDiff === difference) {
          return false; // Pattern with similar structure exists
        }
      }
      return true;
    }

    // For symbolic patterns, check the structure rather than exact match
    if (type === 'symbolic') {
      const structureMatch = sequence.match(/\\[a-z]+|[\^_{}]|\d+/g);
      const existingPatterns = await GeneratedPattern.find({ type });
      
      for (const pattern of existingPatterns) {
        const existingStructure = pattern.sequence.match(/\\[a-z]+|[\^_{}]|\d+/g);
        if (JSON.stringify(structureMatch) === JSON.stringify(existingStructure)) {
          return false; // Similar structure exists
        }
      }
      return true;
    }

    // For shape patterns, check the pattern structure
    if (type === 'shape') {
      const shapePattern = sequence.replace(/[■▲●◆○□△]/g, 'S'); // Convert shapes to 'S'
      const existingPatterns = await GeneratedPattern.find({ type });
      
      for (const pattern of existingPatterns) {
        const existingShape = pattern.sequence.replace(/[■▲●◆○□△]/g, 'S');
        if (shapePattern === existingShape) {
          return false; // Similar structure exists
        }
      }
      return true;
    }

    // For logical patterns, check exact match (since they're more unique)
    const existingPattern = await GeneratedPattern.findOne({ 
      sequence,
      type,
      difficulty 
    });
    return !existingPattern;
  } catch (error) {
    console.error('Error checking pattern uniqueness:', error);
    return true; // Allow pattern on error
  }
};

// Add this function to save generated pattern
const saveGeneratedPattern = async (pattern) => {
  try {
    const newPattern = new GeneratedPattern(pattern);
    await newPattern.save();
    return true;
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      console.log('Pattern already exists, trying again...');
      return false;
    }
    throw error;
  }
};

// Add this function to clean up old patterns
const cleanupOldPatterns = async () => {
  try {
    const patternCount = await GeneratedPattern.countDocuments();
    console.log(`Checking pattern count: ${patternCount}`);
    
    if (patternCount >= 20) {
      // Delete all patterns (both generated and existing)
      console.log('Starting cleanup of all patterns...');
      
      // Delete all patterns from GeneratedPattern collection
      const deleteResult = await GeneratedPattern.deleteMany({});
      console.log(`Cleaned up ${deleteResult.deletedCount} patterns from database`);
      
      // Verify the cleanup
      const remainingCount = await GeneratedPattern.countDocuments();
      console.log(`Remaining patterns: ${remainingCount}`);
      
      // Double-check and force cleanup if needed
      if (remainingCount > 0) {
        await GeneratedPattern.collection.drop();
        console.log('Forced complete cleanup of patterns collection');
      }

      // Reset the collection for fresh start
      await GeneratedPattern.createCollection();
      console.log('Reset pattern collection for fresh start');
    }
  } catch (error) {
    console.error('Error cleaning up patterns:', error);
    // Try force cleanup as fallback
    try {
      await GeneratedPattern.collection.drop();
      await GeneratedPattern.createCollection();
      console.log('Forced cleanup and reset after error');
    } catch (dropError) {
      console.error('Failed to force cleanup:', dropError);
    }
  }
};

// Add these validation functions
const validateNumericPattern = (sequence, answer, rule) => {
    // Remove the question mark and only use the actual numbers
    const numbers = sequence.split(',')
        .map(n => n.trim())
        .filter(n => n !== '?' && n !== '')
        .map(n => parseInt(n));
        
    if (numbers.length < 3) return false; // Need at least 3 numbers to validate pattern

    const differences = [];
    for (let i = 1; i < numbers.length; i++) {
        differences.push(numbers[i] - numbers[i - 1]);
    }

    // Calculate expected next number
    const diffOfDiffs = differences[1] - differences[0];
    const nextDiff = differences[differences.length - 1] + diffOfDiffs;
    const expectedAnswer = numbers[numbers.length - 1] + nextDiff;
    
    // Verify the pattern is consistent and the answer matches
    const isValid = expectedAnswer === parseInt(answer);

    // Enhanced rule validation
    if (!rule || rule.length < 10) return false;
    
    // Rule should mention key terms for pattern explanation
    const ruleKeywords = ['increase', 'decrease', 'add', 'subtract', 'multiply', 'divide', 'difference', 'sequence', 'pattern'];
    const hasKeywords = ruleKeywords.some(keyword => 
        rule.toLowerCase().includes(keyword)
    );
    
    if (!hasKeywords) return false;

    return isValid;
};

// Validation functions for each pattern type
const validateLogicalPattern = (sequence, answer, rule) => {
    // Check format (either arrows or parentheses)
    const hasValidFormat = 
        (sequence.includes('→') && !sequence.includes('(')) ||
        (sequence.includes('(') && !sequence.includes('→'));
    
    if (!hasValidFormat) return false;

    // Check for consistent structure
    const terms = sequence.includes('→') 
        ? sequence.split(',').map(s => s.trim())
        : sequence.match(/\((.*?)\)/g);

    if (!terms || terms.length < 2) return false;

    // Validate rule
    if (!rule || rule.length < 10) return false;
    const ruleKeywords = ['sequence', 'pattern', 'progression', 'follows', 'order'];
    const hasKeywords = ruleKeywords.some(keyword => 
        rule.toLowerCase().includes(keyword)
    );

    return hasKeywords;
};

const validateSymbolicPattern = (sequence, answer, rule) => {
    // Check for required mathematical elements
    const requiredElements = ['x', '\\frac', '\\sum', '^', '\\cdot'];
    const hasRequiredElements = requiredElements.some(el => sequence.includes(el));
    
    if (!hasRequiredElements) {
        console.log('Pattern rejected: No mathematical elements found');
        return false;
    }

    // Validate proper LaTeX formatting
    const hasProperLatex = 
        (sequence.includes('\\frac') && sequence.includes('{') && sequence.includes('}')) ||
        (sequence.includes('\\sum') && sequence.includes('_{') && sequence.includes('^{')) ||
        (sequence.includes('^') && /[a-z\d]\^/.test(sequence));

    if (!hasProperLatex) {
        console.log('Pattern rejected: Invalid LaTeX formatting');
        return false;
    }

    // Ensure pattern isn't just numbers
    const isJustNumbers = /^[\d\s,+\-*/?.]+$/.test(sequence);
    if (isJustNumbers) {
        console.log('Pattern rejected: Pure numeric sequence');
        return false;
    }

    return true;
};

const validateShapePattern = (sequence, answer, rule) => {
    // Valid shape characters
    const validShapes = ['●', '○', '■', '□', '△', '▲', '◆'];
    
    // Check if sequence uses valid shapes
    const hasValidShapes = sequence.split('').some(char => 
        validShapes.includes(char)
    );
    
    if (!hasValidShapes) {
        console.log('Pattern rejected: No valid shapes found');
        return false;
    }

    // Check for pattern progression
    const terms = sequence.split(',').map(s => s.trim());
    if (terms.length < 3) {
        console.log('Pattern rejected: Not enough terms');
        return false;
    }

    // Validate answer contains valid shapes
    const hasValidAnswer = answer.split('').every(char => 
        validShapes.includes(char) || char === ' '
    );

    if (!hasValidAnswer) {
        console.log('Pattern rejected: Invalid shapes in answer');
        return false;
    }

    // Check for pattern consistency
    const patternTypes = [
        'repetition', // Same shape repeats
        'addition',   // New shapes added
        'position',   // Shapes change position
        'mixed'       // Combination of patterns
    ];

    const hasValidPattern = patternTypes.some(type => 
        rule.toLowerCase().includes(type) || 
        rule.toLowerCase().includes('add') ||
        rule.toLowerCase().includes('sequence') ||
        rule.toLowerCase().includes('pattern')
    );

    if (!hasValidPattern) {
        console.log('Pattern rejected: Invalid or unclear pattern type');
        return false;
    }

    return true;
};

const generatePattern = async (req, res) => {
    try {
        await cleanupOldPatterns();
        
        let requestedType = req.body.type || 'random';
            const requestedDifficulty = req.body.difficulty || 'medium';
            
        // Handle random type selection
        if (requestedType === 'random') {
            console.log('Random type requested, selecting pattern type...');
            const patternTypes = ['numeric', 'symbolic', 'shape', 'logical'];
            requestedType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
            console.log('Randomly selected pattern type:', requestedType);
        }

        // Define fallback patterns first
        const fallbackPattern = {
            numeric: {
                patterns: [
                    {
                        sequence: '2, 4, 6, 8, ?',
                        answer: '10',
                        hint: 'Look for a constant difference',
                        rule: 'Add 2 to each term'
                    },
                    {
                        sequence: '1, 4, 9, 16, ?',
                        answer: '25',
                        hint: 'Think about square numbers',
                        rule: 'Square the position number'
                    },
                    {
                        sequence: '3, 6, 12, 24, ?',
                        answer: '48',
                        hint: 'Look how each number changes',
                        rule: 'Multiply by 2 each time'
                    }
                ],
                get: function() {
                    const pattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
                    return {
                        ...pattern,
                        type: 'numeric',
                        difficulty: requestedDifficulty.toLowerCase(),
                        explanation: generateDetailedExplanation(pattern.sequence, pattern.answer, 'numeric', pattern.rule)
                    };
                }
            },
            symbolic: {
                patterns: [
                    {
                        sequence: 'x^1, x^2, x^3, ?',
                        answer: 'x^4',
                        hint: 'Look at the exponents',
                        rule: 'Increase the exponent by 1'
                    },
                    {
                        sequence: '\\frac{1}{2}, \\frac{2}{3}, \\frac{3}{4}, ?',
                        answer: '\\frac{4}{5}',
                        hint: 'Look at numerator and denominator',
                        rule: 'Increase both numbers by 1'
                    },
                    {
                        sequence: '\\sum_{n=1}^{2} n, \\sum_{n=1}^{3} n, \\sum_{n=1}^{4} n, ?',
                        answer: '\\sum_{n=1}^{5} n',
                        hint: 'Look at the upper limit',
                        rule: 'Increase the upper limit by 1'
                    }
                ],
                get: function() {
                    const pattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
                    return {
                        ...pattern,
                        type: 'symbolic',
                        difficulty: requestedDifficulty.toLowerCase(),
                        explanation: generateDetailedExplanation(pattern.sequence, pattern.answer, 'symbolic', pattern.rule)
                    };
                }
            },
            shape: {
                patterns: [
                    {
                        sequence: '△, △□, △□■, ?',
                        answer: '△□■○',
                        hint: 'Look at how shapes are added',
                        rule: 'Add a new shape while keeping previous shapes'
                    },
                    {
                        sequence: '●, ●○, ●○□, ?',
                        answer: '●○□△',
                        hint: 'Notice the pattern of shapes',
                        rule: 'Add a new shape in sequence'
                    },
                    {
                        sequence: '■, ■■, ■■■, ?',
                        answer: '■■■■',
                        hint: 'Count the squares',
                        rule: 'Add one square each time'
                    }
                ],
                get: function() {
                    const pattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
                    return {
                        ...pattern,
                        type: 'shape',
                        difficulty: requestedDifficulty.toLowerCase(),
                        explanation: generateDetailedExplanation(pattern.sequence, pattern.answer, 'shape', pattern.rule)
                    };
                }
            },
            logical: {
                patterns: [
                    {
                        sequence: '(2,3), (3,5), (5,7), ?',
                        answer: '(7,11)',
                        hint: 'Look at how each number changes',
                        rule: 'First number becomes previous second number, second number adds 2 more than before'
                    },
                    {
                        sequence: 'Spring→Summer, Summer→Autumn, Autumn→?',
                        answer: 'Winter',
                        hint: 'Think about seasons',
                        rule: 'Follow the sequence of seasons'
                    },
                    {
                        sequence: '(Small,Circle), (Medium,Square), (Large,?)',
                        answer: 'Triangle',
                        hint: 'Look for patterns in size and shape',
                        rule: 'Size increases while shapes follow a sequence'
                    }
                ],
                get: function() {
                    const pattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
                    return {
                        ...pattern,
                        type: 'logical',
                        difficulty: requestedDifficulty.toLowerCase(),
                        explanation: generateDetailedExplanation(pattern.sequence, pattern.answer, 'logical', pattern.rule)
                    };
                }
            }
        };
        
        // Verify we're starting fresh if we hit the limit
        const startCount = await GeneratedPattern.countDocuments();
        if (startCount >= 20) {
            throw new Error('Failed to cleanup patterns before generating new one');
        }

        let maxRetries = 5;
        let attempt = 0;
        let savedSuccessfully = false;

        while (!savedSuccessfully && attempt < maxRetries) {
            attempt++;
            console.log(`Attempt ${attempt} of ${maxRetries}`);

            // Fetch existing patterns to avoid duplicates
            const existingPatterns = await GeneratedPattern.find({ 
                type: requestedType 
            }).select('sequence answer type difficulty').lean();

            // Include existing patterns in the prompt to avoid duplicates
            const existingPatternsPrompt = existingPatterns.map(p => 
                `${p.sequence}|${p.answer}|${p.type}|${p.difficulty}`
            ).join('\n');

            const systemPrompt = `Generate college-level patterns EXACTLY in this format:
                sequence|answer|hint|type|difficulty|explanation|rule

                PATTERN TYPES AND RULES:

                1. Numeric Patterns:
                   VALID:
                   - 2,4,6,8,?|10|Count by 2|numeric|easy|Numbers increase by 2|Add 2 to each term
                   - 1,4,9,16,?|25|Square numbers|numeric|medium|Square the position|Square each position (n²)
                   INVALID:
                   - 1,2,4,7,?|11|Unclear progression|numeric|medium|Numbers increase|Invalid: Multiple possible rules
                   - 1,1,2,3,?|5|Fibonacci|numeric|easy|Add previous numbers|Too common/obvious

                2. Logical Patterns:
                   VALID:
                   - (Red,Circle,Small), (Blue,Square,Large), (Green,Triangle,?)|Medium|Complete the pattern|logical|medium|Size progression|Properties follow consistent order
                   - Monday→Tuesday→Wednesday, Summer→Fall→Winter, Morning→?|Afternoon|Time sequence|logical|easy|Time progression|Sequential time-based progression
                   INVALID:
                   - (Dog,Bark), (Cat,Meow), (Bird,?)|Chirp|Animal sounds|logical|easy|Animal sounds|Too simple/obvious
                   - (A,1), (B,2), (C,?)|3|Letter number pairs|logical|easy|Sequential mapping|No logical relationship

                3. Symbolic Patterns:
                   VALID EXAMPLES ONLY:
                   - x^1, x^2, x^3, ?|x^4|Power sequence|symbolic|easy|Each term increases the power of x by 1|Increase exponent by 1
                   - \\frac{1}{2}, \\frac{2}{3}, \\frac{3}{4}, ?|\\frac{4}{5}|Fraction sequence|symbolic|medium|Numerator and denominator increase by 1|Increase both numbers by 1
                   - \\sum_{n=1}^{2} n, \\sum_{n=1}^{3} n, \\sum_{n=1}^{4} n, ?|\\sum_{n=1}^{5} n|Sum sequence|symbolic|medium|Upper limit increases by 1|Increase upper limit
                   - 2x, 4x^2, 8x^3, ?|16x^4|Geometric with variable|symbolic|hard|Coefficient doubles and power increases|Double coefficient and increase power

                   EXPLANATION FORMAT FOR SYMBOLIC:
                   Let's analyze this symbolic sequence step by step:

                   Rule: [State the rule clearly]

                   Step 1: Identify the components:
                   - First term: [Analyze first term]
                   - Second term: [Analyze second term]
                   - Third term: [Analyze third term]

                   Step 2: Analyze the pattern:
                   - How coefficients change: [Describe pattern]
                   - How exponents change: [Describe pattern]
                   - Other observations: [Any additional patterns]

                   Step 3: Apply the pattern:
                   - Next coefficient: [Show calculation]
                   - Next exponent: [Show calculation]
                   - Final term: [Show result]

                   Therefore, the next term is [answer].

                   RULES FOR SYMBOLIC:
                   - Must use proper mathematical notation (x, \\frac, \\sum, \\cdot)
                   - Must include variables or mathematical operators
                   - Must show clear progression in coefficients/exponents
                   - Must use LaTeX formatting for fractions and special symbols

                DIFFICULTY RULES:
Easy:
                - Single-step operations
                - Clear, immediate patterns
                - Basic sequences
                - No more than 4-5 terms

Medium:
                - Two-step operations
                - Pattern requires analysis
                - May involve basic math concepts
                - 4-6 terms acceptable

Hard:
                - Multi-step operations
                - Complex progressions
                - Advanced math concepts
                - May use 5-7 terms

                VALIDATION RULES:
                1. Must have clear, unambiguous progression
                2. Must include explicit rule explanation
                3. Answer must be logically derivable
                4. No culturally specific references
                5. No common/obvious patterns
                6. Must match difficulty criteria

                EXISTING PATTERNS TO AVOID:
                ${existingPatternsPrompt}

                IMPORTANT: Response MUST contain EXACTLY 7 parts separated by | symbol.

                4. Shape Patterns:
                   VALID EXAMPLES ONLY:
                   - △, △□, △□■, ?|△□■○|Shape sequence|shape|medium|Each term adds a new shape in sequence|Add shapes in order: triangle, square, rectangle, circle
                   EXPLANATION FORMAT FOR SHAPE PATTERNS:
                   Let's analyze this shape sequence step by step:

                   Rule: Each term adds a new shape in sequence

                   Step 1: Examine each term in detail:
                   Term 1: △ (single triangle)
                   Term 2: △□ (kept triangle, added square)
                   Term 3: △□■ (kept previous shapes, added rectangle)

                   Step 2: Analyze how the pattern evolves:
                   - Pattern starts with △
                   - Each term keeps all previous shapes
                   - New shape is added at the end
                   - Shapes follow order: △ → □ → ■ → ○

                   Step 3: Form the next term:
                   △□■○
                   - Keep all shapes from term 3: △□■
                   - Add next shape in sequence: ○
                   
                   Therefore, the next term in the sequence is △□■○.

                   Pattern sequence: △, △□, △□■, △□■○`;

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: `Generate a ${requestedDifficulty}-level ${requestedType} pattern with a clear, consistent progression. 
                            For numeric patterns, ensure the differences follow a clear pattern.
                            MUST return in format: sequence|answer|hint|type|difficulty|explanation|rule`
                        }
                    ],
                    temperature: 0.7, // Lower temperature for more consistent patterns
                    presence_penalty: 0.5,
                    frequency_penalty: 0.5,
                    max_tokens: 200
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const text = response.data.choices[0].message.content.trim();
            console.log('AI Response:', text);

            let parts = text.split('|').map(part => part.trim());
            
            // Validate parts length and content
            if (parts.length !== 7 || !parts.every(part => part)) {
                continue;
            }

            const [sequence, answer, hint, type, difficulty, explanation, rule] = parts;

            // Validate pattern based on type
            let isValid = false;
            switch (type) {
                case 'numeric':
                    isValid = validateNumericPattern(sequence, answer, rule);
                    break;
                case 'logical':
                    isValid = validateLogicalPattern(sequence, answer, rule);
                    break;
                case 'symbolic':
                    isValid = validateSymbolicPattern(sequence, answer, rule);
                    break;
                case 'shape':
                    isValid = validateShapePattern(sequence, answer, rule);
                    break;
            }

                if (!isValid) {
                console.log(`Invalid ${type} pattern, retrying...`);
                continue;
            }

            const pattern = {
                sequence,
                answer,
                type: requestedType,
                difficulty: requestedDifficulty.toLowerCase(),
                hint,
                explanation: type === 'numeric' ? 
                    generateDetailedExplanation(sequence, answer, type, rule) : 
                    type === 'symbolic' ?
                    generateDetailedExplanation(sequence, answer, type, rule) :
                    explanation,
                rule
            };
            
            // Generate detailed explanation using OpenAI for shape patterns
            if (pattern.type === 'shape') {
                try {
                    const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                                    content: `You are a pattern analysis expert. Provide a detailed step-by-step analysis of shape patterns using this EXACT format:

Let's analyze this shape sequence step by step:

Rule: [State the pattern rule clearly]

Step 1: Examine each term in detail:
Term 1: [Describe first term's shapes and arrangement]
Term 2: [Describe second term's shapes and arrangement]
Term 3: [Describe third term's shapes and arrangement]

Step 2: Analyze the pattern progression:
- Initial pattern: [Describe starting shape(s)]
- Changes between terms: [Describe how shapes are added/modified]
- Position analysis: [Describe where new shapes are placed]
- Pattern consistency: [Describe what stays constant]

Step 3: Determine the next term:
1. Keep existing shapes: [List shapes to keep]
2. Apply pattern rule: [Explain what shape to add/modify]
3. Final arrangement: [Describe the complete next term]

Therefore, the next term in the sequence is [answer].

Pattern sequence: [Write complete sequence with answer]`
                                },
                                {
                                    role: "user",
                                    content: `Analyze this shape pattern:
                                    Sequence: ${pattern.sequence}
                                    Answer: ${pattern.answer}
                                    Rule: ${pattern.rule || 'Add shapes in sequence'}`
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 500
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    pattern.explanation = response.data.choices[0].message.content.trim();
                    console.log('Generated Shape Explanation:', pattern.explanation);
                } catch (error) {
                    console.error('Error generating shape explanation:', error);
                    pattern.explanation = generateDetailedExplanation(
                        pattern.sequence,
                        pattern.answer,
                        'shape',
                        pattern.rule
                    );
                }
            }

            // Add OpenAI explanation for logical patterns
            if (pattern.type === 'logical') {
                try {
                    console.log('Generating logical pattern explanation...');
                    const response = await axios.post(
                        'https://api.openai.com/v1/chat/completions',
                        {
                            model: "gpt-4-turbo-preview",
                            messages: [
                                {
                                    role: "system",
                                    content: `You are a pattern analysis expert. Analyze logical patterns in this format:

Let's analyze this logical sequence step by step:

Rule: [Explain the pattern rule]

Step 1: Identify the pattern type:
[Describe if it's a word sequence, category pattern, or relationship pattern]

Step 2: Analyze the progression:
[Break down how each term relates to the next]

Step 3: Apply the pattern logic:
[Explain how to determine the next term]

Therefore, the next term in the sequence is [answer].`
                                },
                                {
                                    role: "user",
                                    content: `Analyze this logical pattern:
                                    Sequence: ${pattern.sequence}
                                    Answer: ${pattern.answer}
                                    Rule: ${pattern.rule || 'Follow the logical sequence'}`
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

                    console.log('Logical pattern explanation generated successfully');
                    pattern.explanation = response.data.choices[0].message.content.trim();
                } catch (error) {
                    console.error('Error generating logical explanation:', error);
                    // Fallback explanation
                    pattern.explanation = `This logical pattern follows a ${pattern.difficulty} progression. ${pattern.hint}`;
                }
            }

            // Try to save the pattern
            savedSuccessfully = await saveGeneratedPattern(pattern);
            
            if (savedSuccessfully) {
                const currentCount = await GeneratedPattern.countDocuments();
                console.log(`Current pattern count: ${currentCount}/20`);
                
                if (currentCount >= 20) {
                    await cleanupOldPatterns();
                }
                
                res.json(pattern);
            return;
            }
        }

        // Instead of throwing error, provide a fallback pattern
        if (!savedSuccessfully) {
            console.log('Using fallback pattern after failed attempts');
            
            // Get appropriate fallback based on type
            const pattern = fallbackPattern[requestedType]?.get?.() || 
                           fallbackPattern[requestedType] || 
                           fallbackPattern.numeric;
            
            // Try to save the fallback pattern
            savedSuccessfully = await saveGeneratedPattern(pattern);
            
            if (savedSuccessfully) {
                const currentCount = await GeneratedPattern.countDocuments();
                console.log(`Current pattern count (fallback): ${currentCount}/20`);
                
                if (currentCount >= 20) {
                    await cleanupOldPatterns();
                }
                
                res.json(pattern);
                return;
            }
        }

        // Only throw error if even fallback pattern fails to save
        throw new Error('Failed to generate and save pattern, including fallback');

    } catch (error) {
        console.error('Error generating pattern:', error);
        res.status(500).json({
            error: 'Failed to generate pattern',
            details: error.message
        });
    }
};

const generateDetailedExplanation = (sequence, answer, type, rule) => {
    if (type === 'numeric') {
        const numbers = sequence.split(',')
            .map(n => n.trim())
            .filter(n => n !== '?' && n !== '')
            .map(n => parseInt(n));
            
        const differences = [];
        for (let i = 1; i < numbers.length; i++) {
            differences.push(numbers[i] - numbers[i - 1]);
        }

        const nextDiff = getNextDifference(differences);
        const lastNumber = numbers[numbers.length - 1];
        const calculatedAnswer = lastNumber + nextDiff;

        // Include the rule in the explanation
        return `Let's analyze this sequence ${sequence} step by step:

Rule: ${rule}

Step 1: Find the differences between consecutive terms: ${
    numbers.slice(0, -1).map((n, i) => 
        `${numbers[i + 1]} - ${n} = ${differences[i]}`
    ).join(' ')
} 

Step 2: Observe the pattern in the differences: ${
    getDifferencePattern(differences)
} 

Step 3: Calculate the next difference: ${
    getNextDifferenceExplanation(differences)
} 

Step 4: Add this difference to the last number: ${
    lastNumber} + ${nextDiff} = ${calculatedAnswer
} 

Therefore, the next number in the sequence is ${calculatedAnswer}.`;
    }
    
    if (type === 'symbolic') {
        try {
            const terms = sequence.split(',').map(t => t.trim());
            const validTerms = terms.filter(t => t !== '?');

            // Basic pattern analysis
            const explanation = `Let's analyze this symbolic sequence step by step:

Rule: ${rule}

Step 1: Identify the components:
${validTerms.map((term, i) => `Term ${i + 1}: \\(${term}\\)`).join('\n')}

Step 2: Analyze the pattern:
- Pattern type: ${rule.includes('power') ? 'Power sequence' : 
                rule.includes('fraction') ? 'Fraction sequence' : 
                rule.includes('sum') ? 'Summation sequence' : 'Basic sequence'}
- Changes between terms: ${rule}
- Pattern consistency: Terms follow a clear mathematical progression

Step 3: Apply the pattern:
\\(${answer}\\)

Therefore, the next term in the sequence is \\(${answer}\\).

Pattern sequence: ${terms.map(t => t === '?' ? '?' : `\\(${t}\\)`).join(', ')}`;

            return explanation;
        } catch (error) {
            console.error('Error generating symbolic explanation:', error);
            return `This symbolic pattern follows the rule: ${rule}. The next term is ${answer}.`;
        }
    }
    
    if (type === 'shape') {
        const terms = sequence.split(',').map(t => t.trim());
        const shapes = terms.filter(t => t !== '?');
        
        // Analyze each term's composition
        const termAnalysis = shapes.map((term, i) => {
            const prevTerm = i > 0 ? shapes[i - 1] : '';
            const keptShapes = term.split('').filter(s => prevTerm.includes(s));
            const newShapes = term.split('').filter(s => !prevTerm.includes(s));
            
            return `Term ${i + 1}: ${term} (${i === 0 ? 
                `single ${getShapeName(term)}` : 
                `kept ${keptShapes.map(getShapeName).join(', ')}, added ${newShapes.map(getShapeName).join(', ')}`})`;
        }).join('\n');

        // Analyze the pattern evolution
        const patternEvolution = shapes.map((term, i) => {
            if (i === 0) return `Pattern starts with ${term}`;
            const prevTerm = shapes[i - 1];
            const newShape = term.split('').find(s => !prevTerm.includes(s));
            return `Term ${i + 1} adds ${getShapeName(newShape)}`;
        }).join('\n');

        return `Let's analyze this shape sequence step by step:

Rule: ${rule}

Step 1: Examine each term in detail:
${termAnalysis}

Step 2: Analyze how the pattern evolves:
${patternEvolution}
- Each term keeps all previous shapes
- New shape is added at the end
- Shapes follow order: ${shapes.map(getShapeName).join(' → ')}

Step 3: Form the next term:
${answer}
- Keep all shapes from term ${shapes.length}: ${shapes[shapes.length - 1]}
- Add next shape in sequence: ${answer.slice(-1)}

Therefore, the next term in the sequence is ${answer}.

Pattern sequence: ${terms.map(t => t || answer).join(', ')}`;
    }
    
    // For other types, return the original explanation
    return explanation;
};

const getNextDifference = (differences) => {
    if (differences.length < 2) return differences[0];
    
    const diffOfDiffs = differences[1] - differences[0];
    return differences[differences.length - 1] + diffOfDiffs;
};

const getDifferencePattern = (differences) => {
    if (differences.length < 2) return `The difference is constant: ${differences[0]}`;
    
    const diffOfDiffs = differences[1] - differences[0];
    if (diffOfDiffs === 0) {
        return `The differences are constant: ${differences[0]}`;
    } else {
        return `The differences are increasing by ${diffOfDiffs}: ${differences.join(', ')}`;
    }
};

const getNextDifferenceExplanation = (differences) => {
    if (differences.length < 2) return `The difference remains constant at ${differences[0]}`;
    
    const diffOfDiffs = differences[1] - differences[0];
    const nextDiff = differences[differences.length - 1] + diffOfDiffs;
    return `Since the differences are increasing by ${diffOfDiffs}, the next difference will be: ` +
           `${differences[differences.length - 1]} + ${diffOfDiffs} = ${nextDiff}`;
};

// Add this function to manually reset patterns if needed
const resetPatterns = async (req, res) => {
  try {
    await GeneratedPattern.deleteMany({});
    res.json({ message: 'All generated patterns have been reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset patterns' });
    }
};

const symbolicPatterns = {
  easy: [
    {
      sequence: "\\frac{1}{2}, \\frac{2}{3}, \\frac{3}{4}, ?",
      answer: "\\frac{4}{5}",
      hint: "Look at numerator and denominator",
      explanation: "Each number increases by 1"
    },
    {
      sequence: "x^1, x^2, x^3, ?",
      answer: "x^4",
      hint: "Look at exponents",
      explanation: "Powers increase by 1"
    }
  ],
  medium: [
    {
      sequence: "\\frac{1}{1}, \\frac{1}{2}, \\frac{1}{3}, ?",
      answer: "\\frac{1}{4}",
      hint: "Look at denominators",
      explanation: "Denominators increase by 1"
    },
    {
      sequence: "2^1, 2^2, 2^3, ?",
      answer: "2^4",
      hint: "Look at exponents",
      explanation: "Powers of 2 sequence"
    },
    {
      sequence: "\\sum_{n=1}^{2} n, \\sum_{n=1}^{3} n, \\sum_{n=1}^{4} n, ?",
      answer: "\\sum_{n=1}^{5} n",
      hint: "Look at the upper limit",
      explanation: "Each term increases the upper limit by 1"
    }
  ],
  hard: [
    {
      sequence: "\\sqrt{1}, \\sqrt{4}, \\sqrt{9}, ?",
      answer: "\\sqrt{16}",
      hint: "Look at numbers under root",
      explanation: "Perfect squares sequence"
    },
    {
      sequence: "\\sum_{n=1}^{2} n^2, \\sum_{n=1}^{3} n^2, \\sum_{n=1}^{4} n^2",
      answer: "\\sum_{n=1}^{5} n^2",
      hint: "Look at upper limits of sum of squares",
      explanation: "Each term increases the upper limit of sum of squares by 1"
    },
    {
      sequence: "\\sum_{n=1}^{2} n^3, \\sum_{n=1}^{3} n^3, \\sum_{n=1}^{4} n^3",
      answer: "\\sum_{n=1}^{5} n^3",
      hint: "Look at upper limits of sum of cubes",
      explanation: "Each term increases the upper limit of sum of cubes by 1"
    }
  ]
};

const generateLogicalOptions = async (req, res) => {
    try {
        const { pattern, correctAnswer } = req.body;

        const prompt = `Given this logical pattern:
        Sequence: ${pattern.sequence}
        Correct Answer: ${correctAnswer}
        Pattern Type: ${pattern.type}
        
        Generate 3 plausible but incorrect multiple choice options that are contextually related to the correct answer.
        The options should be related to the pattern type:
        
        1. For calendar/time sequences (containing months, days, seasons):
          - Use related time units
          - Keep options in similar category
        
        2. For word pairs/opposites:
          - Use related word pairs
          - Keep similar relationship type
        
        3. For code/letter patterns:
          - Use similar format
          - Keep consistent structure
        
        4. For concept relationships:
          - Use related concepts
          - Maintain similar relationship type
        
        Return ONLY the 3 options as a comma-separated list.
        The options must be different from the correct answer: ${correctAnswer}`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: "You are a pattern generator. Generate only the requested options, no explanation."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const optionsText = response.data.choices[0].message.content.trim();
        const options = optionsText.split(',').map(opt => opt.trim());

        res.json({ options });

    } catch (error) {
        console.error('Error generating logical options:', error);
        res.status(500).json({
            error: 'Failed to generate options',
            details: error.message
        });
    }
};

// Helper function to get shape names
const getShapeName = (shape) => {
    const shapeNames = {
        '△': 'triangle',
        '□': 'square',
        '■': 'filled square',
        '○': 'circle',
        '●': 'filled circle',
        '▲': 'filled triangle',
        '◆': 'diamond'
    };
    return shapeNames[shape] || shape;
};

module.exports = {
    generatePattern,
    resetPatterns,
    generateLogicalOptions
}; 
