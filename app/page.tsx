'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';

const STAGES = [
  { short: 'Baseline', title: 'Normal operations', subtitle: 'What Royal Duke keeps alive', pressure: 62, event: 'NOMINAL TRAFFIC' },
  { short: 'Open Window', title: 'The Open Window', subtitle: 'Vendor access becomes initial access', pressure: 61.8, event: 'VALID VENDOR SESSION' },
  { short: 'The Pivot', title: 'The Pivot', subtitle: 'The enterprise route reaches OT', pressure: 61.2, event: 'OT ROUTE DISCOVERED' },
  { short: 'Illusion', title: 'The Illusion', subtitle: 'The operator screen stops telling the truth', pressure: 37, event: 'VALUES DIVERGING' },
  { short: 'Physics', title: 'The Physics Breach', subtitle: 'A network write changes the process', pressure: 27, event: 'PLC WRITE OBSERVED' },
  { short: 'Fallout', title: 'The Fallout', subtitle: 'Cooling loss propagates to campuses', pressure: 21, event: 'CAMPUS LINKS LOST' },
] as const;

const NODES = [
  { id: 'vendor', label: 'VENDOR ACCESS', pos: [38.96, -77.66] as [number, number], reveal: 0 },
  { id: 'hq', label: 'ROYAL DUKE HQ / EMS', pos: [38.96, -77.35] as [number, number], reveal: 0 },
  { id: 'ashburn', label: 'ASHBURN SUBSTATION', pos: [39.04, -77.49] as [number, number], reveal: 2 },
  { id: 'water', label: 'WATER SYSTEM', pos: [38.9, -77.53] as [number, number], reveal: 2 },
  { id: 'south', label: 'SOUTH SUBSTATION', pos: [38.76, -77.46] as [number, number], reveal: 4 },
  { id: 'tysons', label: 'TYSONS CAMPUS', pos: [38.92, -77.23] as [number, number], reveal: 5 },
] as const;

const EDGES = [
  ['vendor', 'hq', 1], ['hq', 'ashburn', 2], ['hq', 'water', 2],
  ['hq', 'south', 4], ['water', 'tysons', 5],
] as const;

const TERMINAL = [
  ['[OK] P-101 running', '[OK] Discharge pressure 62.0 PSI', '[OK] Alarm queue clear'],
  ['[AUTH] Third-party identity accepted', '[WARN] MFA policy: not enforced', '[SESSION] Corporate access granted'],
  ['[ROUTE] Enterprise → control zone reachable', '[DISCOVERY] Modbus TCP / 502 observed', '[RISK] No enforced IT/OT boundary'],
  ['[HMI] Displayed pressure: 62.0 PSI', '[SENSOR] Independent pressure: 37.0 PSI', '[ALERT] Operator view cannot be trusted'],
  ['[PLC] Unauthorized process write observed', '[PROCESS] P-101 command changed', '[SAFETY] Pressure falling below minimum'],
  ['[COOLING] Campus reserve depleted', '[THERMAL] Emergency shutdown initiated', '[IMPACT] Regional digital services at risk'],
] as const;

const DEFENSES = [
  { id: 'mfa', title: 'Vendor MFA + JIT access', cost: 30, stage: 1 },
  { id: 'pam', title: 'Recorded privileged sessions', cost: 120, stage: 1 },
  { id: 'segmentation', title: 'OT DMZ + security perimeter', cost: 180, stage: 2 },
  { id: 'monitoring', title: 'Historian integrity monitoring', cost: 120, stage: 3 },
  { id: 'telemetry', title: 'Independent process telemetry', cost: 80, stage: 3 },
  { id: 'safety', title: 'PLC allow-listing + safety logic', cost: 90, stage: 4 },
] as const;

const EVIDENCE = [
  [0, 'Normal operating pressure established at 58–64 PSI'],
  [1, 'Vendor identity has no enforced MFA or expiration'],
  [2, 'Corporate route reaches the OT control zone'],
  [2, 'Modbus traffic observed between HMI and PLC'],
  [3, 'Operator pressure diverges from physical telemetry'],
  [4, 'Unauthorized PLC process change confirmed'],
  [5, 'Cooling loss propagates to campus shutdowns'],
] as const;

