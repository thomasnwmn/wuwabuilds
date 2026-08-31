"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="builds-app" style={{ overflowY: "auto" }}>
      <nav className="topbar" style={{ display: "flex", justifyContent: "space-between", minHeight: "80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/" className="brand">
            <span className="brand-name">WUWA <em>BUILDS</em> <span style={{ color: "var(--muted)", fontSize: "0.6rem" }}>ADMIN</span></span>
          </Link>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link 
              href="/admin/dashboard" 
              style={{ 
                color: pathname === '/admin/dashboard' ? "#fff" : "var(--muted)", 
                textDecoration: "none", fontSize: "0.8rem", fontWeight: "600" 
              }}
            >
              Dashboard
            </Link>
            <Link 
              href="/admin/builds/new" 
              style={{ 
                color: pathname === '/admin/builds/new' ? "#fff" : "var(--muted)", 
                textDecoration: "none", fontSize: "0.8rem", fontWeight: "600" 
              }}
            >
              New Build
            </Link>
          </div>
        </div>
        <button onClick={handleSignOut} className="view-button" style={{ height: "32px", fontSize: "0.6rem" }}>
          Sign Out
        </button>
      </nav>
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        {children}
      </div>
    </div>
  )
}
