import { create } from 'zustand'

const STORAGE_KEY = 'nebula-voyage-progress-v1'

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: [], shards: [] }
    const parsed = JSON.parse(raw)
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      shards: Array.isArray(parsed.shards) ? parsed.shards : [],
    }
  } catch {
    return { completed: [], shards: [] }
  }
}

function saveProgress(completed, shards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, shards }))
  } catch {
    // Private mode etc: progress just won't persist. Game still works.
  }
}

const initial = loadProgress()

export const useGame = create((set, get) => ({
  phase: 'intro', // intro | playing | reading | done
  missionIndex: initial.completed.length,
  completed: initial.completed,
  shards: initial.shards,
  moonScanned: false,
  shield: 100,
  hits: 0,
  nearTarget: null, // { kind: 'scan'|'shard'|'gate', id, label } | null
  panel: null, // { missionId } | null — story panel currently open
  toast: null, // short-lived message string
  hitFlash: 0,
  startTime: null,
  elapsedMs: 0,
  showFps: false,

  startGame: () =>
    set({
      phase: 'playing',
      startTime: Date.now(),
      panel: null,
    }),

  openReading: () => set({ phase: 'reading' }),
  backToIntro: () => set({ phase: 'intro', panel: null }),
  backToGame: () => set({ phase: 'playing', panel: null }),

  setNearTarget: (target) => {
    const prev = get().nearTarget
    if ((prev && prev.id) !== (target && target.id)) set({ nearTarget: target })
  },

  openPanel: (missionId) => set({ panel: { missionId } }),
  closePanel: () => set({ panel: null }),

  showToast: (text) => set({ toast: text }),
  clearToast: () => set({ toast: null }),

  completeMission: (missionId) => {
    const { completed, shards } = get()
    if (completed.includes(missionId)) return
    const next = [...completed, missionId]
    saveProgress(next, shards)
    set({ completed: next, missionIndex: next.length, moonScanned: false })
  },

  collectShard: (shardId) => {
    const { shards, completed } = get()
    if (shards.includes(shardId)) return
    const next = [...shards, shardId]
    saveProgress(completed, next)
    set({ shards: next })
  },

  setMoonScanned: () => set({ moonScanned: true }),

  damage: (amount) =>
    set((s) => ({
      shield: Math.max(0, s.shield - amount),
      hits: s.hits + 1,
      hitFlash: s.hitFlash + 1,
    })),

  restoreShield: (amount) =>
    set((s) => ({ shield: Math.min(100, s.shield + amount) })),

  finishGame: () =>
    set((s) => ({
      phase: 'done',
      elapsedMs: s.startTime ? Date.now() - s.startTime : 0,
    })),

  toggleFps: () => set((s) => ({ showFps: !s.showFps })),

  resetAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({
      phase: 'intro',
      missionIndex: 0,
      completed: [],
      shards: [],
      moonScanned: false,
      shield: 100,
      hits: 0,
      nearTarget: null,
      panel: null,
      startTime: null,
      elapsedMs: 0,
    })
  },
}))
