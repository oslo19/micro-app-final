const axios = require('axios');

const getHint = async (req, res) => {
    try {
        const { pattern, userAttempts } = req.body;
        
        // Simple hint generation based on attempts
        const hintTypes = {
            1: {
                prompt: `Give a one-sentence basic hint for: ${pattern.sequence}`,
                max_tokens: 50
            },
            2: {
                prompt: `Give a two-sentence detailed hint for: ${pattern.sequence}`,
                max_tokens: 100
            },
            3: {
                prompt: `Give three key steps to solve: ${pattern.sequence}`,
                max_tokens: 150
            }
        };

        const { prompt, max_tokens } = hintTypes[userAttempts] || hintTypes[1];

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a tutor. Be very concise."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens,
                presence_penalty: 0,
                frequency_penalty: 0
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                timeout: 8000 // 8 seconds max
            }
        );

        res.json({
            hint: response.data.choices[0].message.content,
            confidence: 0.9,
            relatedConcepts: `${pattern.type} patterns`
        });

    } catch (error) {
        console.error('Hint generation error:', error);
        res.json({
            hint: "Look for patterns in the sequence",
            confidence: 0.7,
            relatedConcepts: "Pattern recognition"
        });
    }
};

module.exports = {
    getHint
}; 
