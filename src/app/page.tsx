import Link from "next/link";

const PLANS = [
  {
    name: "Trial",
    price: "Free",
    description: "Try it out",
    features: ["1 URL (lifetime)", "AI-powered extraction", "CSV export"],
    cta: "Start Free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Basic",
    price: "$9",
    period: "/month",
    description: "For individuals",
    features: ["1 URL/day", "AI-powered extraction", "CSV & Excel export", "Crawl history"],
    cta: "Get Basic",
    href: "/register",
    highlight: false,
  },
  {
    name: "Plus",
    price: "$29",
    period: "/month",
    description: "For professionals",
    features: ["10 URLs/day", "AI-powered extraction", "CSV & Excel export", "Scheduled crawls", "Crawl history"],
    cta: "Get Plus",
    href: "/register",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For teams & power users",
    features: ["Unlimited URLs/day", "AI-powered extraction", "CSV & Excel export", "Scheduled crawls", "Priority processing", "Crawl history"],
    cta: "Get Pro",
    href: "/register",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 8h6M9 16h4" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">CrawData</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
          Powered by Gemini AI
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Extract data from<br />
          <span className="text-primary-600">any website</span> with AI
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Just paste a URL and describe what you want. CrawData uses Google Gemini to intelligently extract structured data and export it as CSV or Excel.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-primary-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-700 transition-colors text-lg shadow-sm"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-lg"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Paste a URL", desc: "Enter any website URL you want to extract data from." },
            { step: "2", title: "Describe what you need", desc: "Tell CrawData what data to extract in plain English." },
            { step: "3", title: "Download your data", desc: "Get a clean CSV or Excel file ready for analysis." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Simple pricing</h2>
          <p className="text-gray-600 text-center mb-12">Start free, upgrade when you need more.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? "bg-primary-600 text-white shadow-xl scale-105"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
              >
                <div className="mb-4">
                  <div className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-primary-200" : "text-primary-600"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className={`text-sm mb-1 ${plan.highlight ? "text-primary-200" : "text-gray-500"}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${plan.highlight ? "text-primary-100" : "text-gray-500"}`}>
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-primary-100" : "text-gray-600"}`}>
                      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-white" : "text-primary-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-white text-primary-600 hover:bg-primary-50"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} CrawData. Built with Next.js &amp; Gemini AI.</p>
      </footer>
    </div>
  );
}
