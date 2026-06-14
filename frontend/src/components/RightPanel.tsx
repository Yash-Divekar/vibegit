import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const stripAnsi = (str: string | null | undefined): string => {
  if (!str) return '';
  // eslint-disable-next-line no-control-regex
  const clean = str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  return clean.replace(/\[\d{1,2}m/g, '');
};

const TruncatedText: React.FC<{ text: string; maxLength?: number }> = ({ text, maxLength = 180 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

export const RightPanel: React.FC = () => {
  const {
    pipelineActive,
    pipelineSteps,
    commits,
    activeProject,
    handleSelectCommit,
    promptInput,
    handleTextareaChange,
    handleSubmitPrompt,
    showMentionBox,
    sandboxFiles,
    mentionFilter,
    handleSelectMention,
    chatHistoryEndRef,
    textareaRef
  } = useApp();



  const [isStepperOpen, setIsStepperOpen] = useState(true);

  const filteredMentionFiles = Object.keys(sandboxFiles).filter(f =>
    f.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div 
      className="right-column" 
      style={{ 
        display: 'grid', 
        gridTemplateRows: isStepperOpen ? '230px 1fr' : '38px 1fr', 
        height: '100%', 
        overflow: 'hidden' 
      }}
    >
      {/* Stepper RLM Progress Flow */}
      <div className="glass-panel" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div 
          className="glass-panel-header" 
          style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsStepperOpen(!isStepperOpen)}
        >
          <span className="glass-panel-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            RLM Context Stepper
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
            {pipelineActive && <div className="spinner" />}
            <button 
              className="btn-icon" 
              onClick={() => setIsStepperOpen(!isStepperOpen)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '2px', cursor: 'pointer' }}
            >
              {isStepperOpen ? (
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
        {isStepperOpen && (
          <div className="glass-panel-body" style={{ padding: '12px', overflowY: 'auto' }}>
            <div className="stepper-container" style={{ gap: '8px' }}>
              {pipelineSteps.map((step, idx) => {
                const isActive = step.status === 'running';
                const isCompleted = step.status === 'completed';
                const isFailed = step.status === 'failed';
                
                return (
                  <div key={idx} className={`step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} style={{ padding: '8px 12px', borderRadius: '8px' }}>
                    <div className="step-header">
                      <div className="step-title-wrap" style={{ gap: '8px' }}>
                        <span className="step-dot" />
                        <span className="step-label" style={{
                          color: isFailed ? 'var(--neon-rose)' : isActive ? 'var(--neon-cyan)' : isCompleted ? '#c084fc' : 'var(--text-muted)',
                          fontSize: '0.68rem',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                          fontWeight: 700
                        }}>{step.name}</span>
                      </div>
                      {step.badge && <span className="step-badge" style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px' }}>{step.badge}</span>}
                    </div>
                    {(isActive || isCompleted || isFailed) && (
                      <div className="step-content" style={{ whiteSpace: 'pre-wrap', maxHeight: '55px', overflowY: 'auto', fontSize: '0.72rem', marginTop: '6px', lineHeight: 1.35 }}>
                        {step.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Vibe Chat Console */}
      <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="glass-panel-header" style={{ padding: '10px 16px' }}>
          <span className="glass-panel-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.78rem' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            AI Prompt Console
          </span>
        </div>


        <div className="chat-history" style={{ padding: '16px', gap: '16px', flex: 1, overflowY: 'auto' }}>
          {commits.filter(c => c.hash !== `root-${activeProject}`).map((commit) => (
            <React.Fragment key={commit.hash}>
              {/* User Bubble (Right) */}
              <div className="chat-message-row user">
                <div className="chat-bubble user">
                  <div className="chat-bubble-header user">
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>YOU</span>
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', lineHeight: 1.45 }}>
                    <TruncatedText text={stripAnsi(commit.raw_prompt)} />
                  </div>
                </div>
              </div>

              {/* Assistant Bubble (Left) */}
              <div className="chat-message-row assistant">
                <div 
                  className="chat-bubble assistant" 
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={() => handleSelectCommit(commit.hash)}
                >
                  <div className="chat-bubble-header assistant" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>VIBEGIT AI</span>
                    </div>
                    <span style={{
                      color: commit.status === 'success' ? 'var(--neon-green)' : 'var(--neon-rose)',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      background: commit.status === 'success' ? 'rgba(56, 239, 125, 0.08)' : 'rgba(255, 8, 68, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${commit.status === 'success' ? 'rgba(56,239,125,0.2)' : 'rgba(255,8,68,0.2)'}`
                    }}>
                      {commit.status.toUpperCase()} ({(commit.eval_score * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {commit.status === 'success' ? (
                      <span>
                        Changes resolved and verified successfully. Committed snapshot to tree as <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-cyan)', background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.72rem' }}>{commit.hash.slice(0, 7)}</code>.
                      </span>
                    ) : (
                      <span>
                        Self-correction threshold not met (Score: {(commit.eval_score * 100).toFixed(0)}%). Changes were discarded to ensure project safety.
                      </span>
                    )}
                  </div>

                  {/* Collapsible details for Optimized Prompt */}
                  {commit.optimized_prompt && (
                    <details className="collapsible-details" onClick={e => e.stopPropagation()}>
                      <summary className="details-summary">
                        <span>Optimized context details</span>
                        <span style={{ color: 'var(--neon-purple)', fontSize: '0.62rem', textTransform: 'none' }}>
                          Saved {((1 - (commit.tokens_after / (commit.tokens_before || 1))) * 100).toFixed(0)}% tokens
                        </span>
                      </summary>
                      <div className="details-content-box">
                        {stripAnsi(commit.optimized_prompt)}
                      </div>
                    </details>
                  )}

                  {/* Collapsible details for Self-Correction feedback */}
                  {commit.eval_feedback && (
                    <details className="collapsible-details" onClick={e => e.stopPropagation()}>
                      <summary className="details-summary">
                        <span>Self-correction evaluation logs</span>
                        <span style={{ color: 'var(--neon-cyan)', fontSize: '0.62rem', textTransform: 'none' }}>Expand logs</span>
                      </summary>
                      <div className="details-content-box">
                        {stripAnsi(commit.eval_feedback)}
                      </div>
                    </details>
                  )}

                  <div className="chat-bubble-footer">
                    <span>Efficiency: {commit.tokens_before} → {commit.tokens_after} tokens</span>
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.02em' }}>
                      Click to view diff
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          
          {pipelineActive && (
            <div className="chat-message-row assistant" style={{ opacity: 0.85 }}>
              <div className="chat-bubble assistant" style={{ width: '100%' }}>
                <div className="chat-bubble-header assistant">
                  <div className="spinner" style={{ marginRight: '6px' }} />
                  <span>VIBEGIT AI PIPELINE STREAMING...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                  <span>Aggregating context, refactoring file diffs, and applying corrective quality loop iterations...</span>
                </div>
              </div>
            </div>
          )}
 
          <div ref={chatHistoryEndRef} />
        </div>
 
        {/* Chat form area with mention feature */}
        <form 
          onSubmit={handleSubmitPrompt} 
          className="chat-input-area" 
          style={{ 
            padding: '12px 16px', 
            background: 'var(--bg-secondary)', 
            borderTop: '1px solid var(--border-color)',
            position: 'relative'
          }}
        >
          {showMentionBox && filteredMentionFiles.length > 0 && (
            <div className="mention-autocomplete-box" style={{ bottom: '90px', borderRadius: '8px', padding: '4px', boxShadow: '0 -8px 25px rgba(0,0,0,0.3)', zIndex: 10 }}>
              {filteredMentionFiles.map((f) => (
                <div
                  key={f}
                  className="mention-item"
                  onClick={() => handleSelectMention(f)}
                  style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '6px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
 
          <div 
            className="chat-card-input-container"
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '8px 12px',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
            }}
          >
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Submit prompt to active sandbox (use @ to reference files)..."
              value={promptInput}
              onChange={handleTextareaChange}
              disabled={pipelineActive}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitPrompt(e);
                }
              }}
              style={{ 
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.8rem', 
                minHeight: '46px',
                height: '46px',
                lineHeight: '1.4',
                resize: 'none',
                padding: 0
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={pipelineActive || !promptInput.trim()}
                className="btn btn-neon-purple"
                style={{ 
                  height: '28px', 
                  padding: '0 14px', 
                  borderRadius: '6px', 
                  fontFamily: 'Plus Jakarta Sans, sans-serif', 
                  fontWeight: 700, 
                  fontSize: '0.74rem'
                }}
              >
                Vibe
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
