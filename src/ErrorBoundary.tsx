import React, {ReactNode} from 'react'
import {Error} from '.'

interface Props {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

export class ErrorBoundary extends React.Component<Props> {
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
