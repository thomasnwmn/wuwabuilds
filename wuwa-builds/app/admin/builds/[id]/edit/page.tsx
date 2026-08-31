import { createClient } from "@/lib/supabase/server"
import BuildForm from "@/components/BuildForm"
import { notFound } from "next/navigation"

export default async function EditBuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: build, error } = await supabase
    .from('builds')
    .select(`
      *,
      stats:build_stats(*),
      echoes:build_echoes(*)
    `)
    .eq('id', id)
    .single()

  if (error || !build) {
    notFound()
  }

  // Ensure echoes is exactly 5 slots for the form
  const paddedEchoes = [...(build.echoes || [])]
  while (paddedEchoes.length < 5) {
    paddedEchoes.push({ echo_id: "", set: "", main_stat: "", substat: "" })
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 500, color: "#fff" }}>Edit Build</h1>
      </div>
      <BuildForm 
        buildId={build.id} 
        initialData={{
          build,
          stats: build.stats || [],
          echoes: paddedEchoes
        }} 
      />
    </div>
  )
}
