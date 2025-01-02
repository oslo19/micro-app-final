const axios = require('axios');

const getHint = async (req, res) => {
    try {
        const { pattern, userAttempts } = req.body;
        console.log('Received pattern for hint generation:', pattern);
        
        // Generate prompts for all three hint levels
        const hintPrompts = [
            // Hint Level 1 - Basic Observation
            `Provide a basic hint for this ${pattern.type} pattern: ${pattern.sequence}
            Requirements for Hint Level 1:
            - Point out obvious visual patterns
            - Guide initial observations
            - Keep it simple and encouraging
            - Don't reveal the solution method
            Format: Just provide the basic hint in 1-2 sentences.`,

            // Hint Level 2 - Pattern Analysis
            `Provide a more detailed hint for this ${pattern.type} pattern: ${pattern.sequence}
            Requirements for Hint Level 2:
            - Break down the pattern structure
            - Highlight key relationships
            - Suggest a solution approach
            - Don't give away the answer
            Format: Provide a structured hint with pattern analysis.`,

            // Hint Level 3 - Comprehensive Guide
            `Provide a comprehensive hint for this ${pattern.type} pattern: ${pattern.sequence}
            Requirements for Hint Level 3:
            - Detailed step-by-step guidance
            - Explain the pattern logic
            - Show how to verify the pattern
            - Everything except the direct answer
            Format: Provide a detailed explanation with steps to solve.`
        ];

        console.log('Generating hints for all levels...');
        const responses = await Promise.all(hintPrompts.map(async (prompt, index) => {
            console.log(`Generating hint level ${index + 1}...`);
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                            content: "You are a patient math tutor providing scaffolded hints."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    }
                }
            );
            console.log(`Hint level ${index + 1} generated:`, response.data.choices[0].message.content);
            return response;
        }));

        const hints = responses.map(response => 
            response.data.choices[0].message.content.trim()
        );

        console.log('All hints generated:', hints);

        const responseData = {
            hint: hints[0], // Basic hint
            reasoning: hints[1], // Detailed hint
            tips: hints[2].split('\n'), // Comprehensive hint split into steps
            confidence: 0.9,
            relatedConcepts: `This pattern involves concepts like ${pattern.type === 'numeric' ? 'arithmetic sequences and differences' : 
                pattern.type === 'symbolic' ? 'mathematical notation and operations' :
                pattern.type === 'shape' ? 'geometric progressions and spatial patterns' :
                'logical relationships and pattern recognition'}`
        };

        console.log('Sending response:', responseData);
        res.json(responseData);

    } catch (error) {
        console.error('Error generating hints:', error);
        res.status(500).json({ 
            error: 'Error generating hints',
            details: error.message
        });
    }
};

module.exports = {
    getHint
}; 
