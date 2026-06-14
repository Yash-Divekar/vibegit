import React from 'react';
import { useApp } from '../context/AppContext';

export const Modals: React.FC = () => {
  const {
    showProjectSelectorModal,
    setShowProjectSelectorModal,
    projects,
    activeProject,
    showNewProjectModal,
    setShowNewProjectModal,
    newProjectName,
    setNewProjectName,
    newProjectFramework,
    setNewProjectFramework,
    modalTab,
    setModalTab,
    importPath,
    setImportPath,
    handleCreateProject,
    showFolderPicker,
    setShowFolderPicker,
    pickerCurrentPath,
    pickerParentPath,
    pickerDirectories,
    handleNavigatePicker,
    handleOpenFolderPicker
  } = useApp();

  return (
    <>
      {/* Project Switcher Modal */}
      {showProjectSelectorModal && (
        <div className="modal-overlay" onClick={() => setShowProjectSelectorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '460px', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ marginBottom: '18px' }}>
              <span className="modal-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1.05rem' }}>
                Switch Workspace Project
              </span>
              <button 
                className="btn-icon" 
                onClick={() => setShowProjectSelectorModal(false)} 
                style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', padding: '0', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div className="project-selector-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '18px', paddingRight: '4px' }}>
              {projects.map((p) => {
                const isActive = p.name === activeProject;
                return (
                  <div
                    key={p.id}
                    className={`project-selector-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      window.open(`/?project=${p.name}`, '_blank');
                      setShowProjectSelectorModal(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(155, 81, 224, 0.06)' : 'rgba(0,0,0,0.15)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isActive ? 'var(--neon-purple)' : 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                        Framework: {p.framework}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="logo-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(155, 81, 224, 0.3)', fontSize: '0.58rem', fontWeight: 700 }}>Active</span>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Open in new tab →</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-neon-purple"
                style={{ width: '100%', height: '38px', borderRadius: '8px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.82rem' }}
                onClick={() => {
                  setShowProjectSelectorModal(false);
                  setShowNewProjectModal(true);
                }}
              >
                + Create or Import Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Open Project Modal with Tabs */}
      {showNewProjectModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ marginBottom: '18px' }}>
              <span className="modal-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1.05rem' }}>
                Workspace Manager
              </span>
              <button 
                className="btn-icon" 
                onClick={() => setShowNewProjectModal(false)} 
                style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', padding: '0', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '18px' }}>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 0',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: modalTab === 'new' ? 'var(--neon-purple)' : 'var(--text-secondary)',
                  borderBottom: modalTab === 'new' ? '2.5px solid var(--neon-purple)' : '2.5px solid transparent'
                }}
                onClick={() => setModalTab('new')}
              >
                Create New Sandbox
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 0',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: modalTab === 'open' ? 'var(--neon-purple)' : 'var(--text-secondary)',
                  borderBottom: modalTab === 'open' ? '2.5px solid var(--neon-purple)' : '2.5px solid transparent'
                }}
                onClick={() => setModalTab('open')}
              >
                Open Existing Project
              </div>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '6px' }}>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. my-awesome-app"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="form-input"
                  style={{ borderRadius: '8px', height: '36px', fontSize: '0.82rem', padding: '6px 12px' }}
                  required
                />
              </div>

              {modalTab === 'new' ? (
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', fontSize: '0.74rem' }}>Boilerplate Framework</label>
                  <div className="framework-chips-container" style={{ gap: '8px' }}>
                    {[
                      { value: 'plain', label: 'Plain Files', desc: 'Minimal Python' },
                      { value: 'react', label: 'React', desc: 'Vite + React' },
                      { value: 'fastapi', label: 'FastAPI', desc: 'Python API' },
                      { value: 'django', label: 'Django', desc: 'Python MVC' },
                      { value: 'nestjs', label: 'NestJS', desc: 'TS Controller' },
                      { value: 'springboot', label: 'Spring Boot', desc: 'Java Maven' }
                    ].map(fw => (
                      <button
                        key={fw.value}
                        type="button"
                        className={`framework-chip ${newProjectFramework === fw.value ? 'active' : ''}`}
                        onClick={() => setNewProjectFramework(fw.value)}
                        style={{ borderRadius: '8px', padding: '10px 8px', gap: '4px' }}
                      >
                        <span className="fw-chip-label" style={{ fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{fw.label}</span>
                        <span className="fw-chip-desc" style={{ fontSize: '0.62rem' }}>{fw.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '6px' }}>Absolute Local Folder Path</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. C:\Users\Username\projects\my-app"
                      value={importPath}
                      onChange={e => setImportPath(e.target.value)}
                      className="form-input"
                      style={{ flex: 1, borderRadius: '8px', height: '36px', fontSize: '0.82rem', padding: '6px 12px' }}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-neon-cyan"
                      onClick={() => handleOpenFolderPicker(importPath)}
                      style={{ borderRadius: '8px', height: '36px', fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, padding: '0 14px' }}
                    >
                      Browse...
                    </button>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block', lineHeight: 1.35 }}>
                    If this folder contains a <strong>.git</strong> directory, its history and commit messages will be imported automatically.
                  </span>
                </div>
              )}

              <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-icon" 
                  onClick={() => setShowNewProjectModal(false)}
                  style={{ borderRadius: '8px', height: '36px', fontSize: '0.78rem', padding: '0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-neon-purple"
                  style={{ borderRadius: '8px', height: '36px', fontSize: '0.78rem', padding: '0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
                >
                  {modalTab === 'new' ? 'Create Project' : 'Import & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setShowFolderPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ marginBottom: '14px' }}>
              <span className="modal-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1.05rem' }}>
                Select Local Directory
              </span>
              <button 
                className="btn-icon" 
                onClick={() => setShowFolderPicker(false)} 
                style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', padding: '0', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                className="btn btn-icon"
                disabled={!pickerParentPath}
                onClick={() => handleNavigatePicker(pickerParentPath)}
                title="Go Up One level"
                style={{ height: '32px', padding: '0 12px', fontSize: '0.78rem', borderRadius: '6px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
              >
                ↑ Up
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'Inter, sans-serif' }}>
                <strong>Path:</strong> {pickerCurrentPath || 'System Drives / Computer'}
              </span>
            </div>

            <div className="folder-picker-list" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.15)', maxHeight: '350px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {pickerDirectories.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No subdirectories found.</div>
              ) : (
                pickerDirectories.map((dirName) => {
                  const pathSep = pickerCurrentPath.endsWith('/') || pickerCurrentPath.endsWith('\\') ? '' : '/';
                  const nextPath = pickerCurrentPath ? `${pickerCurrentPath}${pathSep}${dirName}` : dirName;
                  
                  return (
                    <div
                      key={dirName}
                      className="folder-item"
                      onClick={() => handleNavigatePicker(nextPath)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'background 0.2s'
                      }}
                    >
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--neon-amber)', flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{dirName}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => setShowFolderPicker(false)}
                style={{ borderRadius: '8px', height: '36px', fontSize: '0.78rem', padding: '0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-neon-purple"
                disabled={!pickerCurrentPath}
                onClick={() => {
                  setImportPath(pickerCurrentPath);
                  setShowFolderPicker(false);
                }}
                style={{ borderRadius: '8px', height: '36px', fontSize: '0.78rem', padding: '0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}
              >
                Select Current Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
