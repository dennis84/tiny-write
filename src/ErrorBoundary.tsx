import React, {ErrorInfo, ReactNode} from 'react'
import {ErrorObject} from '.'

interface Props {
  children: ReactNode;
  error?: ErrorObject;
}

interface State {
  error?: ErrorObject;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {}
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error: {
        id: 'exception',
        props: {error, errorInfo},
      }
    });
  }

  render() {
    return this.props.children
  }
}
