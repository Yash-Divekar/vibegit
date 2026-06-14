import React from 'react';
import { useApp } from '../context/AppContext';
import { SettingsIcon } from './Icons';

export const Header: React.FC = () => {
  const {
    isLightMode,
    setIsLightMode,
    activeProject,
    globalSearchVal,
    setGlobalSearchVal,
    globalMatches,
    setGlobalMatches,
    isSearchingGlobal,
    handleGlobalSearch,
    handleOpenFile,
    isDrawerOpen,
    setIsDrawerOpen,
    setShowProjectSelectorModal,
    isLeftPanelOpen,
    setIsLeftPanelOpen,
    isRightPanelOpen,
    setIsRightPanelOpen
  } = useApp();

  return (
    <header className="app-header" style={{ padding: '0 20px', height: '56px' }}>
      {/* Brand Logo Container (Logo image removed as requested) */}
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn-icon"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          title={isLeftPanelOpen ? "Collapse Left Panel" : "Expand Left Panel"}
          style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0 }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isLeftPanelOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
          </svg>
        </button>
        <span className="logo-text" style={{ fontSize: '1.4rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800 }}>
          VibeGit
        </span>
        <span className="logo-badge" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
          IDE Layer
        </span>
      </div>

      {/* Global Search in Header Middle */}
      <div className="header-search-container" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 45 }}>
        <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              placeholder="Search text in files..."
              value={globalSearchVal}
              onChange={e => {
                setGlobalSearchVal(e.target.value);
                if (!e.target.value) setGlobalMatches([]);
              }}
              className="header-search-input"
              style={{
                borderRadius: '8px',
                padding: '6px 30px 6px 12px',
                height: '32px',
                fontSize: '0.78rem',
                width: '100%'
              }}
            />
            {globalSearchVal && (
              <button
                type="button"
                onClick={() => { setGlobalSearchVal(''); setGlobalMatches([]); }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            )}
          </div>
          <button 
            type="submit" 
            className="btn btn-neon-cyan" 
            style={{ padding: '0 12px', height: '32px', fontSize: '0.78rem', borderRadius: '8px' }}
          >
            Search
          </button>

          {/* Global Search Matches Floating Panel */}
          {globalSearchVal && globalMatches.length > 0 && (
            <div className="header-search-results-overlay" style={{ width: '400px', top: '38px', borderRadius: '10px', boxShadow: '0 12px 35px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '8px 12px', fontSize: '0.68rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                SEARCH RESULTS ({globalMatches.length})
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {globalMatches.map((match, idx) => (
                  <div
                    key={idx}
                    className="header-search-result-item"
                    onClick={() => {
                      handleOpenFile(match.file_path);
                      setGlobalSearchVal('');
                      setGlobalMatches([]);
                    }}
                    style={{ padding: '10px 14px' }}
                  >
                    <div className="search-result-file" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span>{match.file_path}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>Line {match.line_number}</span>
                    </div>
                    <div className="search-result-match" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {match.line_content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {globalSearchVal && !isSearchingGlobal && globalMatches.length === 0 && (
            <div className="header-search-results-overlay" style={{ width: '400px', top: '38px', padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderRadius: '10px' }}>
              No matches found in project files.
            </div>
          )}
        </form>
      </div>

      {/* Header Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Light/Dark Mode Toggle */}
        <button
          className="btn-icon"
          onClick={() => setIsLightMode(!isLightMode)}
          title="Toggle Light/Dark Theme"
          style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0 }}
        >
          {isLightMode ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          )}
        </button>

        {/* Project Switcher Pill */}
        <button
          className="project-header-pill"
          onClick={() => setShowProjectSelectorModal(true)}
          title="Switch Workspace Project"
          style={{
            height: '32px',
            borderRadius: '9999px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600,
            padding: '4px 14px'
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '8px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Project: <strong style={{ color: 'var(--neon-cyan)' }}>{activeProject}</strong></span>
        </button>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', userSelect: 'none' }}>|</span>

        {/* Settings Toggle Button */}
        <button 
          className="btn btn-neon-cyan" 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          style={{ height: '32px', padding: '0 14px', borderRadius: '8px', fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
        >
          <SettingsIcon />
          Metrics & Keys
        </button>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', userSelect: 'none' }}>|</span>

        {/* Right Sidebar toggle */}
        <button
          className="btn-icon"
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          title={isRightPanelOpen ? "Collapse Right Panel" : "Expand Right Panel"}
          style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0 }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isRightPanelOpen ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
        </button>
      </div>
    </header>
  );
};
