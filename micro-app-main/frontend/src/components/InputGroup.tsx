import React from 'react';
import { Pattern } from '../types';
import { MultipleChoice } from './MultipleChoice';

interface InputGroupProps {
  pattern: Pattern;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
  disabled: boolean;
  submitted: boolean;
  isLoading?: boolean;
}

export function InputGroup({ 
  pattern,
  value, 
  onChange, 
  onSubmit, 
  onKeyPress,
  disabled,
  submitted,
  isLoading 
}: InputGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {pattern.type === 'numeric' ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Enter the next number in the pattern..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={disabled || isLoading}
        />
      ) : (
        <MultipleChoice
          pattern={pattern}
          selectedAnswer={value}
          onSelect={onChange}
          disabled={disabled}
          submitted={submitted}
          isLoading={isLoading}
        />
      )}
      
      <button
        onClick={onSubmit}
        disabled={disabled || !value || isLoading}
        className="w-full px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit Answer
      </button>
    </div>
  );
}