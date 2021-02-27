import React, {ErrorInfo, ReactNode} from 'react'
import {ErrorObject} from '.'

interface Props {
  children: ReactNode;
  fallback: (error: ErrorObject) => ReactNode;
}

interface State {
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidCatch(error, errorInfo) {
    this.setState({error, errorInfo})
  }

  render() {
    if (this.state.error) {
      return this.props.fallback({
        id: 'exception',
        props: {
          error: this.state.error,
          errorInfo: this.state.errorInfo,
        }
      })
    } else {
      return this.props.children
    }
  }
}
