const axios = require('axios');

const getHint = async (req, res) => {
    try {
        const { pattern, userAttempts } = req.body;
        console.log('Generating hints for pattern:', pattern);
        
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a math tutor providing concise hints."
                    },
                    {
                        role: "user",
                        content: `Provide a ${userAttempts === 1 ? 'basic' : userAttempts === 2 ? 'detailed' : 'comprehensive'} hint for this ${pattern.type} pattern: ${pattern.sequence}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                timeout: 10000
            }
        );

        const hint = response.data.choices[0].message.content;
        console.log('Generated hint:', hint);

        res.json({
            hint: hint,
            confidence: 0.9,
            relatedConcepts: `Pattern recognition, ${pattern.type} sequences`
        });

    } catch (error) {
        console.error('Error generating hints:', error);
        // Return fallback hint
        res.json({
            hint: "Look for patterns in how the values change",
            confidence: 0.7,
            relatedConcepts: "Basic pattern recognition"
        });
    }
};

module.exports = {
    getHint
}; 
