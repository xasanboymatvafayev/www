
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  console.error("Fatal Error: Root element not found in index.html");
} else {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("React Render Error:", error);
    container.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>System Initialization Failed</h2>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Retry Loading
      </button>
    </div>`;
  }
}
