import { useGame } from '../game/store'
import { MISSIONS, SHARD_LINES } from '../game/data'

const PORTFOLIO_URL = 'https://portfolio-one-rust-99.vercel.app/'

export function IntroOverlay() {
  const startGame = useGame((s) => s.startGame)
  const openReading = useGame((s) => s.openReading)
  const resetAll = useGame((s) => s.resetAll)
  const completed = useGame((s) => s.completed)
  const missionIndex = useGame((s) => s.missionIndex)
  const mission = MISSIONS[Math.min(missionIndex, MISSIONS.length - 1)]

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h1>NEBULA VOYAGE</h1>
        <p>
          Bạn là phi công của một tàu thăm dò nhỏ, bay tự do trong một vùng tinh vân.
          Không có đường mòn sẵn: hãy bay tới các điểm sáng, quét chúng, và ghép lại câu chuyện
          của vùng không gian này.
        </p>
        {completed.length > 0 && (
          <p>
            Bạn đã hoàn thành <b style={{ color: 'var(--amber)' }}>{completed.length}/5 nhiệm vụ</b>.
            Bay tiếp từ nhiệm vụ: <b>{mission.title}</b>.
          </p>
        )}
        <div className="kbd-row">
          <span className="kbd">W tăng tốc</span>
          <span className="kbd">S phanh</span>
          <span className="kbd">A / D rẽ</span>
          <span className="kbd">Shift boost</span>
          <span className="kbd">E quét</span>
          <span className="kbd">Kéo chuột xoay camera</span>
        </div>
        <p style={{ fontSize: 13.5 }}>
          Trên điện thoại: dùng joystick bên trái để lái, nút Quét hiện ra khi tàu tới gần một điểm khám phá.
          Va vào thiên thạch sẽ trừ khiên, hết khiên tàu hồi sinh tại chỗ gần nhất.
        </p>
        <div className="overlay-actions">
          <button className="btn btn-primary" onClick={startGame} autoFocus>
            Bắt đầu bay
          </button>
          <button className="btn" onClick={openReading}>
            Đọc hành trình (không cần bay)
          </button>
          {completed.length > 0 && (
            <button className="btn" onClick={resetAll}>
              Chơi lại từ đầu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function StoryPanel() {
  const panel = useGame((s) => s.panel)
  const closePanel = useGame((s) => s.closePanel)
  const mission = MISSIONS.find((m) => m.id === panel?.missionId) || MISSIONS[0]
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="mission-kicker">ĐÃ QUÉT XONG</div>
        <h2>{mission.storyTitle}</h2>
        <p className="story-body">{mission.story}</p>
        <div className="overlay-actions">
          <button className="btn btn-primary" onClick={closePanel} autoFocus>
            Tiếp tục bay
          </button>
        </div>
      </div>
    </div>
  )
}

export function CompletionScreen() {
  const elapsedMs = useGame((s) => s.elapsedMs)
  const hits = useGame((s) => s.hits)
  const resetAll = useGame((s) => s.resetAll)
  const mission = MISSIONS[4]
  const mins = Math.floor(elapsedMs / 60000)
  const secs = Math.floor((elapsedMs % 60000) / 1000)
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="mission-kicker">HÀNH TRÌNH HOÀN THÀNH</div>
        <h2>{mission.storyTitle}</h2>
        <p className="story-body">{mission.story}</p>
        <p className="stat-line">
          Thời gian bay: <b>{mins} phút {secs} giây</b>
        </p>
        <p className="stat-line">
          Mảnh sao: <b>3/3</b> · Số lần va chạm: <b>{hits}</b>
        </p>
        <div className="overlay-actions">
          <a className="btn btn-primary" href={PORTFOLIO_URL} style={{ textDecoration: 'none' }}>
            Về portfolio
          </a>
          <button className="btn" onClick={resetAll}>
            Bay lại từ đầu
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReadingMode() {
  const backToIntro = useGame((s) => s.backToIntro)
  const backToGame = useGame((s) => s.backToGame)
  const completed = useGame((s) => s.completed)
  return (
    <div className="overlay">
      <div className="overlay-card" style={{ width: 'min(640px, 100%)' }}>
        <h2>Đọc hành trình</h2>
        <p>
          Bản đọc đầy đủ của cả hành trình, dành cho người không muốn hoặc không thể lái tàu.
          Mọi mẩu chuyện dưới đây cũng chính là những gì bạn sẽ mở khóa khi bay và quét trong game.
        </p>
        {MISSIONS.map((m) => (
          <div className="reading-item" key={m.id}>
            <h3>{m.storyTitle}</h3>
            <p>{m.story}</p>
          </div>
        ))}
        <div className="reading-item">
          <h3>Ba mảnh sao</h3>
          {SHARD_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="overlay-actions">
          <button className="btn btn-primary" onClick={backToGame}>
            Quay lại game
          </button>
          <button className="btn" onClick={backToIntro}>
            Về màn hình chính
          </button>
        </div>
        {completed.length > 0 && (
          <p style={{ fontSize: 13 }}>Tiến trình game của bạn vẫn được giữ nguyên.</p>
        )}
      </div>
    </div>
  )
}
