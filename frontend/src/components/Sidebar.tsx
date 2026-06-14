import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { renderFileIcon, TimeIcon } from './Icons';

export const Sidebar: React.FC = () => {
  const {
    activeProject,
    sandboxFiles,
    activeFile,
    newFilePath,
    setNewFilePath,
    handleAddFile,
    handleDeleteFile,
    handleOpenFile,
    isViewingCommit,
    commits,
    selectedCommitHash,
    activeCommitHash,
    searchQuery,
    setQuery,
    searchResults,
    setSearchResults,
    handleCommitSearch,
    handleSelectCommit
  } = useApp();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  return (
    <div 
      className="sidebar-layout"
      style={{
        display: 'grid',
        gridTemplateRows: isWorkspaceOpen && isTimelineOpen 
          ? '1fr 1fr' 
          : isWorkspaceOpen 
            ? '1fr 38px' 
            : isTimelineOpen 
              ? '38px 1fr' 
              : '38px 38px',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Files Explorer container */}
      <div className="file-explorer-container" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div 
          className="glass-panel-header" 
          style={{ borderBottom: 'none', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
        >
          <span className="glass-panel-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Workspace
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            {isWorkspaceOpen && (
              <form onSubmit={handleAddFile} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="new.py"
                  value={newFilePath}
                  onChange={e => setNewFilePath(e.target.value)}
                  className="sidebar-input"
                  style={{ width: '80px', height: '22px', borderRadius: '4px', fontSize: '0.68rem', padding: '2px 6px' }}
                />
                <button 
                  type="submit" 
                  className="btn-icon" 
                  style={{ padding: '0 6px', height: '22px', fontSize: '0.68rem', borderRadius: '4px' }}
                >
                  +
                </button>
              </form>
            )}
            <button 
              className="btn-icon" 
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '2px', cursor: 'pointer' }}
            >
              {isWorkspaceOpen ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {isWorkspaceOpen && (
          <div className="glass-panel-body" style={{ padding: '4px 8px' }}>
            <div className="file-list" style={{ gap: '3px' }}>
              {Object.keys(sandboxFiles).length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 8px' }}>
                  Sandbox is empty. Create a file!
                </div>
              ) : (
                Object.keys(sandboxFiles).map(path => {
                  const isActiveFile = !isViewingCommit && activeFile === path;
                  return (
                    <div
                      key={path}
                      className={`file-item ${isActiveFile ? 'active' : ''}`}
                      onClick={() => handleOpenFile(path)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        marginBottom: '2px'
                      }}
                    >
                      <div className="file-info" style={{ gap: '8px' }}>
                        {renderFileIcon(path)}
                        <span style={{ fontSize: '0.78rem', fontFamily: 'Inter, sans-serif', fontWeight: isActiveFile ? 600 : 400 }}>{path}</span>
                      </div>
                      <button 
                        className="file-delete-btn" 
                        onClick={(e) => handleDeleteFile(path, e)}
                        style={{ padding: '2px', cursor: 'pointer' }}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom-Left: Commit History Timeline */}
      <div className="commit-timeline-container" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div 
          className="glass-panel-header" 
          style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span className="glass-panel-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem' }}>
              <TimeIcon />
              Commit Timeline
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
              {isTimelineOpen && (
                <form onSubmit={handleCommitSearch} style={{ display: 'flex', gap: '2px' }}>
                  <input
                    type="text"
                    placeholder="Search commits..."
                    value={searchQuery}
                    onChange={e => {
                      setQuery(e.target.value);
                      if (!e.target.value) setSearchResults([]);
                    }}
                    className="sidebar-input"
                    style={{ width: '90px', height: '22px', fontSize: '0.68rem', borderRadius: '4px', padding: '2px 6px' }}
                  />
                </form>
              )}
              <button 
                className="btn-icon" 
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '2px', cursor: 'pointer' }}
              >
                {isTimelineOpen ? (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {isTimelineOpen && (
          <div className="glass-panel-body" style={{ padding: '8px 12px' }}>
            <div className="vertical-commit-list" style={{ gap: '12px' }}>
              {commits.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                  No commits yet.
                </div>
              ) : (
                commits.map((commit) => {
                  const isRoot = commit.hash === `root-${activeProject}`;
                  const isSelected = commit.hash === selectedCommitHash;
                  const isActive = commit.hash === activeCommitHash;
                  const isSearchResult = searchResults.includes(commit.hash);
                  
                  let statusClass = 'success';
                  if (commit.status === 'failed') {
                    statusClass = 'failed';
                  }

                  return (
                    <div
                      key={commit.hash}
                      className={`vertical-commit-node ${statusClass} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectCommit(commit.hash)}
                      style={isSearchResult ? { border: '1px dashed var(--neon-amber)' } : {}}
                    >
                      <div className="vertical-commit-dot" style={{ marginTop: '5px' }} />
                      <div className="vertical-commit-info">
                        <div className="vertical-commit-header" style={{ fontSize: '0.72rem', gap: '6px' }}>
                          {isRoot ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--neon-cyan)', marginRight: '2px' }}>
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          ) : commit.status === 'success' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: 'var(--neon-green)', marginRight: '2px' }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: 'var(--neon-rose)', marginRight: '2px' }}>
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          <span style={{ fontWeight: 600 }}>{commit.hash.slice(0, 7)}</span>
                          {isActive && <span style={{ color: '#fbbf24', fontSize: '0.58rem', background: 'rgba(251,191,36,0.1)', padding: '3px 4px', borderRadius: '4px', fontWeight: 'bold' }}>HEAD</span>}
                          {!isRoot && <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{(commit.eval_score * 100).toFixed(0)}%</span>}
                        </div>
                        <div 
                          className="vertical-commit-message" 
                          title={commit.raw_prompt} 
                          style={{ 
                            fontSize: '0.72rem', 
                            marginTop: '4px', 
                            maxWidth: '200px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {commit.raw_prompt}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
