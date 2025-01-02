import { useState } from 'react';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [passwordStrength, setPasswordStrength] = useState({
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isLongEnough: false
  });

  const validatePassword = (password: string) => {
    setPasswordStrength({
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isLongEnough: password.length >= 8
    });
  };

  const isPasswordValid = () => {
    return Object.values(passwordStrength).every(Boolean);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    if (!isPasswordValid()) {
      setError("Password doesn't meet security requirements");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user in MongoDB
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: email.split('@')[0],
          provider: 'email',
          progress: {
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
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create user in database');
      }

      setSuccess('Account created successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePassword(e.target.value);
              }}
              className="w-full p-2 border rounded"
              required
            />
            <div className="mt-2 text-sm">
              <p className={passwordStrength.isLongEnough ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least 8 characters
              </p>
              <p className={passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least one uppercase letter
              </p>
              <p className={passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least one lowercase letter
              </p>
              <p className={passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least one number
              </p>
              <p className={passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least one special character
              </p>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 text-white py-2 rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-500 hover:text-emerald-600">
            Login
          </a>
        </p>
      </div>
    </div>
  );
} 