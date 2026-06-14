import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const SettingsDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    provider,
    setProvider,
    geminiKey,
    setGeminiKey,
    openaiKey,
    setOpenaiKey,
    keysConfigured,
    handleSaveSettings,
    themePalette,
    setThemePalette,
    stats,
    BACKEND_URL
  } = useApp();

  const [isCredentialsOpen, setIsCredentialsOpen] = useState(true);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);

  // SVG Trend Chart implementation
  const renderTrendChart = () => {
    if (!stats || !stats.improvement_trend || stats.improvement_trend.length === 0) {
      return (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
          No trend data available.
        </div>
      );
    }

    const data = stats.improvement_trend;
    const width = 300;
    const height = 110;
    const padding = 15;

    const getX = (index: number) => {
      if (data.length <= 1) return width / 2;
      return padding + (index / (data.length - 1)) * (width - 2 * padding);
    };

    const getY = (score: number) => {
      return height - padding - score * (height - 2 * padding);
    };

    const points = data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '6px', marginTop: '8px' }}>
        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="var(--border-color)" strokeWidth="1" />
        <line x1={padding} y1={getY(0.5)} x2={width - padding} y2={getY(0.5)} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1={padding} y1={getY(1)} x2={width - padding} y2={getY(1)} stroke="var(--border-color)" strokeWidth="1" />

        <text x={2} y={getY(1) + 4} fill="var(--text-muted)" fontSize="8">100%</text>
        <text x={2} y={getY(0.5) + 4} fill="var(--text-muted)" fontSize="8">50%</text>
        <text x={2} y={getY(0) + 4} fill="var(--text-muted)" fontSize="8">0%</text>

        {data.length > 1 ? (
          <>
            <polyline
              fill="none"
              stroke="var(--neon-cyan)"
              strokeWidth="2.2"
              points={points}
            />
            <polygon
              fill="rgba(0, 242, 254, 0.05)"
              points={`${getX(0)},${height - padding} ${points} ${getX(data.length - 1)},${height - padding}`}
            />
          </>
        ) : null}

        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.score)}
            r="4"
            fill={d.score >= 0.8 ? 'var(--neon-green)' : 'var(--neon-rose)'}
            stroke="var(--bg-primary)"
            strokeWidth="1.2"
          >
            <title>
              Commit: {d.hash.slice(0, 7)}&#10;Score: {(d.score * 100).toFixed(0)}%&#10;Prompt: {d.prompt}
            </title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className={`settings-drawer ${isDrawerOpen ? 'open' : ''}`} style={{ width: '360px', top: '56px' }}>
      <div className="settings-drawer-header" style={{ padding: '14px 20px' }}>
        <span className="settings-drawer-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.82rem' }}>
          Metrics & Settings
        </span>
        <button 
          className="btn-icon" 
          onClick={() => setIsDrawerOpen(false)} 
          style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', padding: '0', cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <div className="settings-drawer-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* API Keys Credentials */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: isCredentialsOpen ? '10px' : '0' }}
            onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>
              Credentials
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 'bold' }}>
              {isCredentialsOpen ? '▼' : '▶'}
            </span>
          </div>
          
          {isCredentialsOpen && (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Active Provider</label>
                <select
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value as 'gemini' | 'openai');
                    fetch(`${BACKEND_URL}/api/settings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: e.target.value, gemini_key: '', openai_key: '' })
                    });
                  }}
                  className="form-input"
                  style={{ background: 'var(--bg-primary)', borderRadius: '6px', height: '34px', fontSize: '0.78rem' }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>
                  Gemini API Key
                  {keysConfigured.gemini && <span style={{ color: 'var(--neon-green)', marginLeft: '6px', fontWeight: 'bold' }}>✓</span>}
                </label>
                <input
                  type="password"
                  placeholder={keysConfigured.gemini ? '••••••••••••••••' : 'Enter API Key'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="form-input"
                  style={{ borderRadius: '6px', height: '34px', fontSize: '0.78rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>
                  OpenAI API Key
                  {keysConfigured.openai && <span style={{ color: 'var(--neon-green)', marginLeft: '6px', fontWeight: 'bold' }}>✓</span>}
                </label>
                <input
                  type="password"
                  placeholder={keysConfigured.openai ? '••••••••••••••••' : 'Enter API Key'}
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  className="form-input"
                  style={{ borderRadius: '6px', height: '34px', fontSize: '0.78rem' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-neon-cyan" 
                style={{ marginTop: '6px', width: '100%', height: '36px', borderRadius: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: '0.78rem' }}
              >
                Save API Keys
              </button>
            </form>
          )}
        </div>

        {/* Theme Palette Customizer */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: isAppearanceOpen ? '10px' : '0' }}
            onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>
              Appearance
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 'bold' }}>
              {isAppearanceOpen ? '▼' : '▶'}
            </span>
          </div>

          {isAppearanceOpen && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Theme Palette</label>
              <select
                value={themePalette}
                onChange={e => setThemePalette(e.target.value as 'cyberpunk' | 'ocean' | 'emerald' | 'monochrome')}
                className="form-input"
                style={{ background: 'var(--bg-primary)', borderRadius: '6px', height: '34px', fontSize: '0.78rem' }}
              >
                <option value="cyberpunk">Cyberpunk Neon</option>
                <option value="ocean">Ocean Breeze</option>
                <option value="emerald">Forest Emerald</option>
                <option value="monochrome">Slate Monochrome</option>
              </select>
            </div>
          )}
        </div>

        {/* Project Analytics */}
        <div>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: isAnalyticsOpen ? '10px' : '0' }}
            onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.05em' }}>
              Project Analytics
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 'bold' }}>
              {isAnalyticsOpen ? '▼' : '▶'}
            </span>
          </div>

          {isAnalyticsOpen && (
            <>
              <div className="stats-grid" style={{ gap: '10px' }}>
                <div className="stat-card" style={{ padding: '10px', borderRadius: '8px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats ? stats.total_commits : 0}</div>
                  <div className="stat-label" style={{ fontSize: '0.62rem', fontWeight: 500 }}>Commits</div>
                </div>
                <div className="stat-card" style={{ padding: '10px', borderRadius: '8px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats ? `${(stats.success_rate * 100).toFixed(0)}%` : '0%'}</div>
                  <div className="stat-label" style={{ fontSize: '0.62rem', fontWeight: 500 }}>Success Rate</div>
                </div>
                <div className="stat-card" style={{ padding: '10px', borderRadius: '8px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats ? stats.avg_compression_ratio : '1.0'}x</div>
                  <div className="stat-label" style={{ fontSize: '0.62rem', fontWeight: 500 }}>Avg Compression</div>
                </div>
                <div className="stat-card" style={{ padding: '10px', borderRadius: '8px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats ? stats.tokens_saved : 0}</div>
                  <div className="stat-label" style={{ fontSize: '0.62rem', fontWeight: 500 }}>Tokens Saved</div>
                </div>
              </div>

              <div style={{ marginTop: '14px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  <span>Self-Correction Score Trend</span>
                  {stats && stats.avg_score && (
                    <span>Avg: {(stats.avg_score * 100).toFixed(0)}%</span>
                  )}
                </div>
                {renderTrendChart()}
              </div>
              
              {stats && stats.cost_saved > 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: 'var(--text-secondary)', textAlign: 'center', background: 'rgba(56, 239, 125, 0.05)', border: '1px dashed var(--neon-green)', padding: '8px', borderRadius: '6px', lineHeight: 1.35 }}>
                  Estimated LLM Costs Saved: <strong style={{ color: 'var(--neon-green)' }}>${stats.cost_saved.toFixed(5)}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
