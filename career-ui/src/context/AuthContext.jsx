// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import API from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { id, email, name }
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate session on mount
  useEffect(() => {
    const saved = localStorage.getItem('auth')
    if (saved) {
      try {
        const { user, token } = JSON.parse(saved)
        setUser(user)
        setToken(token)
      } catch { localStorage.removeItem('auth') }
    }
    setLoading(false)
  }, [])

  const persist = (user, token) => {
    localStorage.setItem('auth', JSON.stringify({ user, token }))
    setUser(user)
    setToken(token)
  }

  // ── Register ──────────────────────────────────────────────
  const register = async (name, email, password) => {
    /* ── REAL API (uncomment when backend is ready) ──────────
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Registration failed') }
    const { user, token } = await res.json()
    persist(user, token)
    ── END REAL API ─────────────────────────────────────── */

    // ── Mock (remove when backend is ready) ──────────────────
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
    if (users.find(u => u.email === email)) throw new Error('Email already registered')
    const newUser = { id: crypto.randomUUID(), name, email }
    const mockToken = btoa(`${newUser.id}:${Date.now()}`)
    users.push({ ...newUser, password })          // never do this in prod
    localStorage.setItem('mock_users', JSON.stringify(users))
    persist(newUser, mockToken)
    // ── End mock ──────────────────────────────────────────────
  }

  // ── Login ─────────────────────────────────────────────────
  const login = async (email, password) => {
    /* ── REAL API ────────────────────────────────────────────
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Invalid credentials') }
    const { user, token } = await res.json()
    persist(user, token)
    ── END REAL API ─────────────────────────────────────── */

    // ── Mock ──────────────────────────────────────────────────
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) throw new Error('Invalid email or password')
    const { password: _p, ...safeUser } = found
    const mockToken = btoa(`${safeUser.id}:${Date.now()}`)
    persist(safeUser, mockToken)
    // ── End mock ──────────────────────────────────────────────
  }

  // ── Logout ────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('auth')
    setUser(null)
    setToken(null)
  }

  // ── CV helpers (per-user localStorage, swap with API later) ─
  const getUserKey = (uid) => `cv_data_${uid}`

  const saveCV = (cvData) => {
    if (!user) return
    /* ── REAL API ────────────────────────────────────────────
    await fetch(`${API}/profile/cv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,          // pass FormData with the file
    })
    ── END REAL API ─────────────────────────────────────── */
    localStorage.setItem(getUserKey(user.id), JSON.stringify(cvData))
  }

  const getCV = () => {
    if (!user) return null
    const raw = localStorage.getItem(getUserKey(user.id))
    return raw ? JSON.parse(raw) : null
  }

  const deleteCV = () => {
    if (!user) return
    localStorage.removeItem(getUserKey(user.id))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, saveCV, getCV, deleteCV }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)