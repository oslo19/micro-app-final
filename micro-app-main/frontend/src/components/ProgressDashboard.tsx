import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../contexts/ProgressContext';

interface Progress {
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  averageAttempts: number;
  patternStats: {
    [key: string]: { attempted: number; correct: number; }
  };
}

export function ProgressDashboard() {
  const { user } = useAuth();
  const { shouldRefresh } = useProgress();
  const [userProgress, setUserProgress] = useState<Progress>({
    totalScore: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    averageAttempts: 0,
    patternStats: {
      numeric: { attempted: 0, correct: 0 },
      symbolic: { attempted: 0, correct: 0 },
      shape: { attempted: 0, correct: 0 },
      logical: { attempted: 0, correct: 0 }
    }
  });

  useEffect(() => {
    async function fetchProgress() {
      if (user) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${user.uid}`);
          const data = await response.json();
          if (data.progress) {
            setUserProgress(data.progress);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }
    }

    fetchProgress();
  }, [user, shouldRefresh]);

  const getSuccessRate = (correct: number, attempted: number) => {
    if (attempted === 0) return '0.0';
    return ((correct / attempted) * 100).toFixed(1);
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-500">Total Score</h3>
          <p className="text-2xl font-bold">{userProgress.totalScore}</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-500">Games Played</h3>
          <p className="text-2xl font-bold">{userProgress.gamesPlayed}</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-500">Success Rate</h3>
          <p className="text-2xl font-bold">
            {getSuccessRate(userProgress.correctAnswers, userProgress.gamesPlayed)}%
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-gray-500">Avg. Attempts</h3>
          <p className="text-2xl font-bold">{userProgress.averageAttempts.toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-bold mb-3">Pattern Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(userProgress.patternStats).map(([type, stats]) => (
            <div key={type} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="capitalize text-gray-500">{type}</h4>
              <p className="text-lg font-bold">
                {getSuccessRate(stats.correct, stats.attempted)}%
              </p>
              <p className="text-sm text-gray-500">
                {stats.correct}/{stats.attempted} correct
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 