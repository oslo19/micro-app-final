import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Pattern } from '../types';
import katex from 'katex';

interface MultipleChoiceProps {
  pattern: Pattern;
  selectedAnswer: string;
  onSelect: (answer: string) => void;
  disabled: boolean;
  submitted: boolean;
}

export function MultipleChoice({ pattern, selectedAnswer, onSelect, disabled, submitted }: MultipleChoiceProps) {
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mcOptions, setMcOptions] = useState<string[]>([]);

  const generateShapeOptions = (correctAnswer: string): string[] => {
    const options = [correctAnswer];
    const shapes = ['■', '▲', '●', '◆', '○', '□', '△'];
    
    // Helper function to slightly modify the correct answer
    const modifyAnswer = (answer: string): string => {
      const modifications = [
        // Swap last two shapes
        () => {
          const chars = answer.split('');
          if (chars.length >= 2) {
            [chars[chars.length - 1], chars[chars.length - 2]] = [chars[chars.length - 2], chars[chars.length - 1]];
          }
          return chars.join('');
        },
        // Replace one shape with another
        () => {
          const chars = answer.split('');
          const randomIndex = Math.floor(Math.random() * chars.length);
          const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
          chars[randomIndex] = randomShape;
          return chars.join('');
        },
        // Add or remove one shape
        () => {
          const chars = answer.split('');
          if (Math.random() < 0.5 && chars.length > 1) {
            return chars.slice(0, -1).join('');
          } else {
            return answer + shapes[Math.floor(Math.random() * shapes.length)];
          }
        }
      ];

      const modification = modifications[Math.floor(Math.random() * modifications.length)];
      return modification();
    };

    // Generate 3 wrong answers by modifying the correct answer
    while (options.length < 4) {
      const wrongAnswer = modifyAnswer(correctAnswer);
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }

    return options.sort(() => Math.random() - 0.5);
  };

  const generateLogicalOptions = async (correctAnswer: string): Promise<string[]> => {
    const options = [correctAnswer];
    
    try {
        // For number pair patterns like (2,3), (3,5), (5,7)
        if (correctAnswer.includes(',') && correctAnswer.match(/\d+/g)) {
            const numbers = correctAnswer.match(/\d+/g)?.map(Number) || [];
            if (numbers.length === 2) {
                // Generate plausible but incorrect options
                const variations = [
                    // Maintain first number, change second
                    `(${numbers[0]},${numbers[1] + 2})`,
                    // Change both numbers slightly
                    `(${numbers[0] + 1},${numbers[1] - 1})`,
                    // Use pattern but with wrong numbers
                    `(${numbers[0] + 2},${numbers[1] + 1})`
                ];
                
                // Add variations that look plausible
                options.push(...variations);
                return options.sort(() => Math.random() - 0.5);
            }
        }

        // If not a number pair pattern, use OpenAI
        const response = await fetch(`${import.meta.env.VITE_API_URL}/patterns/options`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pattern: pattern,
                correctAnswer: correctAnswer
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate options');
        }

        const data = await response.json();
        options.push(...data.options.filter((opt: string) => opt !== correctAnswer));
        
        return options.slice(0, 4);
    } catch (error) {
        console.error('Error generating logical options:', error);
        return generateFallbackOptions(correctAnswer);
    }
  };

  // Fallback option generation
  const generateFallbackOptions = (correctAnswer: string): string[] => {
    const options = [correctAnswer];
    
    if (pattern.sequence.includes('→')) {
      // For sequence patterns
      if (pattern.sequence.includes('Spring') || pattern.sequence.includes('Summer')) {
        options.push(...['Winter', 'Autumn', 'July'].filter(o => o !== correctAnswer));
      } else if (pattern.sequence.includes('Red') || pattern.sequence.includes('Orange')) {
        options.push(...['Purple', 'Brown', 'Pink'].filter(o => o !== correctAnswer));
      } else {
        options.push(...['Next', 'End', 'Skip'].filter(o => o !== correctAnswer));
      }
    } else if (pattern.sequence.includes('(')) {
      // For grouped patterns
      options.push(...['Large', 'Small', 'Round'].filter(o => o !== correctAnswer));
    } else {
      options.push(...['Similar', 'Different', 'None'].filter(o => o !== correctAnswer));
    }

    return options;
  };

  const generateSymbolicOptions = (correctAnswer: string): string[] => {
    const options = [correctAnswer];
    
    const modifyMathExpression = (expr: string): string => {
      // Handle derivatives (like \frac{d}{dx}x^4)
      if (expr.includes('\\frac{d}{dx}')) {
        const powerMatch = expr.match(/x\^(\d+)/);
        if (powerMatch) {
          const power = parseInt(powerMatch[1]);
          // Generate variations with similar derivative structure
          const variations = [
            `\\frac{d}{dx}x^${power - 1}`,
            `\\frac{d}{dx}x^${power + 1}`,
            `\\frac{d}{dx}x^${power + 2}`
          ];
          return variations[Math.floor(Math.random() * variations.length)];
        }
      }

      // Handle exponential sequences (like 2^n)
      if (expr.match(/\d+\^n/)) {
        const baseMatch = expr.match(/(\d+)\^n/);
        if (baseMatch) {
          const base = parseInt(baseMatch[1]);
          // Keep exponential structure but vary base
          const variations = [
            `${base - 1}^n`,
            `${base + 1}^n`,
            `${base + 2}^n`
          ];
          return variations[Math.floor(Math.random() * variations.length)];
        }
      }

      // Handle factorial sums (like \sum_{n=2}^5 n!)
      if (expr.includes('\\sum') && expr.includes('!')) {
        const lowerMatch = expr.match(/_{n=(\d+)}/);
        const upperMatch = expr.match(/\^{(\d+)}/);
        if (lowerMatch && upperMatch) {
          const lowerBound = parseInt(lowerMatch[1]);
          const upperBound = parseInt(upperMatch[1]);
          
          // Generate variations that keep the same lower bound
          const variations = [
            // Original pattern
            `\\sum_{n=${lowerBound}}^{${upperBound}} n!`,
            // Vary only upper bound
            `\\sum_{n=${lowerBound}}^{${upperBound + 1}} n!`,
            `\\sum_{n=${lowerBound}}^{${upperBound - 1}} n!`,
            `\\sum_{n=${lowerBound}}^{${upperBound + 2}} n!`
          ];
          
          return variations[Math.floor(Math.random() * (variations.length - 1) + 1)]; // Skip first (original) option
        }
      }

      // Handle integrals (like \int_0^2 x^2 dx)
      if (expr.includes('\\int')) {
        const powerMatch = expr.match(/x\^(\d+)/);
        const limitsMatch = expr.match(/\\int_(\d+)\^(\d+)/);
        if (powerMatch && limitsMatch) {
          const power = parseInt(powerMatch[1]);
          const lower = parseInt(limitsMatch[1]);
          const upper = parseInt(limitsMatch[2]);
          // Generate variations maintaining integral structure
          const variations = [
            `\\int_{${lower}}^{${upper + 1}} x^${power} dx`,
            `\\int_{${lower}}^{${upper}} x^${power + 1} dx`,
            `\\int_{${lower + 1}}^{${upper}} x^${power} dx`
          ];
          return variations[Math.floor(Math.random() * variations.length)];
        }
      }

      // Handle geometric sequences (like \frac{1}{2^n})
      if (expr.includes('\\frac{1}{') && expr.includes('^')) {
        const baseMatch = expr.match(/\\frac\{1\}\{(\d+)\^(\d+)\}/);
        if (baseMatch) {
          const [_, base, power] = baseMatch;
          // Keep geometric structure but vary power
          const newPower = parseInt(power) + Math.floor(Math.random() * 3) - 1;
          return `\\frac{1}{${base}^${newPower}}`;
        }
      }

      // Handle product sequences (like \prod_{i=1}^n i)
      if (expr.includes('\\prod')) {
        const limitsMatch = expr.match(/\\prod_\{i=(\d+)\}\^\{(\d+)\}/);
        if (limitsMatch) {
          const [_, lower, upper] = limitsMatch;
          // Keep product structure but vary limits
          const newUpper = parseInt(upper) + Math.floor(Math.random() * 3) - 1;
          return `\\prod_{i=${lower}}^{${newUpper}} i`;
        }
      }

      // ... existing summation and other handlers ...

      return expr;
    };

    // Generate variations
    let attempts = 0;
    while (options.length < 4 && attempts < 20) {
      const wrongAnswer = modifyMathExpression(correctAnswer);
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
      attempts++;
    }

    // Fallback options if needed
    while (options.length < 4) {
      let defaultOption;
      
      // Pattern-specific fallbacks
      if (correctAnswer.includes('\\frac{d}{dx}')) {
        const powerMatch = correctAnswer.match(/x\^(\d+)/);
        const power = powerMatch ? parseInt(powerMatch[1]) : 2;
        defaultOption = `\\frac{d}{dx}x^${power + options.length}`;
      } else if (correctAnswer.includes('\\int')) {
        const powerMatch = correctAnswer.match(/x\^(\d+)/);
        const power = powerMatch ? parseInt(powerMatch[1]) : 1;
        defaultOption = `\\int_0^${options.length + 1} x^${power} dx`;
      } else if (correctAnswer.includes('\\prod')) {
        defaultOption = `\\prod_{i=1}^${options.length + 2} i`;
      } else {
        defaultOption = correctAnswer.replace(/\d+/g, (match) => 
          Math.max(1, parseInt(match) + options.length).toString()
        );
      }

      if (!options.includes(defaultOption)) {
        options.push(defaultOption);
      }
    }

    return options.sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    const generateOptions = async () => {
      try {
        switch (pattern.type) {
          case 'shape':
            setMcOptions(generateShapeOptions(pattern.answer));
            break;
          case 'logical':
            const logicalOpts = await generateLogicalOptions(pattern.answer);
            setMcOptions(logicalOpts);
            break;
          case 'symbolic':
            setMcOptions(generateSymbolicOptions(pattern.answer));
            break;
          default:
            setMcOptions([pattern.answer, 'Option 2', 'Option 3', 'Option 4']);
        }
      } catch (error) {
        console.error('Error generating options:', error);
        // Fallback options
        setMcOptions([pattern.answer, 'Option 2', 'Option 3', 'Option 4']);
      }
    };

    generateOptions();
  }, [pattern]);

  useEffect(() => {
    if (pattern.type === 'symbolic') {
      mcOptions.forEach((option, index) => {
        const ref = optionRefs.current[index];
        if (ref) {
          ref.innerHTML = '';
          katex.render(option, ref, {
            throwOnError: false,
            displayMode: true
          });
        }
      });
    }
  }, [mcOptions, pattern.type]);

  const getButtonStyle = (option: string) => {
    if (disabled) return 'opacity-50 cursor-not-allowed';
    if (submitted && selectedAnswer === option) {
      return option === pattern.answer 
        ? 'border-green-500 bg-green-50' 
        : 'border-red-500 bg-red-50';
    }
    return selectedAnswer === option 
      ? 'border-emerald-500'
      : 'border-gray-200 hover:border-gray-300';
  };

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {mcOptions.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={`p-3 rounded-md border-2 transition-colors ${getButtonStyle(option)}`}
        >
          {pattern.type === 'symbolic' ? (
            <div ref={el => optionRefs.current[index] = el} />
          ) : (
            <span className="text-2xl">{option}</span>
          )}
        </button>
      ))}
    </div>
  );
} 