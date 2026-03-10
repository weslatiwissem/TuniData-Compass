import { useState } from 'react'
import SkillInput from './components/SkillInput'
import Dashboard from './components/Dashboard'
import './App.css'

export default function App() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (skills) => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('http://localhost:8000/recommend', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ skills, top_n: 3 }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Something went wrong')
      }
      const data = await res.json()
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResults(null)
    setError(null)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">◈</span>
            <span className="logo-text">TuniData Compas</span>
          </div>
          <p className="tagline">AI-powered career matching for the Tunisian job market</p>
        </div>
      </header>

      <main className="main">
        {!results ? (
          <SkillInput onSubmit={handleSubmit} loading={loading} error={error} />
        ) : (
          <Dashboard data={results} onReset={handleReset} />
        )}
      </main>

      <footer className="footer">
        <p>Powered by TF-IDF · Cosine Similarity · FastAPI</p>
      </footer>
    </div>
  )
}
