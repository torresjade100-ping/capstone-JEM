import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #fee2e2', margin: '20px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={24} />
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Something went wrong loading this section</h3>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
