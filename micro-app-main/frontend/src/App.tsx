import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { InputGroup } from './components/InputGroup';
import { Feedback } from './components/Feedback';
import { AIAssistant } from './components/AIAssistant';
import { Pattern, FeedbackState, AIHint, DifficultyLevel, GeneratePatternOptions, PatternType } from './types';
import { getAIHint, generatePattern } from './services/aiService';
import { saveProgress, getProgress } from './utils/progressTracker';
import { PatternDisplay } from './components/PatternDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProgressDashboard } from './components/ProgressDashboard';
import { Profile } from './components/Profile';
import { Navbar } from './components/Navbar';
import { ProgressProvider, useProgress } from './contexts/ProgressContext';

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Main App content that requires authentication
function MainApp() {
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>({ message: '', type: null });
  const [attempts, setAttempts] = useState(0);
  const [aiHint, setAIHint] = useState<AIHint | null>(null);
  const [userProgress, setUserProgress] = useState(getProgress());
  const [selectedType, setSelectedType] = useState<PatternType | 'random'>('random');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('medium');
  const [submitted, setSubmitted] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { triggerRefresh } = useProgress();
  const [puzzleHistory, setPuzzleHistory] = useState<string[]>([]);

  const handleGeneratePattern = async () => {
    try {
      setIsGenerating(true);
      const options: GeneratePatternOptions = {
        difficulty: selectedDifficulty,
        type: selectedType !== 'random' ? selectedType : undefined,
        exclude: puzzleHistory,
        userId: user?.uid
      };
      
      const newPattern = await generatePattern(options);
      
      setPuzzleHistory(prev => [...prev.slice(-9), newPattern.sequence]);
      
      setCurrentPattern({
        sequence: newPattern.sequence,
        answer: newPattern.answer,
        type: newPattern.type,
        difficulty: newPattern.difficulty,
        hint: newPattern.hint,
        explanation: newPattern.explanation || ''
      });
      setUserAnswer('');
      setFeedback({ message: '', type: null });
      setAttempts(0);
      setAIHint(null);
      setSubmitted(false);
    } catch (error) {
      console.error('Error:', error);
      setFeedback({
        message: 'Failed to generate pattern',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentPattern || !user) return;

    const isCorrect = userAnswer === currentPattern.answer;
    const score = isCorrect ? Math.max(10 - (attempts * 2), 5) : 0;

    try {
      // Update user progress
      await fetch(`${import.meta.env.VITE_API_URL}/users/${user.uid}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          isCorrect,
          attempts: attempts + 1,
          patternType: currentPattern.type
        })
      });

      // If answer is correct, save to completed patterns
      if (isCorrect) {
        await fetch(`${import.meta.env.VITE_API_URL}/patterns/completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            sequence: currentPattern.sequence,
            answer: currentPattern.answer,
            type: currentPattern.type,
            difficulty: currentPattern.difficulty
          })
        });
      }

      setSubmitted(true);
      if (!currentPattern) return;

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (isCorrect) {
        const points = Math.max(10 - (attempts * 2), 5);
        setScore(prev => prev + points);
        
        const progress = saveProgress(points, newAttempts, true);
        setUserProgress(progress);
        
        setFeedback({
          message: 'Correct! Well done!',
          type: 'success'
        });
        setAttempts(0);
        triggerRefresh();
      } else {
        setIsHintLoading(true);
        const hint = await getAIHint(currentPattern, newAttempts);
        setAIHint(hint);
        setIsHintLoading(false);

        setFeedback({
          message: 'Incorrect. Try again!',
          type: 'error'
        });
        triggerRefresh();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCheckAnswer();
    }
  };

  const handleShowAnswer = () => {
    if (currentPattern) {
        console.log('Pattern Type:', currentPattern.type);
        console.log('Full Explanation:', currentPattern.explanation);
        
        setFeedback({
            message: `The correct answer is: ${currentPattern.answer}`,
            type: 'error',
            explanation: currentPattern.explanation || 
                `This ${currentPattern.type} pattern follows a ${currentPattern.difficulty} level progression. 
                ${currentPattern.hint} Try to identify similar patterns in future questions.`
        });
    }
  };

  const canShowAnswer = attempts >= 1 && !isHintLoading;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pattern Game Section and Progress - Left Column (spans 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pattern Game */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center justify-center gap-2 mb-4 md:mb-6">
                <Brain className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-emerald-500">Pattern Completion</h1>
              </div>

              <PatternDisplay pattern={currentPattern} isLoading={isGenerating} />

              <div className="space-y-4">
                {currentPattern && (
                  <InputGroup
                    pattern={currentPattern}
                    value={userAnswer}
                    onChange={setUserAnswer}
                    onSubmit={handleCheckAnswer}
                    onKeyPress={handleKeyPress}
                    disabled={!currentPattern}
                    submitted={submitted}
                    isLoading={isGenerating}
                  />
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  <button
                    onClick={() => setSelectedType('random')}
                    className={`px-3 py-1 rounded ${
                      selectedType === 'random' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    onClick={() => setSelectedType('numeric')}
                    className={`px-3 py-1 rounded ${
                      selectedType === 'numeric' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Numeric
                  </button>
                  <button
                    onClick={() => setSelectedType('symbolic')}
                    className={`px-3 py-1 rounded ${
                      selectedType === 'symbolic' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Symbolic
                  </button>
                  <button
                    onClick={() => setSelectedType('shape')}
                    className={`px-3 py-1 rounded ${
                      selectedType === 'shape' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Shape
                  </button>
                  <button
                    onClick={() => setSelectedType('logical')}
                    className={`px-3 py-1 rounded ${
                      selectedType === 'logical' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
                    }`}
                  >
                    Logical
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => setSelectedDifficulty('easy')}
                    className={`px-3 py-1 rounded transition-colors ${
                      selectedDifficulty === 'easy' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-100'
                    }`}
                  >
                    Easy
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty('medium')}
                    className={`px-3 py-1 rounded transition-colors ${
                      selectedDifficulty === 'medium' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-100'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty('hard')}
                    className={`px-3 py-1 rounded transition-colors ${
                      selectedDifficulty === 'hard' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-100'
                    }`}
                  >
                    Hard
                  </button>
                </div>

                <button
                  onClick={handleGeneratePattern}
                  disabled={isGenerating}
                  className="w-full bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner />
                      Generating...
                    </>
                  ) : (
                    'Generate Pattern'
                  )}
                </button>

                <button
                  onClick={handleShowAnswer}
                  disabled={!canShowAnswer}
                  className={`w-full px-4 py-2 rounded-md transition-colors
                    ${canShowAnswer 
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {!canShowAnswer && isHintLoading 
                    ? 'Loading hint...' 
                    : attempts >= 1 
                      ? 'Show Answer' 
                      : 'Answer will be available after 1 attempt'}
                </button>
              </div>

              <Feedback feedback={feedback} />
              <AIAssistant hint={aiHint} />
            </div>

            {/* Progress Dashboard under Pattern Game */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-bold mb-4">Your Progress</h2>
              <ProgressDashboard />
            </div>
          </div>

          {/* Profile Section with Pie Chart - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <Profile />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {user && !isAuthPage && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainApp />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </Layout>
        </Router>
      </ProgressProvider>
    </AuthProvider>
  );
}

export default App;