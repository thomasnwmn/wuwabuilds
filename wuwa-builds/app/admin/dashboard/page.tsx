import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch some stats
  const { count: buildsCount } = await supabase.from('builds').select('*', { count: 'exact', head: true })
  const { data: recentBuilds } = await supabase
    .from('builds')
    .select('*, resonators(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 500, color: "#fff" }}>Archive Overview</h1>
        <Link href="/admin/builds/new" className="view-button" style={{ background: "rgba(211,255,101,0.1)", color: "var(--acid)", borderColor: "var(--acid)" }}>
          + Create New Build
        </Link>
      </div>

      <div className="frosted-card" style={{ padding: "24px", marginBottom: "32px", display: "inline-block", minWidth: "200px" }}>
        <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Builds</p>
        <div style={{ fontSize: "3rem", color: "var(--acid)", fontWeight: 300, lineHeight: 1 }}>{buildsCount || 0}</div>
      </div>

      <h2 style={{ fontSize: "1.2rem", color: "#e2e2e6", marginBottom: "16px", fontWeight: 500 }}>Recent Builds</h2>
      <div className="frosted-card" style={{ padding: "0", overflow: "hidden" }}>
        {recentBuilds?.length === 0 && <div style={{ padding: "24px", color: "var(--muted)" }}>No builds found.</div>}
        {recentBuilds?.map((build, index) => (
          <div key={build.id} style={{ 
            padding: "16px 24px", 
            borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 500, fontSize: "1rem" }}>{build.resonators.name}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "4px" }}>{build.role} • By {build.builder_name}</div>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ color: "var(--acid)", fontWeight: 600 }}>
                {build.score}
              </div>
              <Link 
                href={`/admin/builds/${build.id}/edit`}
                style={{
                  padding: "6px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: "0.75rem", textDecoration: "none"
                }}
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
