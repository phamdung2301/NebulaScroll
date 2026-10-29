import { Component } from 'react'

/**
 * Catches render-phase WebGL/scene crashes so the page never goes white.
 * Note: a lost WebGL context does NOT throw and therefore bypasses this
 * boundary — see ContextGuard in NebulaScene.jsx for that case.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown error' }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="stage-fallback">
        <strong>Không mở được khung 3D.</strong>
        <span>
          {this.props.fallbackText ??
            'Thiết bị hoặc trình duyệt của bạn có thể không hỗ trợ WebGL.'}
        </span>
        <span style={{ fontSize: 12, color: '#7a7a84' }}>{this.state.message}</span>
        <button onClick={() => window.location.reload()}>Tải lại trang</button>
      </div>
    )
  }
}
