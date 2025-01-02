import { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import googleIcon from '../assets/google.png';

// Update the API URL handling
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Updated API URL
      await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          provider: 'email'
        })
      });

      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else {
        setError(error.message);
      }
    }
  };

  const saveUserToMongoDB = async (uid: string, email: string, displayName: string | null, provider: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          email,
          displayName,
          provider
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user to MongoDB:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Configure custom parameters
      provider.setCustomParameters({
        prompt: 'select_account',
        display: 'popup'
      });
      
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const user = result.user;
      
      // Add error handling for the fetch request
      try {
        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            provider: 'google',
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        navigate('/');
      } catch (fetchError) {
        console.error('Error saving user data:', fetchError);
        setError('Failed to save user data. Please try again.');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError(error.message || 'Failed to login with Google');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 text-white py-2 rounded hover:bg-emerald-600"
          >
            Login
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <img src={googleIcon} alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-emerald-500 hover:text-emerald-600">
            Register
          </a>
        </p>
      </div>
    </div>
  );
} 

