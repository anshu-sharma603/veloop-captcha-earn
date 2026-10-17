import { Component } from 'react';
import StatusScreen from './StatusScreen.jsx';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error, info) { console.error('UI crashed:', error, info?.componentStack); }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <StatusScreen
        code="Oops"
        title="Something went wrong"
        text="The page ran into an unexpected problem. Your balance is safe because it is stored on the server. Please reload to continue."
        actions={(
          <>
            <button type="button" className="st-btn pri" onClick={() => window.location.reload()}>Reload page</button>
            <a className="st-btn" href="/">Go to home</a>
          </>
        )}
      />
    );
  }
}