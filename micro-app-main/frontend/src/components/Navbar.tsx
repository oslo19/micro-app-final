import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, LogOut } from 'lucide-react';

export function Navbar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-emerald-500" />
            <span className="ml-2 text-xl font-bold text-emerald-500">Pattern Master</span>
          </div>

          {/* Logout Button */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 