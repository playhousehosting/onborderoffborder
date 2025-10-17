import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StartupHealthCheck from './components/common/StartupHealthCheck';

// Add global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Verify root element exists before trying to render
const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; font-family: system-ui;">
      <div style="background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px;">
        <h1 style="color: #dc2626; font-size: 1.5rem; margin-bottom: 1rem;">Critical Error</h1>
        <p style="color: #4b5563; margin-bottom: 1rem;">The root element is missing from the HTML. Please check your public/index.html file.</p>
        <p style="color: #6b7280; font-size: 0.875rem;">Expected: &lt;div id="root"&gt;&lt;/div&gt;</p>
      </div>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <StartupHealthCheck>
        <App />
      </StartupHealthCheck>
    </React.StrictMode>
  );
}