import { Pattern, PatternType, DifficultyLevel, GeneratePatternOptions } from '../types';
import { generateAIHint } from '../utils/aiHelper';

const API_URL = import.meta.env.VITE_API_URL;

export const generatePattern = async (options: GeneratePatternOptions = {}): Promise<Pattern> => {
    const retryCount = 3; // Number of retry attempts
    const timeout = 8000; // 8 seconds timeout

    for (let attempt = 0; attempt < retryCount; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            console.log(`Attempt ${attempt + 1} to generate ${options.type} pattern`);

            const response = await fetch(`${API_URL}/patterns/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                signal: controller.signal,
                body: JSON.stringify({
                    ...options,
                    retryAttempt: attempt // Send attempt number to backend
                })
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                return data;
            }

            console.log(`Attempt ${attempt + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries

        } catch (error) {
            console.error(`Error on attempt ${attempt + 1}:`, error);
            if (attempt === retryCount - 1) throw error;
        }
    }

    throw new Error(`Failed to generate pattern after ${retryCount} attempts`);
};

export const getAIHint = async (pattern: Pattern, userAttempts: number) => {
    try {
        console.log('Requesting hints for pattern:', pattern);
        const response = await fetch(`${API_URL}/ai/get-hint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pattern, userAttempts }),
        });

        if (!response.ok) {
            throw new Error('Failed to get hint');
        }

        const data = await response.json();
        console.log('Received hints from API:', data);

        return {
            hint: data.hint,
            reasoning: data.reasoning,
            tips: data.tips,
            confidence: data.confidence,
            relatedConcepts: data.relatedConcepts
        };
    } catch (error) {
        console.error('Error getting AI hint:', error);
        return {
            hint: "Look for patterns in how the values change.",
            reasoning: "Try calculating the differences between consecutive terms.",
            tips: [
                "1. Calculate differences between terms",
                "2. Look for patterns in these differences",
                "3. Apply the pattern to find the next term"
            ],
            confidence: 0.7,
            relatedConcepts: "Pattern recognition, sequences"
        };
    }
};

export const resetPatterns = async (): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/patterns/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to reset patterns');
        }

        console.log('Successfully reset pattern database');
    } catch (error) {
        console.error('Error resetting patterns:', error);
        throw error;
    }
};

function getRandomDifficulty(): DifficultyLevel {
    const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];
    return difficulties[Math.floor(Math.random() * difficulties.length)];
}

function getRandomType(): PatternType {
    const types: PatternType[] = ['numeric', 'symbolic', 'shape', 'logical'];
    return types[Math.floor(Math.random() * types.length)];
}
