import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { RightPanel } from './components/RightPanel';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Modals } from './components/Modals';

function AppLayout() {
  const { isLeftPanelOpen, isRightPanelOpen, setIsLeftPanelOpen, setIsRightPanelOpen } = useApp();

  const leftWidth = isLeftPanelOpen ? '290px' : '0px';
  const rightWidth = isRightPanelOpen ? '340px' : '0px';

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Header />

      {/* Dynamic Multi-Column IDE Layout */}
      <main 
        className="app-main" 
        style={{ 
          gridTemplateColumns: `${leftWidth} 1fr ${rightWidth}`,
          transition: 'grid-template-columns 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}
      >
        {/* Left Toggle Tab */}
        <div 
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          style={{
            position: 'fixed',
            left: isLeftPanelOpen ? '278px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '64px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderLeft: isLeftPanelOpen ? '1px solid var(--border-color)' : 'none',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderTopLeftRadius: isLeftPanelOpen ? '8px' : '0px',
            borderBottomLeftRadius: isLeftPanelOpen ? '8px' : '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: isLeftPanelOpen ? '0 0 12px rgba(0,0,0,0.2)' : '4px 0 12px rgba(0,0,0,0.2)',
            color: 'var(--neon-cyan)',
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, opacity 0.2s ease'
          }}
          title={isLeftPanelOpen ? "Collapse Left Panel" : "Expand Left Panel"}
          className="sidebar-toggle-tab sidebar-toggle-handle"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isLeftPanelOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </div>

        {/* Right Toggle Tab */}
        <div 
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          style={{
            position: 'fixed',
            right: isRightPanelOpen ? '328px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '64px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRight: isRightPanelOpen ? '1px solid var(--border-color)' : 'none',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderTopRightRadius: isRightPanelOpen ? '8px' : '0px',
            borderBottomRightRadius: isRightPanelOpen ? '8px' : '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: isRightPanelOpen ? '0 0 12px rgba(0,0,0,0.2)' : '-4px 0 12px rgba(0,0,0,0.2)',
            color: 'var(--neon-purple)',
            transition: 'right 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, opacity 0.2s ease'
          }}
          title={isRightPanelOpen ? "Collapse Right Panel" : "Expand Right Panel"}
          className="sidebar-toggle-tab sidebar-toggle-handle"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isRightPanelOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </div>



        {/* Left Panel: Files and Timeline */}
        <div style={{ 
          width: leftWidth, 
          height: '100%', 
          overflow: 'hidden', 
          borderRight: isLeftPanelOpen ? '1px solid var(--border-color)' : 'none', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <Sidebar />
        </div>

        {/* Middle Panel: File Tabs and Editor / Commit Diff view */}
        <EditorArea />

        {/* Right Panel: Stepper progress and Prompt chat box */}
        <div style={{ 
          width: rightWidth, 
          height: '100%', 
          overflow: 'hidden', 
          borderLeft: isRightPanelOpen ? '1px solid var(--border-color)' : 'none', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <RightPanel />
        </div>
      </main>

      {/* Slide-out Settings/Metrics Drawer */}
      <SettingsDrawer />

      {/* Global Modal Overlays (Selector, Creator, Folder Browser) */}
      <Modals />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
