import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; 

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Still log to console for debugging
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1 style={{ margin: 0 }}>Omni-flow crashed 💥</h1>
          <p>There’s a runtime error in the UI. Here’s what React caught:</p>
          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: 12,
              borderRadius: 12,
              overflow: "auto",
              maxWidth: "100%",
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");

if (!rootEl) {
  // This would also cause a blank page — so we handle it visibly.
  document.body.innerHTML =
    "<div style='padding:24px;font-family:system-ui'><h1>No #root element found</h1></div>";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

