import React, { useState, useEffect, useRef } from 'react';
import { FeedbackState } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import katex from 'katex';

interface FeedbackProps {
  feedback: FeedbackState;
}

export function Feedback({ feedback }: FeedbackProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedback.type === 'error' && answerRef.current) {
      try {
        const latexMatch = feedback.message.match(/The correct answer is: (.*)/);
        if (latexMatch) {
          const answer = latexMatch[1];
          // Check if it's a LaTeX pattern
          if (answer.includes('\\') || answer.includes('_') || answer.includes('^')) {
            katex.render(answer, answerRef.current, {
              throwOnError: false,
              displayMode: true,
              trust: true,
              strict: false
            });
          } else {
            // For non-LaTeX patterns (shapes, numbers, etc.)
            answerRef.current.textContent = answer;
          }
        }
      } catch (error) {
        console.error('Answer rendering error:', error);
        if (answerRef.current) {
          answerRef.current.textContent = feedback.message.replace('The correct answer is: ', '');
        }
      }
    }
  }, [feedback]);

  // Render explanation with KaTeX
  useEffect(() => {
    if (showExplanation && explanationRef.current && feedback.explanation) {
      console.log('Raw explanation:', feedback.explanation);
      
      try {
        // Split explanation into parts and render math parts with KaTeX
        const parts = feedback.explanation.split(/(\\\(.*?\\\))/g);
        console.log('Split parts:', parts);

        explanationRef.current.innerHTML = parts.map(part => {
          if (part.startsWith('\\(') && part.endsWith('\\)')) {
            console.log('Rendering math part:', part);
            const math = part.slice(2, -2); // Remove \( and \)
            const span = document.createElement('span');
            katex.render(math, span, {
              throwOnError: false,
              displayMode: false,
              trust: true,
              strict: false
            });
            console.log('Rendered math HTML:', span.outerHTML);
            return span.outerHTML;
          }
          return part;
        }).join('');
        
        console.log('Final rendered HTML:', explanationRef.current.innerHTML);
      } catch (error) {
        console.error('Explanation rendering error:', error);
        explanationRef.current.textContent = feedback.explanation;
      }
    }
  }, [showExplanation, feedback.explanation]);

  if (!feedback.type) return null;

  const bgColor = feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div className={`mt-4 p-3 md:p-4 rounded-md text-white ${bgColor}`}>
      {feedback.message.includes('The correct answer is:') ? (
        <div className="flex flex-col gap-2">
          <p>The correct answer is:</p>
          <div 
            ref={answerRef} 
            className="bg-white/10 p-2 rounded flex justify-center items-center min-h-[40px]"
          />
        </div>
      ) : (
        <p className="text-sm md:text-base">{feedback.message}</p>
      )}
      
      {feedback.explanation && (
        <>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-white/90 hover:text-white mt-2 text-sm"
          >
            {showExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
          </button>
          
          {showExplanation && (
            <div className="mt-2 p-2 bg-white/10 rounded text-sm">
              <div className="space-y-2">
                <p className="font-medium">Explanation:</p>
                <div 
                  ref={explanationRef}
                  className="whitespace-pre-line"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}