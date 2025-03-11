import { Rocket, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoonPage = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6"
      style={{ backgroundColor: '#090014' }}
    >
      {/* Simple Centered Card */}
      <div className="shadow-button-inset border border-borderStroke rounded-xl p-10 backdrop-blur-sm bg-searchBg bg-opacity-10 max-w-md w-full text-center">
        <Rocket className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />

        <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">Coming Soon</h1>

        <div className="w-24 h-1 bg-primary mx-auto mb-6 rounded-full"></div>

        <button
          onClick={handleBackToHome}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 text-white font-medium py-3 px-6 rounded-lg transition-colors mx-auto mt-8"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default ComingSoonPage;
