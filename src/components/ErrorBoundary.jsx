import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Tàu gặp sự cố</h2>
            <p>
              Game gặp lỗi không mong muốn. Bấm tải lại để bay tiếp, tiến trình nhiệm vụ
              đã lưu sẽ không mất.
            </p>
            <p style={{ fontSize: 13, wordBreak: 'break-word' }}>
              {String(this.state.error.message || this.state.error)}
            </p>
            <div className="overlay-actions">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Tải lại game
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
