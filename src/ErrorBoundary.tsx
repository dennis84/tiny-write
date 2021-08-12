import React, {ReactNode} from 'react'
import {ErrorObject} from '.'

interface Props {
  children: ReactNode;
  fallback: (error: ErrorObject) => ReactNode;
  onError: (error: ErrorObject) => void;
  error?: ErrorObject;
}

export class ErrorBoundary extends React.Component<Props> {
  constructor(props) {
    super(props)
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError({
      id: 'exception',
      props: {error, errorInfo},
    });
  }

  render() {
    if (this.props.error) {
      return this.props.fallback(this.props.error)
    }

    return this.props.children
  }
}
