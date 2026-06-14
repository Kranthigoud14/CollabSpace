function AuthLayout({ children, subtitle }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute bottom-20 right-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white">
              CollabSpace
            </h1>

            <p className="text-slate-400 mt-3">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;