export default function Home() {
  const [stage, setStage] = useState(0);
  const [defenseOpen, setDefenseOpen] = useState(false);
  const [selectedDefenses, setSelectedDefenses] = useState<string[]>([]);
  const [budgetError, setBudgetError] = useState('');
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const current = STAGES[stage];
  const deceptive = stage >= 3;
  const operatorPressure = deceptive ? 62 : current.pressure;
  const spend = DEFENSES.reduce((sum, defense) => sum + (selectedDefenses.includes(defense.id) ? defense.cost : 0), 0);
  const blockStage = DEFENSES.filter((defense) => selectedDefenses.includes(defense.id)).reduce((earliest, defense) => Math.min(earliest, defense.stage), Infinity);
  const contained = blockStage !== Infinity && stage >= blockStage;
  const terminalLines = contained
    ? [`[CONTROL] ${DEFENSES.find((defense) => selectedDefenses.includes(defense.id) && defense.stage === blockStage)?.title}`, `[RESULT] Attack contained at Stage ${blockStage}`, '[IMPACT] Physical process remains inside safe limits']
    : TERMINAL[stage];

  function toggleDefense(id: string) {
    const defense = DEFENSES.find((item) => item.id === id);
    if (!defense) return;
    const selected = selectedDefenses.includes(id);
    if (!selected && spend + defense.cost > 500) {
      setBudgetError(`Budget exceeded. Remove a control before adding ${defense.title}.`);
      return;
    }
    setBudgetError('');
    setSelectedDefenses((items) => selected ? items.filter((item) => item !== id) : [...items, id]);
  }

  useEffect(() => {
    let cancelled = false;
    async function drawMap() {
      const L = await import('leaflet');
      if (cancelled || !mapElementRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(mapElementRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
          .setView([38.94, -77.43], 9.5);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: '&copy; OpenStreetMap contributors' }).addTo(mapRef.current);
      }
      const map = mapRef.current;
      map.setView(stage === 3 ? [38.96, -77.4] : [38.94, -77.43], stage === 3 ? 10.4 : 9.5, { animate: true });
      overlayRef.current?.remove();
      const group = L.layerGroup().addTo(map);
      overlayRef.current = group;
      const byId = Object.fromEntries(NODES.map((node) => [node.id, node]));
      EDGES.forEach(([fromId, toId, reveal]) => {
        if (stage < reveal) return;
        L.polyline([byId[fromId].pos, byId[toId].pos], { color: '#f45b69', weight: 2, opacity: 0.75, dashArray: stage === reveal ? '7 8' : undefined }).addTo(group);
      });
      NODES.forEach((node) => {
        if (stage < node.reveal) return;
        const compromised = stage > 0 && (node.id === 'vendor' || node.id === 'hq' || node.reveal <= stage);
        const icon = L.divIcon({ className: '', html: `<div class="range-marker${compromised ? ' is-hot' : ''}"><span></span><b>${node.label}</b></div>`, iconSize: [150, 46], iconAnchor: [16, 16] });
        L.marker(node.pos, { icon, interactive: false }).addTo(group);
      });
    }
    drawMap();
    return () => { cancelled = true; };
  }, [stage]);

  return (
    <main className="range-shell">
      <header className="range-header">
        <div><p className="eyebrow">Auburn AIS · Cyber Range</p><h1>Royal Duke: When the Brainstem Bleeds</h1></div>
        <div className="header-actions">
          <div className="mission-clock"><span>MISSION</span><strong>00:{String(stage * 8).padStart(2, '0')}:00</strong></div>
          <button className="defense-launch" onClick={() => setDefenseOpen(true)}>Defend Royal Duke · ${spend}K</button>
        </div>
      </header>
      <section className="mission-strip" aria-label="Scenario stages">
        {STAGES.map((item, index) => <button key={item.short} className={index === stage ? 'is-active' : index < stage ? 'is-done' : ''} onClick={() => setStage(index)}><span>{String(index).padStart(2, '0')}</span>{item.short}</button>)}
      </section>
      <section className="range-grid">
        <article className="map-surface">
          <div ref={mapElementRef} className="map-canvas" aria-label="Northern Virginia scenario map" />
          <div className="telemetry-row" aria-live="polite">
            <Telemetry label="Operator view" value={`${operatorPressure.toFixed(1)} PSI`} detail={deceptive ? 'P-101 RUNNING · ALARMS NONE' : 'PROCESS NOMINAL'} alert={false} />
            <Telemetry label="Network view" value={current.event} detail={stage === 0 ? 'HMI ↔ PLC READS' : current.subtitle} alert={stage >= 3} />
            <Telemetry label="Physical truth" value={`${current.pressure.toFixed(1)} PSI`} detail={stage >= 4 ? 'FLOW FALLING · PUMP OFF' : 'FLOW 11,480 GPM · PUMP ON'} alert={current.pressure < 52} />
          </div>
          <p className="map-note">© OpenStreetMap contributors · Royal Duke assets are fictional training locations shown at city-level precision.</p>
        </article>
        <aside className="mission-panel">
          <div className="stage-copy"><p className="eyebrow">Stage {stage} / 5</p><h2>{current.title}</h2><p>{current.subtitle}</p></div>
          {contained && <div className="contained-banner"><span>Attack contained</span><strong>Stage {blockStage} · Physical impact prevented</strong></div>}
          <div className="terminal" aria-live="polite">
            <div className="terminal-bar"><i /><i /><i /><span>royal-duke-range</span></div>
            <div className="terminal-body">{terminalLines.map((line, index) => <p key={line} className={index === 2 && stage > 0 && !contained ? 'warn' : ''}>{line}</p>)}<span className="cursor">█</span></div>
          </div>
          <div className="mission-actions"><button className="secondary" onClick={() => setStage(0)}>Reset</button><button className="primary" onClick={() => setStage((value) => Math.min(5, value + 1))}>{stage === 5 ? 'Review impact' : 'Advance mission'}</button></div>
        </aside>
      </section>
      <div className={`defense-backdrop${defenseOpen ? ' is-open' : ''}`} onClick={() => setDefenseOpen(false)} />
      <aside className={`defense-drawer${defenseOpen ? ' is-open' : ''}`} aria-hidden={!defenseOpen}>
        <div className="drawer-head"><div><p className="eyebrow">Phase II</p><h2>Defend Royal Duke</h2></div><button onClick={() => setDefenseOpen(false)} aria-label="Close defense planner">Close</button></div>
        <p className="drawer-intro">Spend no more than $500K, replay the same deterministic attack, and prove where your controls break the chain.</p>
        <div className="budget"><div><span>Defense budget</span><strong>${spend}K / $500K</strong></div><i><b style={{ width: `${spend / 5}%` }} /></i><p role="alert">{budgetError}</p></div>
        <div className="defense-list">
          {DEFENSES.map((defense) => {
            const selected = selectedDefenses.includes(defense.id);
            return <button key={defense.id} className={selected ? 'is-selected' : ''} aria-pressed={selected} onClick={() => toggleDefense(defense.id)}><span className="defense-check">{selected ? '✓' : '+'}</span><span><strong>{defense.title}</strong><small>${defense.cost}K · Stops Stage {defense.stage}</small></span></button>;
          })}
        </div>
        <section className="evidence-book"><p className="eyebrow">Evidence notebook</p><ul>{EVIDENCE.map(([evidenceStage, text]) => <li key={text} className={stage >= evidenceStage ? 'is-found' : ''}>{stage >= evidenceStage ? '✓' : '○'} <span>{text}</span></li>)}</ul></section>
        <div className="drawer-result"><span>{blockStage === Infinity ? 'Attack path exposed' : `Projected stop: Stage ${blockStage}`}</span><p>{blockStage === Infinity ? 'No selected control currently breaks the chain.' : 'Replay the scenario to test the earliest selected control.'}</p></div>
        <button className="replay-button" onClick={() => { setStage(blockStage === Infinity ? 5 : blockStage); setDefenseOpen(false); }}>Replay deterministic attack</button>
      </aside>
    </main>
  );
}

function Telemetry({ label, value, detail, alert }: { label: string; value: string; detail: string; alert: boolean }) {
  return <div className={`telemetry-card${alert ? ' is-alert' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
