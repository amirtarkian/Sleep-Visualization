import { useAuth } from '../../hooks/useAuth';

export function SignIn() {
  const { signInWithApple, error, clearError } = useAuth();
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">&#127769;</div>
      <h1 className="text-3xl font-bold text-white mb-2">SleepViz</h1>
      <p className="text-white/40 mb-8">Your personalized sleep dashboard</p>
      <button
        onClick={() => { clearError(); signInWithApple(); }}
        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
      >
        Sign in with Apple
      </button>
      {error && (
        <p className="mt-4 text-sm text-red-400 max-w-xs text-center">{error}</p>
      )}
    </div>
  );
}
