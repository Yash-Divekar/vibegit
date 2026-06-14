import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const stripAnsi = (str: string | null | undefined): string => {
  if (!str) return '';
  // eslint-disable-next-line no-control-regex
  const clean = str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  return clean.replace(/\[\d{1,2}m/g, '');
};

const TruncatedText: React.FC<{ text: string; maxLength?: number }> = ({ text, maxLength = 180 }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (text.length <= maxLength) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  }

  const shownText = isExpanded ? text : `${text.slice(0, maxLength)}`;

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {shownText}
      {!isExpanded && '...'}
      <button 
        type="button"
        className="see-more-link"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? 'See less' : 'See more'}
      </button>
    </span>
  );
};

export const EditorArea: React.FC = () => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  
  const {
    isViewingCommit,
    selectedCommitHash,
    openTabs,
    activeFile,
    setActiveFile,
    handleCloseTab,
    selectedDiff,
    handleRollback,
    commits,
    isEditingFile,
    setIsEditingFile,
    activeFileContent,
    setActiveFileContent,
    handleSaveFileContent,
    fetchSandbox,
    setIsViewingCommit,
    terminalCommand,
    setTerminalCommand,
    terminalOutput,
    isTerminalOpen,
    setIsTerminalOpen,
    isTerminalRunning,
    runTerminalCommand,
    clearTerminal
  } = useApp();

  const selectedCommit = Array.isArray(commits) ? commits.find(c => c.hash === selectedCommitHash) : undefined;

  useEffect(() => {
    if (isTerminalOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput, isTerminalOpen]);

  return (
    <div className="middle-column">
      {/* Tabs Bar */}
      <div className="editor-tabs-bar" style={{ height: '38px', padding: '0 10px', gap: '6px' }}>
        {isViewingCommit ? (
          <div className="editor-tab active" style={{ height: '30px', padding: '0 12px', borderRadius: '6px' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--neon-cyan)', marginRight: '4px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Diff: {selectedCommitHash.slice(0, 7)}</span>
            <span 
              onClick={() => setIsViewingCommit(false)} 
              style={{ marginLeft: '6px', cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem' }}
              title="Close Diff View"
            >
              ×
            </span>
          </div>
        ) : (
          openTabs.map(tabPath => {
            const isActiveTab = activeFile === tabPath;
            return (
              <div
                key={tabPath}
                className={`editor-tab ${isActiveTab ? 'active' : ''}`}
                onClick={() => {
                  setActiveFile(tabPath);
                  setIsEditingFile(false);
                }}
                style={{ height: '30px', padding: '0 12px', borderRadius: '6px' }}
              >
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: isActiveTab ? 600 : 400 }}>{tabPath}</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); handleCloseTab(tabPath); }} 
                  style={{ marginLeft: '6px', cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem' }}
                >
                  ×
                </span>
              </div>
            );
          })
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Diff View Panel */}
        {isViewingCommit ? (
          <div className="diff-editor-container">
            <div className="diff-header-bar" style={{ padding: '10px 16px' }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>
                Commit Diff: <strong style={{ color: 'var(--text-primary)' }}>{selectedCommitHash}</strong>
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-neon-cyan"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
                  onClick={() => handleRollback(selectedCommitHash)}
                >
                  Rollback to this snapshot
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
                  onClick={() => setIsViewingCommit(false)}
                >
                  Close Diff
                </button>
              </div>
            </div>

            {selectedCommit && (
              <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>COMMIT INSIGHTS</span>
                  <span style={{
                    color: selectedCommit.status === 'success' ? 'var(--neon-green)' : 'var(--neon-rose)',
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                    background: selectedCommit.status === 'success' ? 'rgba(56, 239, 125, 0.08)' : 'rgba(255, 8, 68, 0.08)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${selectedCommit.status === 'success' ? 'rgba(56,239,125,0.2)' : 'rgba(255,8,68,0.2)'}`
                  }}>
                    {selectedCommit.status.toUpperCase()} ({(selectedCommit.eval_score * 100).toFixed(0)}% SCORE)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Duration</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedCommit.duration_ms}ms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tokens Saved</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neon-purple)', marginTop: '2px' }}>{selectedCommit.tokens_before - selectedCommit.tokens_after} ({((1 - (selectedCommit.tokens_after / (selectedCommit.tokens_before || 1))) * 100).toFixed(0)}%)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Token Ratio</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neon-cyan)', marginTop: '2px' }}>{(selectedCommit.tokens_before / (selectedCommit.tokens_after || 1)).toFixed(1)}x Compression</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Cost</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neon-green)', marginTop: '2px' }}>${selectedCommit.cost.toFixed(5)}</div>
                  </div>
                </div>

                {/* Raw Prompt */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>User Request Prompt:</div>
                  <div style={{ color: 'var(--text-primary)', lineHeight: 1.45, background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.78rem', border: '1px solid var(--border-color)', wordBreak: 'break-all' }}>
                    <TruncatedText text={stripAnsi(selectedCommit.raw_prompt)} />
                  </div>
                </div>


                {/* Optimized Prompt Collapsible */}
                {selectedCommit.optimized_prompt && (
                  <details className="collapsible-details">
                    <summary className="details-summary">
                      <span>View Optimized Context Prompt</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--neon-purple)', textTransform: 'none' }}>▶ Expand prompt</span>
                    </summary>
                    <div className="details-content-box" style={{ maxHeight: '150px' }}>
                      {stripAnsi(selectedCommit.optimized_prompt)}
                    </div>
                  </details>
                )}

                {/* Self-Correction Logs & Feedback Collapsible */}
                {selectedCommit.eval_feedback && (
                  <details className="collapsible-details" open={selectedCommit.status !== 'success' ? true : undefined}>
                    <summary className="details-summary">
                      <span>View Self-Correction Logs & Feedback</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--neon-rose)', textTransform: 'none' }}>▶ Expand logs</span>
                    </summary>
                    <div className="details-content-box" style={{ maxHeight: '150px' }}>
                      {stripAnsi(selectedCommit.eval_feedback)}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!selectedDiff || Object.keys(selectedDiff.diffs).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No code files modified in this commit snapshot.
                </div>
              ) : (
                Object.entries(selectedDiff.diffs).map(([path, diffData]) => (
                  <div key={path} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="diff-header-bar" style={{ background: 'var(--bg-secondary)', padding: '8px 16px' }}>
                      <span>File: <strong style={{ color: 'var(--text-primary)' }}>{path}</strong></span>
                      <span className="logo-badge" style={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: diffData.status === 'added' ? 'var(--neon-green)' : diffData.status === 'deleted' ? 'var(--neon-rose)' : 'var(--neon-cyan)',
                        borderColor: diffData.status === 'added' ? 'rgba(56,239,125,0.2)' : diffData.status === 'deleted' ? 'rgba(255,8,68,0.2)' : 'rgba(0,242,254,0.2)'
                      }}>{diffData.status}</span>
                    </div>
                    <div className="diff-body" style={{ padding: '8px 0' }}>
                      {diffData.lines.map((line, idx) => (
                        <div key={idx} className={`diff-line ${line.type}`} style={{ padding: '1px 16px' }}>
                          <span className="diff-line-num" style={{ fontSize: '0.72rem' }}>{idx + 1}</span>
                          <span className="diff-line-content" style={{ fontSize: '0.78rem' }}>{line.content || ' '}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // Active code editor view
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {activeFile ? (
              <>
                <div className="diff-header-bar" style={{ padding: '10px 16px' }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>File: <strong style={{ color: 'var(--text-primary)' }}>{activeFile}</strong></span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditingFile ? (
                      <>
                        <button className="btn btn-neon-cyan" style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 600 }} onClick={handleSaveFileContent}>Save</button>
                        <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 600 }} onClick={() => { setIsEditingFile(false); fetchSandbox(); }}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn btn-neon-purple" style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 600 }} onClick={() => setIsEditingFile(true)}>Edit Code</button>
                    )}
                  </div>
                </div>
                <textarea
                  value={activeFileContent}
                  onChange={e => setActiveFileContent(e.target.value)}
                  readOnly={!isEditingFile}
                  className="code-editor-textarea"
                  style={{ opacity: isEditingFile ? 1 : 0.88, padding: '20px', fontSize: '0.82rem' }}
                />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', flexDirection: 'column', gap: '16px', padding: '32px' }}>
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.35 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
                  Double click a file in Left Explorer to open, or run a vibe prompt to generate new files.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Terminal Console */}
      <div 
        className="terminal-panel" 
        style={{
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          height: isTerminalOpen ? '260px' : '38px',
          overflow: 'hidden',
          zIndex: 30
        }}
      >

        {/* Terminal Header */}
        <div 
          className="glass-panel-header" 
          style={{
            minHeight: '38px',
            height: '38px',
            padding: '0 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
            borderBottom: isTerminalOpen ? '1px solid var(--border-color)' : 'none'
          }}
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--neon-green)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              Terminal Console
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
            {isTerminalOpen && (
              <>
                {activeFile && (
                  <button 
                    className="btn btn-neon-cyan"
                    onClick={() => {
                      if (activeFile.endsWith('.py')) {
                        runTerminalCommand(`python ${activeFile}`);
                      } else if (activeFile.endsWith('.js') || activeFile.endsWith('.jsx')) {
                        runTerminalCommand(`node ${activeFile}`);
                      } else if (activeFile.endsWith('.ts') || activeFile.endsWith('.tsx')) {
                        runTerminalCommand(`npx tsx ${activeFile}`);
                      }
                    }}
                    style={{ padding: '2px 10px', fontSize: '0.68rem', height: '22px', borderRadius: '4px' }}
                    title={`Execute active file ${activeFile} directly`}
                  >
                    Run Active File
                  </button>
                )}
                <button 
                  className="btn btn-neon-purple"
                  onClick={() => runTerminalCommand(terminalCommand)}
                  disabled={isTerminalRunning || !terminalCommand.trim()}
                  style={{ padding: '2px 10px', fontSize: '0.68rem', height: '22px', borderRadius: '4px' }}
                >
                  {isTerminalRunning ? 'Running...' : 'Run Command'}
                </button>
                <button 
                  className="btn-icon" 
                  onClick={clearTerminal}
                  style={{ padding: '2px 6px', height: '22px', fontSize: '0.68rem', borderRadius: '4px' }}
                  title="Clear Console Output"
                >
                  Clear
                </button>
              </>
            )}
            <button 
              className="btn-icon" 
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '2px', cursor: 'pointer' }}
            >
              {isTerminalOpen ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        {isTerminalOpen && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--bg-primary)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >

              <div className="terminal-lines-container">
                {terminalOutput.split('\n').map((line, idx) => {
                  const cleanLine = stripAnsi(line);
                  let typeClass = 'standard';
                  if (cleanLine.startsWith('$ ')) {
                    typeClass = 'prompt';
                  } else if (cleanLine.startsWith('Exit code: 0')) {
                    typeClass = 'success';
                  } else if (cleanLine.startsWith('Exit code:')) {
                    typeClass = 'error';
                  } else if (
                    cleanLine.toLowerCase().includes('traceback') || 
                    cleanLine.toLowerCase().includes('error') || 
                    cleanLine.toLowerCase().includes('exception') ||
                    cleanLine.startsWith('Error ')
                  ) {
                    typeClass = 'error';
                  }
                  return (
                    <div key={idx} className={`term-line ${typeClass}`}>
                      {cleanLine}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            </div>

            <form 
              onSubmit={e => { e.preventDefault(); runTerminalCommand(terminalCommand); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                padding: '6px 16px',
                gap: '8px'
              }}
            >
              <span style={{ color: 'var(--neon-cyan)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', userSelect: 'none' }}>$</span>
              <input 
                type="text" 
                value={terminalCommand} 
                onChange={e => setTerminalCommand(e.target.value)}
                placeholder="Type terminal command (e.g. python main.py or npm run build)"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.78rem'
                }}
                disabled={isTerminalRunning}
              />

              <button 
                type="submit" 
                className="btn btn-neon-green" 
                disabled={isTerminalRunning || !terminalCommand.trim()}
                style={{
                  height: '24px',
                  padding: '0 12px',
                  fontSize: '0.68rem',
                  borderRadius: '4px'
                }}
              >
                {isTerminalRunning ? 'Running...' : 'Execute'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
