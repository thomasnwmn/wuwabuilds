"use client";

import { useEffect, useState, type MouseEvent, useRef } from "react";

type Stat = { label: string; value: string };
type Echo = { cost: string; name: string; set: string; stat: string; substat: string; image?: string };
type Build = {
  id: string; builderId: string; name: string; initials: string; role: string; character: string;
  weapon: { name: string; type: string; rarity: number }; level: string; rank: string;
  headline: string; description: string; element: string; score: string; echoSet: string;
  stats: Stat[]; echoes: Echo[]; notes: string[]; image?: string;
};

function assetSlug(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function statIconName(label: string) {
  const normalized = assetSlug(label);
  const elements = ["aero", "glacio", "electro", "fusion", "spectro", "havoc"];
  const element = elements.find((name) => normalized.includes(name));
  if (element) return element;
  if (normalized.includes("crit-rate")) return "crit-rate";
  if (normalized.includes("crit")) return "crit-damage";
  if (normalized.includes("lib")) return "resonance-liberation";
  if (normalized.includes("skill")) return "resonance-skill";
  if (normalized.includes("energy")) return "energy-regen";
  if (normalized.includes("health") || normalized.includes("hp")) return "health";
  if (normalized.includes("def")) return "defense";
  return "attack";
}

function SparkMark() {
  return <svg viewBox="0 0 52 52" aria-hidden="true" className="spark-mark"><path d="M26 4 31.9 19l16.1 7-16.1 7L26 48l-5.9-15L4 26l16.1-7L26 4Z" /><path d="m26 14 2.8 9.2L38 26l-9.2 2.8L26 38l-2.8-9.2L14 26l9.2-2.8L26 14Z" className="spark-core" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" /></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5 }}><path d="M4 6l4 4 4-4" /></svg>;
}

function StatIcon({ label }: { label: string }) {
  return <img className="stat-svg" src={`/icons/${statIconName(label)}.svg`} alt="" />;
}

export default function BuildDashboard() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedBuilderId, setSelectedBuilderId] = useState<string | null>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    fetch(`/builds.json?v=${Date.now()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load builds");
        return response.json() as Promise<Build[]>;
      })
      .then((data) => {
        if (!isCurrent) return;
        setBuilds(data);
        const requestedId = new URLSearchParams(window.location.search).get("build");
        const currentBuild = data.find((build) => build.id === requestedId) ?? data[0];
        if (currentBuild) {
          setSelectedBuildId(currentBuild.id);
          setSelectedBuilderId(currentBuild.builderId);
        }
      })
      .catch(() => { if (isCurrent) setLoadError(true); });
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    function handlePopState() {
      const requestedId = new URLSearchParams(window.location.search).get("build");
      const currentBuild = builds.find((build) => build.id === requestedId) ?? builds[0];
      if (currentBuild) {
        setSelectedBuildId(currentBuild.id);
        setSelectedBuilderId(currentBuild.builderId);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [builds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getStatPercentage(label: string, valueStr: string) {
    const val = parseFloat(valueStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return 0;
  
    const normalized = label.toUpperCase();
    let min = 0;
    let max = 100;
  
    if (normalized.includes("CRIT. RATE") || normalized.includes("CRIT RATE")) {
      min = 5; max = 100;
    } else if (normalized.includes("CRIT. DMG") || normalized.includes("CRIT DMG")) {
      min = 150; max = 350;
    } else if (normalized.includes("ENERGY REGEN")) {
      min = 100; max = 250;
    } else if (normalized.includes("HP")) {
      min = 0; max = 30000;
    } else if (normalized.includes("ATK")) {
      min = 0; max = 3500;
    } else if (normalized.includes("DEF")) {
      min = 0; max = 2500;
    } else if (normalized.includes("DMG") || normalized.includes("BONUS")) {
      min = 0; max = 150;
    } else {
      min = 0; max = 100;
    }
  
    const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    return percentage;
  }

  function selectBuild(id: string) {
    setSelectedBuildId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("build", id);
    window.history.pushState(null, "", url);
    setIsDropdownOpen(false);
  }

  function selectBuilder(builderId: string) {
    setSelectedBuilderId(builderId);
    const firstBuild = builds.find(b => b.builderId === builderId);
    if (firstBuild) {
      selectBuild(firstBuild.id);
    }
  }

  function setNavGlow(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    button.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
    button.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
  }

  if (loadError) return <main className="status-message">Couldn&apos;t load <code>public/builds.json</code>.</main>;
  if (!builds.length || !selectedBuildId || !selectedBuilderId) return <main className="status-message"><span className="loading-orbit" />Loading your resonance archive…</main>;

  function getResonatorImage(b: Build) {
    if (b.image) return b.image;
    if (b.character.toLowerCase() === "rover") {
      return `/resonators/${b.element.toLowerCase()}-rover.webp`;
    }
    return `/resonators/${assetSlug(b.character)}.webp`;
  }

  const build = builds.find((entry) => entry.id === selectedBuildId) ?? builds[0];
  const resonatorImage = getResonatorImage(build);
  const weaponIcon = `/icons/${assetSlug(build.weapon.type)}.svg`;
  
  const uniqueBuilders = Array.from(new Set(builds.map(b => b.builderId))).map(id => builds.find(b => b.builderId === id)!);
  const builderBuilds = builds.filter(b => b.builderId === selectedBuilderId);

  return <main className="builds-app">
    {isModalOpen && (
      <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
        <div className="modal-content frosted-card" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
          <div className="modal-header">
            <h2>{build.character} - Full Stat Sheet</h2>
            <p className="modal-subtitle">{build.headline}</p>
          </div>
          <div className="modal-body">
            <div className="stat-list" key={build.id}>
              {build.stats.map((stat) => (
                <div className="stat-row" key={stat.label}>
                  <span className="stat-symbol"><StatIcon label={stat.label} /></span>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <div className="stat-line">
                    <i style={{ "--target-width": `${getStatPercentage(stat.label, stat.value)}%` } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    <div className="atmosphere atmosphere-one" /><div className="atmosphere atmosphere-two" /><div className="scanlines" />
    <nav className="topbar" aria-label="Builder profiles">
      <a className="brand" href="/" aria-label="Wuwa Builds home"><span className="brand-mark"><SparkMark /></span><span className="brand-name">WUWA <em>BUILDS</em></span></a>
      <div className="profile-nav">
        <span className="nav-label">BUILDERS</span>
        <div className="profile-pills">
          {uniqueBuilders.map((profile) => {
            const isActive = profile.builderId === selectedBuilderId;
            return <button className={`profile-pill${isActive ? " is-active" : ""}`} key={profile.builderId} onClick={() => selectBuilder(profile.builderId)} onMouseMove={setNavGlow} aria-current={isActive ? "page" : undefined}>
              <span className="profile-initials">{profile.initials}</span><span>{profile.name}</span>{isActive && <span className="active-pulse" />}
            </button>;
          })}
        </div>

        <span className="nav-label" style={{ marginLeft: "12px" }}>RESONATOR</span>
        <div className="dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
          <button className="dropdown-toggle" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
             <img src={resonatorImage} alt="" className="dropdown-toggle-img" onError={(event) => event.currentTarget.classList.add("asset-unavailable")} />
             <div className="dropdown-toggle-text">
               <span className="dropdown-element">{build.element.toUpperCase()}</span>
               <span className="dropdown-name">{build.character}</span>
             </div>
             <ChevronDownIcon />
          </button>
          
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {builderBuilds.map((b) => {
                const bImage = getResonatorImage(b);
                const isActive = b.id === selectedBuildId;
                return (
                  <button key={b.id} className={`dropdown-item ${isActive ? "is-active" : ""}`} onClick={() => selectBuild(b.id)}>
                    <img src={bImage} alt="" className="dropdown-item-img" onError={(event) => event.currentTarget.classList.add("asset-unavailable")} />
                    <div className="dropdown-item-info">
                      <span className="dropdown-item-element">{b.element}</span>
                      <span className="dropdown-item-name">{b.character}</span>
                    </div>
                    {isActive && <span className="active-pulse" style={{ marginLeft: "auto" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="topbar-status"><span /> LIVE ARCHIVE</div>
    </nav>

    <section className="build-content" aria-live="polite">
      <header className="profile-intro">
        <div className="eyebrow"><span /> BUILD REPOSITORY <b>•</b> {build.role}</div>
        <div className="title-row"><div><p className="profile-tag">PROFILE / {build.name.toUpperCase()}</p><h1>{build.character}<span className="accent-dot">.</span></h1></div><div className="build-score"><span>BUILD SCORE</span><strong>{build.score}</strong><small>OPTIMIZED</small></div></div>
        <p className="intro-copy">{build.headline} <span>{build.description}</span></p>
      </header>

      <div className="dashboard-grid">
        <section className="character-panel frosted-card" style={{ 
          backgroundImage: `linear-gradient(to top, rgba(18, 18, 21, 0.95) 0%, rgba(18, 18, 21, 0.4) 40%, transparent 100%), url(${resonatorImage})`, 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}>
          <div className="character-halo"><div className="halo-ring ring-one" /><div className="halo-ring ring-two" /></div><div className="character-index">01<span>/03</span></div><div className="element-orb"><span>{build.element.slice(0, 1)}</span></div><div className="character-ghost select-none" aria-hidden="true">{build.character.slice(0, 1)}</div>
          <div className="character-details"><p>PRIMARY RESONATOR</p><h2>{build.character}</h2><div className="character-meta"><span>{build.level}</span><i /> <span>{build.rank}</span><i /> <span>{build.element.toUpperCase()}</span></div></div><div className="panel-corner corner-tl" /><div className="panel-corner corner-br" />
        </section>

        <section className="loadout-panel frosted-card">
          <div className="card-heading"><span>02 / LOADOUT</span><p>CALIBRATED</p></div>
          <div className="weapon-display"><div className="weapon-glyph"><img src={weaponIcon} alt="" /></div><div><p>WEAPON</p><h2>{build.weapon.name}</h2><span>{build.weapon.type} <b>•</b> {"★".repeat(build.weapon.rarity)}</span></div><span className="weapon-level">Lv. 90</span></div>
          <div className="set-rule" /><div className="echo-set"><span>SONATA EFFECT</span><strong>{build.echoSet}</strong><em>5 / 5</em></div>
          <div className="echo-list">{build.echoes.map((echo) => {
            const echoImage = echo.image ?? `/echoes/${assetSlug(echo.name)}.webp`;
            return <article className="echo-row" key={`${echo.cost}-${echo.name}`}><span className="echo-cost">{echo.cost}</span><span className="echo-thumb"><img src={echoImage} alt="" onError={(event) => event.currentTarget.classList.add("asset-unavailable")} /></span><div><h3>{echo.name}</h3><p>{echo.set}</p></div><span className="echo-stat">{echo.stat}<small>{echo.substat}</small></span></article>;
          })}</div>
        </section>

        <section className="stats-panel frosted-card">
          <div className="card-heading"><span>03 / CORE SIGNAL</span><p>{build.element.toUpperCase()}</p></div>
          <div className="stat-list" key={build.id}>{build.stats.slice(0, 4).map((stat) => <div className="stat-row" key={stat.label}><span className="stat-symbol"><StatIcon label={stat.label} /></span><span>{stat.label}</span><strong>{stat.value}</strong><div className="stat-line"><i style={{ "--target-width": `${getStatPercentage(stat.label, stat.value)}%` } as React.CSSProperties} /></div></div>)}</div>
          <div className="stat-footer"><span>RATIO</span><strong>1 : 3.3</strong><span className="verified">◉ VERIFIED</span></div>
        </section>
      </div>

      <section className="field-notes"><div className="notes-title"><span>FIELD NOTES</span><p>LAST SYNCHRONIZED <b>NOW</b></p></div><div className="notes-list">{build.notes.map((note, index) => <p key={note}><span>0{index + 1}</span>{note}</p>)}</div><button className="view-button" onMouseMove={setNavGlow} onClick={() => setIsModalOpen(true)}>VIEW FULL BUILD <ArrowIcon /></button></section>
    </section>
  </main>;
}
