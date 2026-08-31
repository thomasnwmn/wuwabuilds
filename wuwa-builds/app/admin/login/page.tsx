"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/admin/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="status-message">
      <div className="frosted-card" style={{ padding: "40px", width: "100%", maxWidth: "400px", borderRadius: "16px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: "600", color: "#fff" }}>Archive Access</h1>
        <p style={{ margin: "0 0 24px", fontSize: "0.85rem", color: "#a4a6ad" }}>Authenticate to edit builds.</p>
        
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: "0.9rem"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: "0.9rem"
              }}
            />
          </div>

          {error && <div style={{ color: "#ff6b6b", fontSize: "0.8rem" }}>{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: "8px", padding: "12px", borderRadius: "8px",
              background: "var(--acid)", color: "#111", fontWeight: "700",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  )
}
