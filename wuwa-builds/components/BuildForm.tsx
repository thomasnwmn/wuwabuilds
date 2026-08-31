"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

function assetSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "") // Strip apostrophes so "Devotee's" becomes "devotees" instead of "devotee-s"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type DictionaryItem = { id: string, name: string, element?: string, type?: string, rarity?: number, cost?: string }

function SearchableSelect({ 
  items, value, onChange, placeholder, renderItem = (item) => item.name
}: { 
  items: DictionaryItem[], value: string, onChange: (val: string) => void, 
  placeholder: string, renderItem?: (item: DictionaryItem) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const selectedItem = items.find(i => i.id === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button 
        type="button" onClick={() => setOpen(!open)}
        className={`search-select-btn ${!selectedItem ? 'is-placeholder' : ''}`}
      >
        {selectedItem ? renderItem(selectedItem) : placeholder}
        <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
          background: "rgba(12,12,15,0.95)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
          zIndex: 100, maxHeight: "300px", display: "flex", flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <input 
              autoFocus type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px", background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "0.9rem" }}
            />
          </div>
          <div style={{ overflowY: "auto", padding: "4px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", color: "#777a82", fontSize: "0.85rem", textAlign: "center" }}>No results found.</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id} type="button"
                  onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
                  className={`search-select-option ${value === item.id ? 'is-selected' : ''}`}
                >
                  {renderItem(item)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuildForm({ initialData, buildId }: { initialData?: any, buildId?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Dictionaries
  const [resonators, setResonators] = useState<DictionaryItem[]>([])
  const [weapons, setWeapons] = useState<DictionaryItem[]>([])
  const [echoesDict, setEchoesDict] = useState<DictionaryItem[]>([])

  // Strip out joined relational data if editing an existing build
  const initialFormState = initialData?.build ? {
    builder_name: initialData.build.builder_name || "",
    builder_initials: initialData.build.builder_initials || "",
    resonator_id: initialData.build.resonator_id || "",
    weapon_id: initialData.build.weapon_id || "",
    role: initialData.build.role || "MAIN DAMAGE",
    level: initialData.build.level || "LEVEL 90",
    rank: initialData.build.rank || "SEQUENCE 0",
    headline: initialData.build.headline || "",
    description: initialData.build.description || "",
    score: initialData.build.score || 0,
    echo_set: initialData.build.echo_set || "",
    notes: initialData.build.notes || []
  } : {
    builder_name: "", builder_initials: "",
    resonator_id: "", weapon_id: "",
    role: "MAIN DAMAGE", level: "LEVEL 90", rank: "SEQUENCE 0",
    headline: "", description: "", score: 0, echo_set: "", notes: []
  }

  const [formData, setFormData] = useState(initialFormState)
  const [notesStr, setNotesStr] = useState(initialData?.build?.notes?.join("\n") || "")

  const [stats, setStats] = useState<{label: string, value: string}[]>(initialData?.stats || [
    { label: "HP", value: "" }, { label: "ATK", value: "" }, { label: "DEF", value: "" },
    { label: "ENERGY REGEN", value: "" }, { label: "CRIT. RATE", value: "" }, { label: "CRIT. DMG", value: "" },
    { label: "BONUS DMG", value: "" }
  ])

  const [echoes, setEchoes] = useState<any[]>(initialData?.echoes || Array(5).fill({ echo_id: "", set: "", main_stat: "", substat: "" }))

  useEffect(() => {
    async function loadDictionaries() {
      const [resData, wpData, echoData] = await Promise.all([
        supabase.from("resonators").select("*").order("name"),
        supabase.from("weapons").select("*").order("name"),
        supabase.from("echoes").select("*").order("name")
      ])
      if (resData.data) setResonators(resData.data)
      if (wpData.data) setWeapons(wpData.data)
      if (echoData.data) setEchoesDict(echoData.data)
      setLoading(false)
    }
    loadDictionaries()
  }, [])

  // Auto-calculate score
  useEffect(() => {
    // Basic heuristic for DPS Score: CR*2 + CD + (ATK / 50) + Bonus DMG
    let score = 0
    stats.forEach(s => {
      const val = parseFloat(s.value.replace(/[^0-9.]/g, ''))
      if (isNaN(val)) return
      if (s.label.includes("CRIT. RATE")) score += val * 2
      if (s.label.includes("CRIT. DMG")) score += val
      if (s.label.includes("ATK")) score += val / 25
      if (s.label.includes("DMG")) score += val * 1.5
    })
    
    // Normalize roughly to out of 100
    const normalized = Math.min(100, Math.max(0, score / 4.5))
    setFormData(prev => ({ ...prev, score: parseFloat(normalized.toFixed(1)) }))
  }, [stats])

  // Validation & Set Bonuses
  const totalCost = echoes.reduce((acc, e) => {
    if (!e.echo_id) return acc
    const dict = echoesDict.find(d => d.id === e.echo_id)
    if (!dict) return acc
    const costNum = parseInt(dict.cost?.replace(/[^0-9]/g, '') || "0")
    return acc + costNum
  }, 0)

  const setCounts = echoes.reduce((acc, e) => {
    if (!e.set) return acc
    acc[e.set] = (acc[e.set] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const activeSets = Object.entries(setCounts)
    .filter(([_, count]) => (count as number) >= 2)
    .map(([name, count]) => `${(count as number) >= 5 ? '5' : '2'}-Piece ${name}`)

  // Handlers
  const handleStatChange = (index: number, field: 'label'|'value', val: string) => {
    const newStats = [...stats]
    newStats[index] = { ...newStats[index], [field]: val }
    setStats(newStats)
  }

  const handleEchoChange = (index: number, field: string, val: string) => {
    const newEchoes = [...echoes]
    newEchoes[index] = { ...newEchoes[index], [field]: val }
    setEchoes(newEchoes)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (totalCost > 12) {
      alert("Invalid Build: Total Echo Cost cannot exceed 12.")
      return
    }
    setSubmitting(true)

    const finalBuild = { ...formData, notes: notesStr.split("\n").filter((n: string) => n.trim() !== "") }

    let savedBuildId = buildId

    if (buildId) {
      const { error } = await supabase.from('builds').update(finalBuild).eq('id', buildId)
      if (error) { alert(error.message); setSubmitting(false); return }
    } else {
      const { data, error } = await supabase.from('builds').insert(finalBuild).select().single()
      if (error) { alert(error.message); setSubmitting(false); return }
      savedBuildId = data.id
    }

    // Upsert Stats (delete old, insert new for simplicity)
    await supabase.from('build_stats').delete().eq('build_id', savedBuildId)
    const validStats = stats.filter(s => s.label && s.value).map(s => ({ 
      build_id: savedBuildId,
      label: s.label,
      value: s.value
    }))
    if (validStats.length > 0) {
      const { error: statError } = await supabase.from('build_stats').insert(validStats)
      if (statError) alert("Error saving stats: " + statError.message)
    }

    // Upsert Echoes
    await supabase.from('build_echoes').delete().eq('build_id', savedBuildId)
    const validEchoes = echoes.filter(e => e.echo_id).map(e => ({ 
      build_id: savedBuildId,
      echo_id: e.echo_id,
      echo_set: e.set, // Map the local state 'set' to the database column 'echo_set'
      main_stat: e.main_stat,
      substat: e.substat
    }))
    
    if (validEchoes.length > 0) {
      const { error: echoError } = await supabase.from('build_echoes').insert(validEchoes)
      if (echoError) alert("Error saving echoes: " + echoError.message)
    }

    router.push("/admin/dashboard")
    router.refresh()
  }

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading archive...</div>

  return (
    <form onSubmit={handleSubmit} className="frosted-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* 1. Core Details */}
      <div>
        <h2 style={{ fontSize: "1rem", color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>1. Core Configuration</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Builder Name</label>
            <input required type="text" value={formData.builder_name} onChange={e => setFormData({...formData, builder_name: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Builder Initials</label>
            <input required type="text" maxLength={2} value={formData.builder_initials} onChange={e => setFormData({...formData, builder_initials: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Resonator</label>
            <SearchableSelect items={resonators} value={formData.resonator_id} onChange={val => setFormData({...formData, resonator_id: val})} placeholder="Search resonator..." 
              renderItem={(item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                  <img src={`/resonators/${item.name.toLowerCase() === 'rover' ? `${item.element?.toLowerCase()}-rover` : assetSlug(item.name)}.webp`} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.1)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                  <span><span style={{ color: "var(--acid)", fontSize: "0.6rem", marginRight: "8px" }}>{item.element?.toUpperCase()}</span> {item.name}</span>
                </div>
              )} 
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Weapon</label>
            <SearchableSelect items={weapons} value={formData.weapon_id} onChange={val => setFormData({...formData, weapon_id: val})} placeholder="Search weapon..." 
              renderItem={(item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                  <img src={`/icons/${assetSlug(item.type || "")}.svg`} style={{ width: 18, height: 18, opacity: 0.8 }} onError={(e) => e.currentTarget.style.display = 'none'} />
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{"★".repeat(item.rarity || 4)}</span>
                </div>
              )} 
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Role</label><input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Level</label><input required type="text" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Rank</label><input required type="text" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
        </div>
      </div>

      {/* 2. Echoes */}
      <div style={{ paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1rem", color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>2. Echo Loadout</h2>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: totalCost > 12 ? "#ff4d4d" : "var(--muted)" }}>
              COST: <strong style={{ color: totalCost > 12 ? "#ff4d4d" : "#fff", fontSize: "1rem" }}>{totalCost} / 12</strong>
            </div>
            {activeSets.length > 0 && <div style={{ fontSize: "0.7rem", color: "var(--acid)", marginTop: "4px" }}>{activeSets.join(" + ")} Active</div>}
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {echoes.map((echo, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <SearchableSelect 
                items={echoesDict} value={echo.echo_id} onChange={val => handleEchoChange(idx, 'echo_id', val)} placeholder={`Echo ${idx + 1}`}
                renderItem={(item) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <img src={`/echoes/${assetSlug(item.name)}.webp`} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", background: "rgba(255,255,255,0.05)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                    <span style={{ flex: 1, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{item.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.7rem", flexShrink: 0 }}>{item.cost}</span>
                  </div>
                )}
              />
              <input type="text" placeholder="Set (e.g. Celestial Light)" value={echo.set} onChange={e => handleEchoChange(idx, 'set', e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
              <input type="text" placeholder="Main Stat" value={echo.main_stat} onChange={e => handleEchoChange(idx, 'main_stat', e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
              <input type="text" placeholder="Substat" value={echo.substat} onChange={e => handleEchoChange(idx, 'substat', e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Stats & Metadata */}
      <div style={{ paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1rem", color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>3. Final Stats</h2>
          <div style={{ background: "rgba(211,255,101,0.1)", padding: "4px 12px", borderRadius: "99px", color: "var(--acid)", fontSize: "0.8rem", fontWeight: "600" }}>
            DPS SCORE: {formData.score}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="Stat Label" value={stat.label} onChange={e => handleStatChange(idx, 'label', e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
              <input type="text" placeholder="Value (e.g. 70.5%)" value={stat.value} onChange={e => handleStatChange(idx, 'value', e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
            </div>
          ))}
          <button type="button" onClick={() => setStats([...stats, { label: "", value: "" }])} style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer" }}>+ Add Stat</button>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Primary Sonata Effect</label><input required type="text" value={formData.echo_set} onChange={e => setFormData({...formData, echo_set: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Headline</label><input required type="text" value={formData.headline} onChange={e => setFormData({...formData, headline: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Description</label><textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", minHeight: "60px" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Notes (One per line)</label><textarea value={notesStr} onChange={e => setNotesStr(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", minHeight: "80px" }} /></div>
        </div>
      </div>

      <div style={{ paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={submitting || totalCost > 12 || !formData.resonator_id || !formData.weapon_id}
          style={{
            padding: "12px 32px", borderRadius: "99px", background: "var(--acid)", color: "#111", fontWeight: "700",
            border: "none", cursor: (submitting || totalCost > 12 || !formData.resonator_id || !formData.weapon_id) ? "not-allowed" : "pointer",
            opacity: (submitting || totalCost > 12 || !formData.resonator_id || !formData.weapon_id) ? 0.5 : 1,
            fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase"
          }}
        >
          {submitting ? "Saving..." : (buildId ? "Update Build" : "Save Build")}
        </button>
      </div>
    </form>
  )
}
