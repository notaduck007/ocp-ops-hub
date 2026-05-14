import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "./error-state";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("AppErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error.message || "An unexpected error occurred while rendering this page."}
          onRetry={this.reset}
          variant="card"
        />
      );
    }
    return this.props.children;
  }
}
