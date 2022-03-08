import React, {ErrorInfo, ReactNode} from 'react'
import {ErrorObject} from '.'

interface Props {
  children: ReactNode;
  error?: ErrorObject;
  onError: (error: ErrorObject) => void;
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
    const err = {
      id: 'exception',
      props: {error, errorInfo},
    }

    this.setState({error: err})
    this.props.onError(err)
  }

  render() {
    return this.props.children
  }
}
