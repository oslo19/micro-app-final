interface UserProgress {
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  averageAttempts: number;
}

export function saveProgress(score: number, attempts: number, isCorrect: boolean) {
  const savedProgress = localStorage.getItem('patternProgress');
  const progress: UserProgress = savedProgress ? JSON.parse(savedProgress) : {
    totalScore: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    averageAttempts: 0
  };

  progress.totalScore += score;
  progress.gamesPlayed += 1;
  if (isCorrect) progress.correctAnswers += 1;
  
  const totalAttempts = (progress.averageAttempts * (progress.gamesPlayed - 1)) + attempts;
  progress.averageAttempts = totalAttempts / progress.gamesPlayed;

  localStorage.setItem('patternProgress', JSON.stringify(progress));
  return progress;
}

export function getProgress(): UserProgress | null {
  const savedProgress = localStorage.getItem('patternProgress');
  return savedProgress ? JSON.parse(savedProgress) : null;
} 