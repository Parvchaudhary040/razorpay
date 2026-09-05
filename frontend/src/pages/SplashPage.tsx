import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const SplashPage: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const duration = 2800; // total animation time in ms
    const interval = 20;   // update every 20ms
    const step = 100 / (duration / interval);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        // Start fade-out, then navigate
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => navigate('/welcome', { replace: true }), 600);
        }, 400);
      }
      setProgress(Math.min(current, 100));
    }, interval);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div
      className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}
    >
      {/* Animated background particles */}
      <div className="splash-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="splash-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
            }}
          />
        ))}
      </div>

      {/* Radial glow behind the title */}
      <div
        className="splash-glow"
        style={{ opacity: progress / 100 }}
      />

      {/* Main content */}
      <div className="splash-content">
        {/* Logo icon */}
        <div
          className="splash-icon"
          style={{
            opacity: Math.min(progress / 30, 1),
            transform: `scale(${0.5 + (Math.min(progress, 30) / 30) * 0.5})`,
          }}
        >
          ⚡
        </div>

        {/* Title with clip-path reveal */}
        <h1 className="splash-title">
          <span
            className="splash-title-text"
            style={{
              clipPath: `inset(0 ${100 - progress}% 0 0)`,
            }}
          >
            COMMERCE AI
          </span>
          <span className="splash-title-ghost">COMMERCE AI</span>
        </h1>

        {/* Subtitle */}
        <p
          className="splash-subtitle"
          style={{
            opacity: Math.max(0, (progress - 40) / 60),
            transform: `translateY(${Math.max(0, 20 - (Math.max(0, progress - 40) / 60) * 20)}px)`,
          }}
        >
          AI-Powered Commerce Platform
        </p>

        {/* Progress bar */}
        <div className="splash-progress-container">
          <div className="splash-progress-track">
            <div
              className="splash-progress-bar"
              style={{ width: `${progress}%` }}
            />
            <div
              className="splash-progress-glow"
              style={{ left: `${progress}%` }}
            />
          </div>
          <span className="splash-progress-text">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};
