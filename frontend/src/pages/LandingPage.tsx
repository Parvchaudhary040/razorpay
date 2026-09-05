import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Data ── */

const stats = [
  { value: '10+', label: 'AI Agents' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<200ms', label: 'Avg Response' },
  { value: '256-bit', label: 'Encryption' },
];

const roadmapSteps = [
  {
    step: '01',
    icon: '💬',
    title: 'Describe What You Need',
    desc: 'Tell our AI assistant what you\'re looking for in plain language — "I need wireless earbuds under ₹2,000" or "Compare the top-rated laptops."',
    color: '#818cf8',
  },
  {
    step: '02',
    icon: '🔍',
    title: 'AI Discovers & Compares',
    desc: 'The Discovery Agent searches the catalog, filters by your criteria, and presents curated options with price comparisons and specs.',
    color: '#a78bfa',
  },
  {
    step: '03',
    icon: '🛒',
    title: 'Smart Cart Management',
    desc: 'Add items to your cart through conversation. The Checkout Agent handles quantities, applies offers, and validates inventory in real-time.',
    color: '#c084fc',
  },
  {
    step: '04',
    icon: '🔒',
    title: 'Policy Engine Validates',
    desc: 'Before any action executes, the Policy Engine verifies RBAC permissions, ownership rules, and inventory constraints — blocking unauthorized operations.',
    color: '#e879f9',
  },
  {
    step: '05',
    icon: '💳',
    title: 'Secure Razorpay Checkout',
    desc: 'Complete your purchase with Razorpay\'s PCI-DSS compliant payment gateway. Every transaction is encrypted and verified end-to-end.',
    color: '#f472b6',
  },
  {
    step: '06',
    icon: '📊',
    title: 'Full Audit Trail',
    desc: 'Every interaction — from your first query to final payment — is logged with agent_run_id tracing for complete transparency and compliance.',
    color: '#fb923c',
  },
];

const features = [
  {
    icon: '🤖',
    title: 'Multi-Agent Architecture',
    desc: 'A Commerce Supervisor orchestrates specialized Discovery and Checkout agents, each with scoped tools and permissions.',
    details: ['Intent classification', 'Context-aware routing', 'Parallel tool execution'],
  },
  {
    icon: '🛡️',
    title: 'Zero-Trust Security',
    desc: 'Every tool call passes through a deterministic Policy Engine that enforces RBAC, ownership validation, and rate limits.',
    details: ['JWT authentication', 'Role-based access', 'Prompt injection defense'],
  },
  {
    icon: '⚡',
    title: 'Razorpay Payments',
    desc: 'Native integration with Razorpay for seamless order creation, payment capture, and webhook-driven status updates.',
    details: ['PCI-DSS compliant', 'Webhook verification', 'Idempotent captures'],
  },
  {
    icon: '📈',
    title: 'Real-Time Observability',
    desc: 'Structured logging traces every request from user input through agent reasoning to tool execution and response.',
    details: ['Request ID tracking', 'Agent run correlation', 'Performance metrics'],
  },
  {
    icon: '🧠',
    title: 'Gemini-Powered Intelligence',
    desc: 'Built on Google\'s Gemini models via LangChain for natural language understanding, product reasoning, and conversational flow.',
    details: ['Semantic search', 'Context memory', 'Graceful fallback'],
  },
  {
    icon: '🗄️',
    title: 'Production-Grade Stack',
    desc: 'PostgreSQL with pgvector for data and embeddings, Redis for caching, Express for APIs — battle-tested infrastructure.',
    details: ['Connection pooling', 'Graceful degradation', 'Auto-reconnect'],
  },
];

/* ── Component ── */

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id || entry.target.getAttribute('data-step-id');
          if (!id) return;
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(id));
          } else {
            setVisibleSections((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="landing-page">
      <div className="landing-grid" />
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />

      {/* Sticky Navigation */}
      <nav className="landing-nav">
        <button
          className="landing-nav-brand"
          onClick={() => navigate('/splash')}
        >
          ⚡ CommerceAI
        </button>
        <div className="landing-nav-links">
          <button
            className="landing-nav-link"
            onClick={() =>
              document
                .getElementById('how-it-works')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            How It Works
          </button>
          <button
            className="landing-nav-link"
            onClick={() =>
              document
                .getElementById('features')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Features
          </button>
          <button
            className="landing-nav-link"
            onClick={() =>
              document
                .getElementById('showcase')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Featured
          </button>
          <button
            className="landing-nav-signin"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className={`landing-hero ${visible ? 'landing-visible' : ''}`}>
        <h1 className="landing-heading">
          Shop Smarter with
          <br />
          <span className="landing-heading-accent">Conversational AI</span>
        </h1>

        <p className="landing-description">
          CommerceAI is a full-stack, multi-agent commerce platform where every
          interaction — from product discovery to payment — is powered by
          intelligent AI agents secured behind a deterministic policy engine.
          No buttons to hunt. No filters to set. Just tell us what you need.
        </p>

        <div className="landing-cta-group">
          <button
            className="landing-cta-primary"
            onClick={() => navigate('/login')}
          >
            Start Shopping with AI
            <svg className="landing-cta-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button
            className="landing-cta-secondary"
            onClick={() =>
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            See How It Works
          </button>
        </div>

        {/* Stats row */}
        <div className="landing-stats">
          {stats.map((s) => (
            <div key={s.label} className="landing-stat">
              <span className="landing-stat-value">{s.value}</span>
              <span className="landing-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS — ROADMAP ─── */}
      <section
        id="how-it-works"
        data-animate
        className="landing-roadmap-section"
      >
        <h2 className={`landing-section-title ${isVisible('how-it-works') ? 'landing-visible' : ''}`}>
          How It Works
        </h2>
        <p className={`landing-section-subtitle ${isVisible('how-it-works') ? 'landing-visible' : ''}`}>
          From your first message to order confirmation — here's the journey every request takes
          through our multi-agent pipeline.
        </p>

        <div className="landing-roadmap">
          {/* Vertical connecting line */}
          <div className="landing-roadmap-line" />

          {roadmapSteps.map((step, i) => {
            const stepId = `roadmap-step-${i}`;
            return (
              <div
                key={step.step}
                data-animate
                data-step-id={stepId}
                className={`landing-roadmap-item ${
                  isVisible(stepId) ? 'landing-visible' : ''
                } ${i % 2 === 0 ? 'roadmap-left' : 'roadmap-right'}`}
              >
                {/* Node on the timeline */}
              <div
                className="landing-roadmap-node"
                style={{ background: step.color, boxShadow: `0 0 20px ${step.color}40` }}
              >
                <span className="landing-roadmap-node-step">{step.step}</span>
              </div>

              {/* Card */}
              <div className="landing-roadmap-card">
                <div className="landing-roadmap-icon">{step.icon}</div>
                <h3 className="landing-roadmap-title">{step.title}</h3>
                <p className="landing-roadmap-desc">{step.desc}</p>
              </div>
            </div>
          );
        })}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" data-animate className="landing-features">
        <h2 className={`landing-section-title ${isVisible('features') ? 'landing-visible' : ''}`}>
          Built for Production
        </h2>
        <p className={`landing-section-subtitle ${isVisible('features') ? 'landing-visible' : ''}`}>
          Every component is designed for reliability, security, and scale — not just demos.
        </p>

        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`landing-feature-card ${isVisible('features') ? 'landing-visible' : ''}`}
              style={{ transitionDelay: `${300 + i * 120}ms` }}
            >
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
              <ul className="landing-feature-details">
                {f.details.map((d) => (
                  <li key={d}>
                    <span className="landing-feature-check">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS SHOWCASE ─── */}
      <section id="showcase" data-animate className="landing-showcase-section">
        <h2 className={`landing-section-title ${isVisible('showcase') ? 'landing-visible' : ''}`}>
          Curated For You
        </h2>
        <p className={`landing-section-subtitle ${isVisible('showcase') ? 'landing-visible' : ''}`}>
          Discover premium products with just a conversation. Our AI matches your exact needs with our catalog.
        </p>

        <div className="landing-showcase-grid">
          <div className={`landing-showcase-card ${isVisible('showcase') ? 'landing-visible' : ''}`} style={{ transitionDelay: '200ms' }}>
            <div className="landing-showcase-img-container">
              <img src="/macbook_pro.jpg" alt="Apple MacBook Pro 16" className="landing-showcase-img" />
              <div className="landing-showcase-badge">Best Seller</div>
            </div>
            <div className="landing-showcase-info">
              <h3 className="landing-showcase-title">Apple MacBook Pro 16 (M3 Max)</h3>
              <p className="landing-showcase-price">₹3,49,900</p>
            </div>
          </div>

          <div className={`landing-showcase-card ${isVisible('showcase') ? 'landing-visible' : ''}`} style={{ transitionDelay: '350ms' }}>
            <div className="landing-showcase-img-container">
              <img src="/iphone_15.jpg" alt="Apple iPhone 15 Pro Max" className="landing-showcase-img" />
              <div className="landing-showcase-badge">New Arrival</div>
            </div>
            <div className="landing-showcase-info">
              <h3 className="landing-showcase-title">Apple iPhone 15 Pro Max</h3>
              <p className="landing-showcase-price">₹1,59,900</p>
            </div>
          </div>

          <div className={`landing-showcase-card ${isVisible('showcase') ? 'landing-visible' : ''}`} style={{ transitionDelay: '500ms' }}>
            <div className="landing-showcase-img-container">
              <img src="/iphone_17.jpg" alt="Apple iPhone 17 Concept" className="landing-showcase-img" />
              <div className="landing-showcase-badge">Concept</div>
            </div>
            <div className="landing-showcase-info">
              <h3 className="landing-showcase-title">Apple iPhone 17</h3>
              <p className="landing-showcase-price">Coming Soon</p>
            </div>
          </div>

          <div className={`landing-showcase-card ${isVisible('showcase') ? 'landing-visible' : ''}`} style={{ transitionDelay: '650ms' }}>
            <div className="landing-showcase-img-container">
              <img src="/samsung_s26.jpg" alt="Samsung Galaxy S26 Ultra Concept" className="landing-showcase-img" />
              <div className="landing-showcase-badge">Concept</div>
            </div>
            <div className="landing-showcase-info">
              <h3 className="landing-showcase-title">Samsung Galaxy S26 Ultra</h3>
              <p className="landing-showcase-price">Coming Soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer-bar">
        <span className="landing-footer-brand">⚡ CommerceAI</span>
        <div className="landing-footer-links">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top</button>
          <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
        </div>
        <span className="landing-footer-copy">
          © {new Date().getFullYear()} CommerceAI — AI-Powered Commerce
        </span>
      </footer>
    </div>
  );
};
