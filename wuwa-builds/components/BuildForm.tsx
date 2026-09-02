"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function assetSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getAssetUrl(folder: string, filename: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${folder}/${filename}`
}

const SONATA_EFFECTS = [
  "Freezing Frost", "Molten Rift", "Void Thunder", "Sierra Gale", "Celestial Light", "Havoc Eclipse",
  "Rejuvenating Glow", "Moonlit Clouds", "Endless Resonance", "Frosty Resolve", "Eternal Radiance",
  "Midnight Veil", "Empyrean Anthem", "Tidebreaking Courage", "Gusts of Welkin", "Flaming Clawprint",
  "Windward Pilgrimage", "Dream of the Lost", "Crown of Valor", "Law of Harmony", "Flamewing's Shadow",
  "Thread of Severed Fate", "Halo of Starry Radiance", "Pact of Neonlight Leap", "Rite of Gilded Revelation",
  "Trailblazing Star", "Chromatic Foam", "Sound of True Name", "Reel of Spliced Memories", "Wishes of Quiet Snowfall",
  "Shadow of Shattered Dreams", "Song of Feathered Trace", "Heart of Evil's Purge", "Lamp of Nether Road"
].map(name => ({ id: name, name }));

const ECHO_SUBSTATS = [
  "HP", "HP%", "ATK", "ATK%", "DEF", "DEF%", "CRIT. RATE", "CRIT. DMG", "Energy Regen",
  "Resonance Skill DMG Bonus", "Basic Attack DMG Bonus", "Heavy Attack DMG Bonus", "Resonance Liberation DMG Bonus"
];

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
        style={{
          width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.1)", color: selectedItem ? "#fff" : "var(--muted)",
          display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
          fontSize: "0.85rem", textAlign: "left"
        }}
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
  
  const [resonators, setResonators] = useState<DictionaryItem[]>([])
  const [weapons, setWeapons] = useState<DictionaryItem[]>([])
  const [echoesDict, setEchoesDict] = useState<DictionaryItem[]>([])
  const [builders, setBuilders] = useState<{id: string, name: string}[]>([])

  const initialFormState = initialData?.build ? {
    builder_id: initialData.build.builder_id || "",
    resonator_id: initialData.build.resonator_id || "",
    weapon_id: initialData.build.weapon_id || "",
    weapon_ascension: initialData.build.weapon_ascension || 1,
    role: initialData.build.role || "MAIN DAMAGE",
    level: initialData.build.level || "LEVEL 90",
    rank: initialData.build.rank || "SEQUENCE 0",
    headline: initialData.build.headline || "",
    description: initialData.build.description || "",
    score: initialData.build.score || 0,
    echo_set: initialData.build.echo_set || "",
    notes: initialData.build.notes || []
  } : {
    builder_id: "", resonator_id: "", weapon_id: "", weapon_ascension: 1,
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

  const [echoes, setEchoes] = useState<any[]>(
    initialData?.echoes 
      ? initialData.echoes.map((e: any) => {
          let loadedSubstats: any[] = [];
          if (Array.isArray(e.substats)) {
            loadedSubstats = e.substats;
          } else if (e.substat) {
            loadedSubstats = [{ label: "Unknown", value: e.substat }];
          }
          const paddedSubstats = Array(5).fill(null).map((_, i) => loadedSubstats[i] || { label: "", value: "" });
          return { ...e, set: e.echo_set || e.set || "", substats: paddedSubstats };
        }) 
      : Array(5).fill(null).map(() => ({ echo_id: "", set: "", main_stat: "", substats: Array(5).fill(null).map(() => ({ label: "", value: "" })) }))
  )

  useEffect(() => {
    async function loadDictionaries() {
      const [resData, wpData, echoData, buildersData] = await Promise.all([
        supabase.from("resonators").select("*").order("name"),
        supabase.from("weapons").select("*").order("name"),
        supabase.from("echoes").select("*").order("name"),
        supabase.from("builders").select("*").order("sort_order")
      ])
      if (resData.data) setResonators(resData.data)
      if (wpData.data) setWeapons(wpData.data)
      if (echoData.data) setEchoesDict(echoData.data)
      if (buildersData.data) setBuilders(buildersData.data)
      setLoading(false)
    }
    loadDictionaries()
  }, [])

  useEffect(() => {
    let score = 0
    stats.forEach(s => {
      const val = parseFloat(s.value.replace(/[^0-9.]/g, ''))
      if (isNaN(val)) return
      if (s.label.includes("CRIT. RATE")) score += val * 2
      if (s.label.includes("CRIT. DMG")) score += val
      if (s.label.includes("ATK")) score += val / 25
      if (s.label.includes("DMG")) score += val * 1.5
    })
    const normalized = Math.min(100, Math.max(0, score / 4.5))
    setFormData(prev => ({ ...prev, score: parseFloat(normalized.toFixed(1)) }))
  }, [stats])

  const totalCost = echoes.reduce((acc, e) => {
    if (!e.echo_id) return acc
    const dict = echoesDict.find(d => d.id === e.echo_id)
    if (!dict) return acc
    const costNum = parseInt(dict.cost || "0")
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

  const handleSubstatChange = (echoIndex: number, subIndex: number, field: 'label'|'value', val: string) => {
    const newEchoes = [...echoes]
    const newSubstats = [...newEchoes[echoIndex].substats]
    newSubstats[subIndex] = { ...newSubstats[subIndex], [field]: val }
    if (field === 'label' && val !== "") {
      const existing = newSubstats.filter((s, i) => i !== subIndex && s.label === val)
      if (existing.length > 0) {
        alert("An Echo cannot have duplicate substat types!");
        return;
      }
    }
    newEchoes[echoIndex].substats = newSubstats
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

    await supabase.from('build_echoes').delete().eq('build_id', savedBuildId)
    const validEchoes = echoes.filter(e => e.echo_id).map(e => ({ 
      build_id: savedBuildId,
      echo_id: e.echo_id,
      echo_set: e.set || e.echo_set || "",
      main_stat: e.main_stat || "",
      substats: e.substats.filter((s: any) => s.label && s.value)
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
    <form onSubmit={handleSubmit} className="frosted-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "32px", overflow: "visible" }}>
      <div>
        <h2 style={{ fontSize: "1rem", color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>1. Core Configuration</h2>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Builder Profile</label>
          <SearchableSelect 
            items={builders.map(b => ({ id: b.id, name: b.name }))} 
            value={formData.builder_id} 
            onChange={val => setFormData({...formData, builder_id: val})} 
            placeholder="Select Builder..." 
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Resonator</label>
            <SearchableSelect items={resonators} value={formData.resonator_id} onChange={val => setFormData({...formData, resonator_id: val})} placeholder="Search resonator..." 
              renderItem={(item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                  <img src={getAssetUrl('resonators', `${item.name.toLowerCase() === 'rover' ? `${item.element?.toLowerCase()}-rover` : assetSlug(item.name)}.webp`)} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.1)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
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
                  <img src={getAssetUrl('weapons', `${assetSlug(item.name)}.webp`)} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{"★".repeat(item.rarity || 4)}</span>
                </div>
              )} 
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Weapon Ascension</label>
            <SearchableSelect 
              items={[1,2,3,4,5].map(n => ({ id: n.toString(), name: `Ascension ${n}` }))} 
              value={formData.weapon_ascension.toString()} 
              onChange={val => setFormData({...formData, weapon_ascension: parseInt(val)})} 
              placeholder="Select Ascension..." 
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Role</label><input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Resonator Level</label><input required type="text" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
          <div><label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Resonance Chain (Rank)</label><input required type="text" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} /></div>
        </div>
      </div>

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
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", alignItems: "center" }}>
                <SearchableSelect 
                  items={echoesDict} value={echo.echo_id} onChange={val => handleEchoChange(idx, 'echo_id', val)} placeholder={`Echo ${idx + 1}`}
                  renderItem={(item) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                      <img src={getAssetUrl('echoes', `${assetSlug(item.name)}.webp`)} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", background: "rgba(255,255,255,0.05)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                      <span style={{ flex: 1, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{item.name}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.7rem", flexShrink: 0 }}>{item.cost}</span>
                    </div>
                  )}
                />
                <SearchableSelect 
                  items={SONATA_EFFECTS} value={SONATA_EFFECTS.find(s => s.name === echo.set)?.id || ""} onChange={val => handleEchoChange(idx, 'set', val)} placeholder="Sonata Effect"
                  renderItem={(item) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                      <img src={getAssetUrl('sonata', `${assetSlug(item.name)}.webp`)} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                      <span style={{ flex: 1, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{item.name}</span>
                    </div>
                  )}
                />
                <input type="text" placeholder="Main Stat" value={echo.main_stat} onChange={e => handleEchoChange(idx, 'main_stat', e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "4px" }}>
                {echo.substats && echo.substats.map((sub: any, subIdx: number) => (
                  <div key={subIdx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <SearchableSelect 
                      items={ECHO_SUBSTATS.filter(stat => !echo.substats.some((s: any, i: number) => i !== subIdx && s.label === stat)).map(name => ({ id: name, name }))} 
                      value={sub.label} 
                      onChange={val => handleSubstatChange(idx, subIdx, 'label', val)} 
                      placeholder="Substat..." 
                    />
                    <input 
                      type="text" 
                      placeholder="Value" 
                      value={sub.value} 
                      onChange={e => handleSubstatChange(idx, subIdx, 'value', e.target.value)} 
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.75rem" }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "6px", color: "#d8d9dd" }}>Primary Sonata Effect</label>
            <SearchableSelect 
              items={SONATA_EFFECTS} value={SONATA_EFFECTS.find(s => s.name === formData.echo_set)?.id || ""} onChange={val => setFormData({...formData, echo_set: val})} placeholder="Select Sonata Effect"
              renderItem={(item) => (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                  <img src={getAssetUrl('sonata', `${assetSlug(item.name)}.webp`)} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} onError={(e) => e.currentTarget.style.display = 'none'} />
                  <span style={{ flex: 1 }}>{item.name}</span>
                </div>
              )}
            />
          </div>
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
