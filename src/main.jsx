import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Critical Render Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fff' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('SpendSmart v1.0.2 Starting...');

try {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>,
    );
  } else {
    throw new Error('Root element not found!');
  }
} catch (err) {
  console.error('CRITICAL: Failed to initialize React app:', err);
  // Show a basic error UI if the app fails to even start rendering
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ef4444; font-family: sans-serif;">
        <h1>Initialization Error</h1>
        <p>${err.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Try Again</button>
      </div>
    `;
  }
}
