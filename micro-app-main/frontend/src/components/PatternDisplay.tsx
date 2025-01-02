import { useEffect, useRef, useState } from 'react';
import { Pattern } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import katex from 'katex';

export function PatternDisplay({ pattern, isLoading }: { pattern: Pattern | null, isLoading: boolean }) {
  const mathRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (pattern?.type === 'symbolic' && mathRef.current) {
      setIsRendering(true);
      try {
        // Format the sequence for proper LaTeX display
        const formattedSequence = pattern.sequence
          .split(',')
          .map(term => term.trim())
          .join(', ');

        // Wrap the entire sequence in LaTeX display math mode
        const latexExpression = `\\displaystyle{${formattedSequence}}`;

        katex.render(latexExpression, mathRef.current, {
          throwOnError: false,
          displayMode: true,
          strict: false,
          trust: true,
          macros: {
            '\\f': '\\textbf{f}' // Add any custom macros here
          }
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        setRenderError(true);
        // Fallback to plain text if rendering fails
        if (mathRef.current) {
          mathRef.current.textContent = pattern.sequence;
        }
      }
      setIsRendering(false);
    }
  }, [pattern]);

  // Show loading state while rendering
  if (isRendering) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isLoading) return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
      <div className="flex justify-center items-center gap-2">
        <LoadingSpinner />
        <p className="text-lg md:text-xl text-gray-500">Generating pattern...</p>
      </div>
    </div>
  );

  if (!pattern) return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
      <p className="text-lg md:text-xl">Click "Generate" to start.</p>
    </div>
  );

  const difficultyColor = {
    easy: 'text-emerald-500',
    medium: 'text-yellow-500',
    hard: 'text-red-500'
  }[pattern.difficulty];

  return (
    <div className="mb-4">
      <div className="bg-gray-100 p-4 md:p-6 rounded-lg text-center">
        <div className="text-xl md:text-2xl font-bold mb-2">
          {pattern?.type === 'symbolic' ? (
            renderError ? (
              <div className="text-gray-800">
                {pattern.sequence}
              </div>
            ) : (
              <div ref={mathRef} className="overflow-x-auto" />
            )
          ) : (
            <span className="break-all">{pattern?.sequence}</span>
          )}
        </div>
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <span className="text-gray-600 text-sm">{pattern.type}</span>
          <span className={`${difficultyColor} text-sm font-medium`}>
            {pattern.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}