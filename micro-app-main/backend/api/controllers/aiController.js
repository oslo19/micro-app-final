const axios = require('axios');

const getHint = async (req, res) => {
    try {
        const { pattern, userAttempts } = req.body;
        
        // Simplified prompt for faster response
        const prompt = `Pattern: ${pattern.sequence}
Type: ${pattern.type}
Difficulty: ${pattern.difficulty}

Generate 3 progressive hints:
1. Basic: One sentence observation hint
2. Medium: Two sentence strategy hint
3. Detailed: Three step solution guide

Format: JSON with hint1, hint2, hint3 keys. Keep each hint concise.`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo", // Using faster model
                messages: [
                    {
                        role: "system",
                        content: "You are a concise math tutor. Keep hints brief and clear."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 150, // Reduced tokens
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                timeout: 5000 // 5 second timeout
            }
        );

        const hints = response.data.choices[0].message.content;
        const parsedHints = JSON.parse(hints);

        const responseData = {
            hint: parsedHints.hint1,
            reasoning: parsedHints.hint2,
            tips: parsedHints.hint3.split('.'), // Split into array for step-by-step
            confidence: 0.9,
            relatedConcepts: `Key concept: ${pattern.type} patterns`
        };

        res.json(responseData);

    } catch (error) {
        console.error('Error generating hints:', error);
        // Fallback hints
        res.json({
            hint: "Look at how the pattern changes between terms.",
            reasoning: "Consider the relationship between consecutive elements.",
            tips: ["Observe the pattern", "Apply the rule", "Verify your answer"],
            confidence: 0.7,
            relatedConcepts: "Pattern recognition"
        });
    }
};

module.exports = {
    getHint
}; 
