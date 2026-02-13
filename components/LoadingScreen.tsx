"use client";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Outer rotating circle */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-500 animate-spin" style={{ width: '100px', height: '100px' }}></div>
            
            {/* Inner rotating circle (opposite direction) */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-pink-500 border-l-pink-500 animate-spin" style={{ width: '100px', height: '100px', animationDirection: 'reverse' }}></div>
            
            {/* Logo icon in center */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl relative z-10">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Smart Bookmark
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-8">
            Preparing your bookmarks...
          </p>

          {/* Animated dots */}
          <div className="flex gap-2 justify-center mb-8">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          {/* Loading bar */}
          <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="mt-12 space-y-2">
          <div className="w-32 h-1 bg-gradient-to-r from-blue-500/30 to-transparent rounded-full mx-auto"></div>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500/20 to-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
