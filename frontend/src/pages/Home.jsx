import { Link } from "react-router-dom";

function Home() {
  const features = [
    {
      icon: "📄",
      title: "Smart Documents",
      description:
        "Create, edit and collaborate on documents with real-time updates.",
    },
    {
      icon: "📁",
      title: "Project Management",
      description:
        "Organize projects, track progress and keep your team aligned.",
    },
    {
      icon: "🤖",
      title: "AI Assistant",
      description:
        "Generate summaries, improve writing and boost productivity.",
    },
    {
      icon: "⚡",
      title: "Real-Time Collaboration",
      description:
        "Work together instantly with live updates and synchronization.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">CollabSpace</h1>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 opacity-70" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
            Build.
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {" "}Collaborate.
            </span>
            <br />
            Ship Faster.
          </h1>

          <p className="mt-8 text-lg text-slate-400 max-w-3xl mx-auto">
            A modern collaborative workspace where teams manage projects,
            create documents, track tasks and work together in real time.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
            >
              Start Collaborating
            </Link>

            <Link
              to="/login"
              className="px-8 py-4 rounded-2xl border border-slate-700 hover:border-slate-500 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold">
            Everything your team needs
          </h2>

          <p className="text-slate-400 mt-4">
            Powerful tools designed for collaboration and productivity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>

              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>

              <p className="text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold">
            How it works
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            "Create a project",
            "Invite your team",
            "Collaborate in real time",
          ].map((step, index) => (
            <div
              key={step}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-600 flex items-center justify-center font-bold mb-4">
                {index + 1}
              </div>

              <h3 className="text-xl font-semibold">
                {step}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 p-12 text-center">
          <h2 className="text-4xl font-bold">
            Ready to build together?
          </h2>

          <p className="mt-4 text-slate-100">
            Start managing projects and collaborating with your team today.
          </p>

          <Link
            to="/register"
            className="inline-block mt-8 px-8 py-4 rounded-2xl bg-white text-black font-semibold"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">CollabSpace</h3>
            <p className="text-slate-400 mt-2">
              Build. Collaborate. Ship Faster.
            </p>
          </div>

          <div className="text-slate-400">
            © 2026 CollabSpace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;