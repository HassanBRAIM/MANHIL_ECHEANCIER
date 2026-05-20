import { useState, useEffect, useMemo, useRef } from "react";
import { supabase, loadAllData, saveEntity as supabaseSaveEntity, deleteEntity as supabaseDeleteEntity, saveTitre as supabaseSaveTitre, deleteTitre as supabaseDeleteTitre, updateTitreStatut, subscribeAll } from "./supabaseClient.js";

/* ═══════════════════════════════════════════════════════════
   EMPTY DATA (chargé depuis Supabase)
 ═══════════════════════════════════════════════════════════ */
const EMPTY_DATA = {
  clients: [],
  fournisseurs: [],
  banques: [],
  titres: [],
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
 ═══════════════════════════════════════════════════════════ */
const sortByName = arr => [...arr].sort((a,b) => (a.nom||"").localeCompare(b.nom||"", "fr"));

const fmt = n => new Intl.NumberFormat("fr-MA",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+" MAD";
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("fr-FR") : "–";
const todayStr = () => new Date().toISOString().split("T")[0];
const daysUntil = d => d ? Math.ceil((new Date(d)-new Date().setHours(0,0,0,0))/(86400000)) : null;

/* ═══════════════════════════════════════════════════════════
   STYLE CONSTANTS
 ═══════════════════════════════════════════════════════════ */
const NAV_BG   = "#0D2137";
const NAV_ACT  = "#1A5276";
const GOLD     = "#C9A84C";
const WHITE    = "#FFFFFF";
const LIGHT_BG = "#F4F6F9";
const CARD_BG  = "#FFFFFF";
const BORDER   = "#DEE2E6";
const TEXT_MAIN= "#212529";
const TEXT_MUT = "#6C757D";
const DANGER_C = "#DC3545";
const SUCCESS_C= "#28A745";
const WARN_C   = "#FFC107";

const s = {
  app:{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:LIGHT_BG, minHeight:"100vh", color:TEXT_MAIN },
  header:{ background:NAV_BG, color:WHITE, padding:"0 20px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200, boxShadow:"0 2px 8px rgba(0,0,0,0.2)" },
  logo:{ fontWeight:700, fontSize:"18px", color:GOLD, letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:"8px" },
  badge:{ background:"rgba(220,53,69,0.2)", color:"#FF8080", padding:"3px 10px", borderRadius:"12px", fontSize:"12px", fontWeight:600 },
  nav:{ background:NAV_BG, display:"flex", padding:"0 20px", borderBottom:"2px solid #0a1929", overflowX:"auto" },
  navBtn:(active)=>({ background:"none", border:"none", color:active?GOLD:"rgba(255,255,255,0.6)", padding:"10px 14px", cursor:"pointer", fontSize:"13px", fontWeight:active?700:400, borderBottom:active?`3px solid ${GOLD}`:"3px solid transparent", whiteSpace:"nowrap", transition:"all 0.15s" }),
  body:{ padding:"20px" },
  card:{ background:CARD_BG, borderRadius:"8px", border:`1px solid ${BORDER}`, padding:"20px", marginBottom:"16px" },
  cardTitle:{ fontWeight:600, fontSize:"15px", marginBottom:"14px", color:TEXT_MAIN, display:"flex", alignItems:"center", gap:"6px" },
  kpiGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"12px", marginBottom:"20px" },
  kpiCard:(accent)=>({ background:CARD_BG, border:`1px solid ${BORDER}`, borderTop:`3px solid ${accent}`, borderRadius:"8px", padding:"14px 16px" }),
  kpiNum:{ fontSize:"22px", fontWeight:700, margin:"4px 0 2px" },
  kpiLabel:{ fontSize:"12px", color:TEXT_MUT, fontWeight:500 },
  table:{ width:"100%", borderCollapse:"collapse", fontSize:"13px" },
  th:{ background:"#F8F9FA", color:TEXT_MAIN, fontWeight:600, padding:"10px 12px", textAlign:"left", borderBottom:`2px solid ${BORDER}`, whiteSpace:"nowrap", fontSize:"12px", textTransform:"uppercase", letterSpacing:"0.04em" },
  td:(nowrap)=>({ padding:"10px 12px", borderBottom:`1px solid #F0F0F0`, whiteSpace:nowrap?"nowrap":"normal" }),
  filterBar:{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:"8px", padding:"16px", marginBottom:"16px" },
  filterGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"10px", alignItems:"end" },
  label:{ display:"block", fontSize:"11px", fontWeight:600, color:TEXT_MUT, marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.03em" },
  input:{ width:"100%", padding:"8px 10px", border:`1px solid ${BORDER}`, borderRadius:"6px", fontSize:"13px", color:TEXT_MAIN, background:WHITE, outline:"none" },
  select:{ width:"100%", padding:"8px 10px", border:`1px solid ${BORDER}`, borderRadius:"6px", fontSize:"13px", color:TEXT_MAIN, background:WHITE, outline:"none", cursor:"pointer" },
  btn:(color)=>({ background:"none", border:`1px solid ${color==="#6C757D"?BORDER:color}`, color, borderRadius:"6px", padding:"5px 10px", fontSize:"12px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }),
  btnSolid:(bg)=>({ background:bg, border:"none", color:WHITE, borderRadius:"6px", padding:"7px 14px", fontSize:"12px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }),
  modalOverlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  modalBox:{ background:CARD_BG, borderRadius:"10px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 8px 30px rgba(0,0,0,0.18)" },
  modalHeader:{ background:NAV_BG, color:WHITE, padding:"12px 20px", borderRadius:"10px 10px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"15px" },
  modalBody:{ padding:"20px" },
  formGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
  subTab:(active)=>({ background:"none", border:"none", borderBottom:active?`2px solid ${NAV_BG}`:"2px solid transparent", color:active?NAV_BG:TEXT_MUT, padding:"8px 16px", cursor:"pointer", fontSize:"13px", fontWeight:active?600:400 }),
  alertRow:{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px", borderRadius:"6px", marginBottom:"6px", fontSize:"13px", flexWrap:"wrap" },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
 ═══════════════════════════════════════════════════════════ */

/* ── BADGES ─────────────────────────────────────────────── */
function SensBadge({ sens }) {
  const bg = sens==="recu"?"#D4EDDA":"#FFF3CD";
  const col = sens==="recu"?"#0A5C36":"#856404";
  return <span style={{ background:bg, color:col, padding:"2px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:700, whiteSpace:"nowrap" }}>{sens==="recu"?"📥 Reçu":"📤 Émis"}</span>;
}

function TypeBadge({ type }) {
  const bg = type==="cheque"?"#E8F0FE":"#F3E8FF";
  const col = type==="cheque"?"#1A5276":"#4A148C";
  return <span style={{ background:bg, color:col, padding:"2px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:700 }}>{type==="cheque"?"💳 Chèque":"📄 LDC"}</span>;
}

function StatusBadge({ statut }) {
  const map = {
    en_attente:{ bg:"#FFF3CD", col:"#856404", label:"⏳ En attente" },
    encaisse:  { bg:"#D4EDDA", col:"#0A5C36", label:"💰 Encaissé" },
    solde:     { bg:"#C6F6D5", col:"#22543D", label:"✅ Soldé" },
    impaye:    { bg:"#F8D7DA", col:"#842029", label:"🚨 Impayé" },
    garantie:  { bg:"#D6EAF8", col:"#1A5276", label:"🔒 Garantie" },
    sans_date: { bg:"#FDEBD0", col:"#935116", label:"📅 Sans date" },
  };
  const m = map[statut] || map.en_attente;
  return <span style={{ background:m.bg, color:m.col, padding:"3px 10px", borderRadius:"10px", fontSize:"11px", fontWeight:600, whiteSpace:"nowrap" }}>{m.label}</span>;
}

function EcheanceCell({ date }) {
  const days = daysUntil(date);
  const color = days === null ? TEXT_MUT : days < 0 ? DANGER_C : days <= 7 ? WARN_C : SUCCESS_C;
  return (
    <div>
      <div style={{ fontWeight:600 }}>{fmtDate(date)}</div>
      {days !== null && <div style={{ fontSize:"11px", color, fontWeight:600 }}>
        {days < 0 ? `${Math.abs(days)}j dépassé` : days === 0 ? "Aujourd'hui !" : `dans ${days}j`}
      </div>}
    </div>
  );
}

/* ── FILTER BAR ─────────────────────────────────────────── */
function FilterBar({ filters, setF, data, showSens=true }) {
  return (
    <div style={s.filterBar}>
      <div style={{ fontWeight:600, fontSize:"13px", color:TEXT_MUT, marginBottom:"10px" }}>🔍 Filtres</div>
      <div style={s.filterGrid}>
        <div>
          <label style={s.label}>Échéance du</label>
          <input type="date" style={s.input} value={filters.dateDebut} onChange={e=>setF("dateDebut",e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Échéance au</label>
          <input type="date" style={s.input} value={filters.dateFin} onChange={e=>setF("dateFin",e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Statut</label>
          <select style={s.select} value={filters.statut} onChange={e=>setF("statut",e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="encaisse">Encaissé</option>
            <option value="solde">Soldé</option>
            <option value="impaye">Impayé</option>
            <option value="garantie">Garantie</option>
            <option value="sans_date">Sans date</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Type</label>
          <select style={s.select} value={filters.type} onChange={e=>setF("type",e.target.value)}>
            <option value="">Tous types</option>
            <option value="cheque">Chèque</option>
            <option value="effet">Effet / LDC</option>
          </select>
        </div>
        {showSens && <div>
          <label style={s.label}>Sens</label>
          <select style={s.select} value={filters.sens} onChange={e=>setF("sens",e.target.value)}>
            <option value="">Tous</option>
            <option value="recu">Reçu (Clients)</option>
            <option value="emis">Émis (Fournisseurs)</option>
          </select>
        </div>}
        <div>
          <label style={s.label}>Tiers</label>
          <select style={s.select} value={filters.tierce} onChange={e=>setF("tierce",e.target.value)}>
            <option value="">Tous les tiers</option>
            <optgroup label="Clients">{sortByName(data.clients).map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</optgroup>
            <optgroup label="Fournisseurs">{sortByName(data.fournisseurs).map(f=><option key={f.id} value={f.id}>{f.nom}</option>)}</optgroup>
          </select>
        </div>
        <div>
          <label style={s.label}>Banque</label>
          <select style={s.select} value={filters.banque} onChange={e=>setF("banque",e.target.value)}>
            <option value="">Toutes les banques</option>
            {sortByName(data.banques).map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <button style={{...s.btnSolid("#6C757D"), fontSize:"12px", width:"100%"}} onClick={()=>setF("_reset",true)}>
            ✕ Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AUTOCOMPLETE ───────────────────────────────────────── */
function Autocomplete({ value, options, onChange, placeholder, displayKey="nom", idKey="id", extraKey }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o[idKey] === value);

  const filtered = options.filter(o =>
    (o[displayKey]||"").toLowerCase().includes(search.toLowerCase()) ||
    (extraKey && (o[extraKey]||"").toLowerCase().includes(search.toLowerCase()))
  );

  const displayVal = open ? search : (selected ? (selected[displayKey] + (extraKey ? ` – ${selected[extraKey]}` : "")) : "");

  return (
    <div style={{ position:"relative" }}>
      <input
        style={s.input}
        value={displayVal}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => { setSearch(""); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, maxHeight:"200px", overflowY:"auto", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:"0 0 6px 6px", zIndex:50, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
          {filtered.length === 0 && <div style={{ padding:"8px 12px", color:TEXT_MUT, fontSize:"13px" }}>Aucun résultat</div>}
          {filtered.map(o => (
            <div
              key={o[idKey]}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:"13px", background: o[idKey]===value ? "#E8F0FE" : WHITE, borderBottom:`1px solid #F0F0F0` }}
              onMouseDown={() => { onChange(o[idKey]); setSearch(""); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = "#F5F8FC"}
              onMouseLeave={e => e.currentTarget.style.background = o[idKey]===value ? "#E8F0FE" : WHITE}
            >
              {o[displayKey]}{extraKey && <span style={{ color:TEXT_MUT, marginLeft:"6px" }}>– {o[extraKey]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── TITRES TABLE ───────────────────────────────────────── */
function TitresTable({ titres, data, onEdit, onDelete, onStatut, showSens=true }) {
  const tierceName = id => [...data.clients,...data.fournisseurs].find(x=>x.id===id)?.nom || "–";
  const banqueName = id => data.banques.find(x=>x.id===id)?.nom || "–";

  if (titres.length === 0)
    return <div style={{ textAlign:"center", padding:"40px", color:TEXT_MUT, fontSize:"14px" }}>Aucun titre trouvé selon les critères de filtrage.</div>;

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>N° Titre</th>
            {showSens && <th style={s.th}>Sens</th>}
            <th style={s.th}>Type</th>
            <th style={s.th}>Tiers</th>
            <th style={s.th}>Banque</th>
            <th style={s.th}>Montant</th>
            <th style={s.th}>Dt Émission</th>
            <th style={s.th}>Échéance</th>
            <th style={s.th}>Statut</th>
            <th style={s.th}>Notes</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {titres.map((t,i)=>(
            <tr key={t.id} style={{ background:i%2===0?WHITE:"#FAFBFC" }}>
              <td style={s.td(false)}><span style={{ fontFamily:"monospace", fontWeight:600, color:"#0D2137", fontSize:"12px" }}>{t.numero}</span></td>
              {showSens && <td style={s.td(false)}><SensBadge sens={t.sens}/></td>}
              <td style={s.td(false)}><TypeBadge type={t.type}/></td>
              <td style={s.td(false)}><div style={{ fontWeight:500 }}>{tierceName(t.tierce)}</div></td>
              <td style={s.td(false)}><div style={{ fontSize:"12px" }}>{banqueName(t.banque)}</div></td>
              <td style={s.td(false)}><div style={{ fontWeight:700, color:"#0D2137", whiteSpace:"nowrap" }}>{fmt(t.montant)}</div></td>
              <td style={s.td(false)}><div style={{ fontSize:"12px" }}>{fmtDate(t.dateEmission)}</div></td>
              <td style={s.td(false)}><EcheanceCell date={t.dateEcheance}/></td>
              <td style={s.td(false)}><StatusBadge statut={t.statut}/></td>
              <td style={s.td(false)}><div style={{ fontSize:"12px", color:TEXT_MUT, maxWidth:"140px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.notes||"–"}</div></td>
              <td style={s.td(false)}>
                <div style={{ display:"flex", gap:"4px", flexWrap:"nowrap" }}>
                  <button style={s.btn("#0D2137")} onClick={()=>onEdit(t)} title="Modifier">✏️</button>
                  {["en_attente","garantie","sans_date"].includes(t.statut) && <>
                    <button style={s.btn(SUCCESS_C)} onClick={()=>onStatut(t.id, t.sens==="recu"?"encaisse":"solde")} title={t.sens==="recu"?"Marquer encaissé":"Marquer soldé"}>✅</button>
                    <button style={s.btn(DANGER_C)} onClick={()=>onStatut(t.id,"impaye")} title="Marquer impayé">🚨</button>
                  </>}
                  {(t.statut==="impaye"||t.statut==="encaisse"||t.statut==="solde") &&
                    <button style={s.btn(WARN_C)} onClick={()=>onStatut(t.id,"en_attente")} title="Remettre en attente">↩️</button>
                  }
                  {["garantie","sans_date"].includes(t.statut) &&
                    <button style={s.btn(WARN_C)} onClick={()=>onStatut(t.id,"en_attente")} title="Remettre en attente">↩️</button>
                  }
                  <button style={s.btn(DANGER_C)} onClick={()=>onDelete(t.id)} title="Supprimer">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── SUMMARY ROW ────────────────────────────────────────── */
function TotalsBar({ titres }) {
  const total = titres.reduce((s,t)=>s+t.montant,0);
  const att = titres.filter(t=>t.statut==="en_attente").reduce((s,t)=>s+t.montant,0);
  const ok = titres.filter(t=>["solde","encaisse"].includes(t.statut)).reduce((s,t)=>s+t.montant,0);
  const imp = titres.filter(t=>t.statut==="impaye").reduce((s,t)=>s+t.montant,0);
  return (
    <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", padding:"10px 0", borderTop:`1px solid ${BORDER}`, marginTop:"4px", fontSize:"12px", fontWeight:600 }}>
      <span>📋 {titres.length} titre(s) — Total : <b style={{ color:"#0D2137" }}>{fmt(total)}</b></span>
      <span style={{ color:WARN_C }}>⏳ En attente : {fmt(att)}</span>
      <span style={{ color:SUCCESS_C }}>✅ Soldés/Encaissés : {fmt(ok)}</span>
      {imp > 0 && <span style={{ color:DANGER_C }}>🚨 Impayés : {fmt(imp)}</span>}
    </div>
  );
}

/* ── TITRE MODAL ────────────────────────────────────────── */
function TitreModal({ mode, initial, data, onSave, onClose }) {
  const [f, setF] = useState({
    type:"cheque", sens:"recu", numero:"", montant:"", dateEmission:todayStr(),
    dateEcheance:"", tierce:"", banque:"", statut:"en_attente", notes:"", ...initial
  });
  const [saving, setSaving] = useState(false);
  const upd = (k,v) => setF(p=>({...p,[k]:v}));
  const tiercesDisp = sortByName(f.sens==="recu" ? data.clients : data.fournisseurs);
  const submit = async () => {
    if (!f.numero||!f.montant||!f.dateEcheance||!f.tierce||!f.banque) return alert("Veuillez remplir tous les champs obligatoires.");
    setSaving(true);
    try {
      await onSave({ ...f, montant:parseFloat(f.montant)||0, id:initial?.id||undefined });
    } catch (err) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    }
    setSaving(false);
  };
  return (
    <div style={s.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.modalBox}>
        <div style={s.modalHeader}>
          <span style={{ fontWeight:700 }}>{mode==="add"?"Nouveau Titre":"Modifier Titre"}</span>
          <button style={{ background:"none",border:"none",color:WHITE,fontSize:"20px",cursor:"pointer" }} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Type *</label>
              <select style={s.select} value={f.type} onChange={e=>upd("type",e.target.value)}>
                <option value="cheque">Chèque</option>
                <option value="effet">Effet / Lettre de change</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Sens *</label>
              <select style={s.select} value={f.sens} onChange={e=>upd("sens",e.target.value)}>
                <option value="recu">Reçu (Client)</option>
                <option value="emis">Émis (Fournisseur)</option>
              </select>
            </div>
            <div>
              <label style={s.label}>N° Titre *</label>
              <input style={s.input} value={f.numero} onChange={e=>upd("numero",e.target.value)} placeholder="CHQ-2026-XXX" />
            </div>
            <div>
              <label style={s.label}>Montant (MAD) *</label>
              <input type="number" style={s.input} value={f.montant} onChange={e=>upd("montant",e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label style={s.label}>Date d'émission</label>
              <input type="date" style={s.input} value={f.dateEmission} onChange={e=>upd("dateEmission",e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Date d'échéance *</label>
              <input type="date" style={s.input} value={f.dateEcheance} onChange={e=>upd("dateEcheance",e.target.value)} />
            </div>
            <div>
              <label style={s.label}>{f.sens==="recu"?"Client":"Fournisseur"} *</label>
              <Autocomplete
                value={f.tierce}
                options={tiercesDisp}
                onChange={v=>upd("tierce",v)}
                placeholder="Rechercher un tiers..."
              />
            </div>
            <div>
              <label style={s.label}>Banque *</label>
              <Autocomplete
                value={f.banque}
                options={sortByName(data.banques)}
                onChange={v=>upd("banque",v)}
                placeholder="Rechercher une banque..."
                extraKey="agence"
              />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={s.label}>Statut</label>
              <select style={s.select} value={f.statut} onChange={e=>upd("statut",e.target.value)}>
                <option value="en_attente">En attente</option>
                <option value="encaisse">Encaissé</option>
                <option value="solde">Soldé</option>
                <option value="impaye">Impayé</option>
                <option value="garantie">Garantie</option>
                <option value="sans_date">Sans date</option>
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={s.label}>Notes</label>
              <textarea style={{...s.input, height:"60px", resize:"vertical"}} value={f.notes} onChange={e=>upd("notes",e.target.value)} placeholder="Observations..." />
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px" }}>
            <button style={s.btn(TEXT_MUT)} onClick={onClose}>Annuler</button>
            <button style={s.btnSolid(NAV_BG)} onClick={submit} disabled={saving}>💾 {saving ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ENTITY MODAL ───────────────────────────────────────── */
function EntityModal({ type, mode, initial, onSave, onClose }) {
  const [f, setF] = useState({ nom:"", ice:"", tel:"", email:"", ville:"", ...initial });
  const [saving, setSaving] = useState(false);
  const upd = (k,v) => setF(p=>({...p,[k]:v}));
  const label = type==="clients"?"Client":"Fournisseur";
  const handleSave = async () => {
    if (!f.nom) return alert("Nom obligatoire");
    setSaving(true);
    try {
      await onSave({...f,id:initial?.id||undefined});
    } catch (err) {
      alert("Erreur : " + err.message);
    }
    setSaving(false);
  };
  return (
    <div style={s.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.modalBox}>
        <div style={s.modalHeader}>
          <span style={{ fontWeight:700 }}>{mode==="add"?`Nouveau ${label}`:`Modifier ${label}`}</span>
          <button style={{ background:"none",border:"none",color:WHITE,fontSize:"20px",cursor:"pointer" }} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.formGrid}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={s.label}>Raison sociale *</label>
              <input style={s.input} value={f.nom} onChange={e=>upd("nom",e.target.value)} />
            </div>
            <div><label style={s.label}>ICE</label><input style={s.input} value={f.ice} onChange={e=>upd("ice",e.target.value)} /></div>
            <div><label style={s.label}>Téléphone</label><input style={s.input} value={f.tel} onChange={e=>upd("tel",e.target.value)} /></div>
            <div><label style={s.label}>Email</label><input style={s.input} value={f.email} onChange={e=>upd("email",e.target.value)} /></div>
            <div><label style={s.label}>Ville</label><input style={s.input} value={f.ville} onChange={e=>upd("ville",e.target.value)} /></div>
          </div>
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px" }}>
            <button style={s.btn(TEXT_MUT)} onClick={onClose}>Annuler</button>
            <button style={s.btnSolid(NAV_BG)} onClick={handleSave} disabled={saving}>💾 {saving ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── BANQUE MODAL ───────────────────────────────────────── */
function BanqueModal({ mode, initial, onSave, onClose }) {
  const [f, setF] = useState({ nom:"", agence:"", rib:"", ...initial });
  const [saving, setSaving] = useState(false);
  const upd = (k,v) => setF(p=>({...p,[k]:v}));
  const handleSave = async () => {
    if (!f.nom) return alert("Nom obligatoire");
    setSaving(true);
    try {
      await onSave({...f,id:initial?.id||undefined});
    } catch (err) {
      alert("Erreur : " + err.message);
    }
    setSaving(false);
  };
  return (
    <div style={s.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={s.modalBox}>
        <div style={s.modalHeader}>
          <span style={{ fontWeight:700 }}>{mode==="add"?"Nouvelle Banque":"Modifier Banque"}</span>
          <button style={{ background:"none",border:"none",color:WHITE,fontSize:"20px",cursor:"pointer" }} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.formGrid}>
            <div style={{ gridColumn:"1/-1" }}><label style={s.label}>Nom banque *</label><input style={s.input} value={f.nom} onChange={e=>upd("nom",e.target.value)} /></div>
            <div><label style={s.label}>Agence</label><input style={s.input} value={f.agence} onChange={e=>upd("agence",e.target.value)} /></div>
            <div><label style={s.label}>RIB</label><input style={s.input} value={f.rib} onChange={e=>upd("rib",e.target.value)} /></div>
          </div>
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px" }}>
            <button style={s.btn(TEXT_MUT)} onClick={onClose}>Annuler</button>
            <button style={s.btnSolid(NAV_BG)} onClick={handleSave} disabled={saving}>💾 {saving ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ENTITY TABLE ───────────────────────────────────────── */
function EntityTable({ items, columns, onEdit, onDelete }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={s.table}>
        <thead>
          <tr>{columns.map(c=><th key={c.key} style={s.th}>{c.label}</th>)}<th style={s.th}>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((row,i)=>(
            <tr key={row.id} style={{ background:i%2===0?WHITE:"#FAFBFC" }}>
              {columns.map(c=><td key={c.key} style={s.td(false)}>{row[c.key]||"–"}</td>)}
              <td style={s.td(false)}>
                <div style={{ display:"flex", gap:"4px" }}>
                  <button style={s.btn("#0D2137")} onClick={()=>onEdit(row)}>✏️</button>
                  <button style={s.btn(DANGER_C)} onClick={()=>onDelete(row.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
          {items.length===0 && <tr><td colSpan={columns.length+1} style={{ textAlign:"center", padding:"30px", color:TEXT_MUT }}>Aucun enregistrement</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
 ═══════════════════════════════════════════════════════════ */
const INIT_FILTERS = { dateDebut:"", dateFin:"", statut:"", type:"", tierce:"", banque:"", sens:"" };

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [refTab, setRefTab] = useState("clients");
  const [filters, setFilters] = useState(INIT_FILTERS);
  const [modal, setModal] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [includeGarantieSansDate, setIncludeGarantieSansDate] = useState(false);

  /* ── Load from Supabase ───────────────── */
  const loadFromServer = async () => {
    try {
      const result = await loadAllData();
      setData(result);
      setDbError(null);
    } catch (err) {
      console.error("Erreur chargement Supabase :", err);
      setDbError(err.message);
      setData(EMPTY_DATA);
    }
    setLoaded(true);
  };

  useEffect(() => {
    loadFromServer();
  }, []);

  /* ── Realtime subscription ────────────── */
  useEffect(() => {
    if (!loaded) return;
    const unsubscribe = subscribeAll(() => {
      loadFromServer();
    });
    return unsubscribe;
  }, [loaded]);

  const setF = (k, v) => {
    if (k === "_reset") { setFilters(INIT_FILTERS); return; }
    setFilters(p => ({...p, [k]:v}));
  };

  /* Filtered titres */
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.titres.filter(t => {
      if (filters.dateDebut && t.dateEcheance < filters.dateDebut) return false;
      if (filters.dateFin   && t.dateEcheance > filters.dateFin)   return false;
      if (filters.statut    && t.statut !== filters.statut)         return false;
      if (filters.type      && t.type !== filters.type)             return false;
      if (filters.tierce    && t.tierce !== filters.tierce)         return false;
      if (filters.banque    && t.banque !== filters.banque)         return false;
      if (filters.sens      && t.sens !== filters.sens)             return false;
      return true;
    });
  }, [data, filters]);

  /* Stats */
  const stats = useMemo(() => {
    if (!data) return {};
    const t = data.titres;
    const activeStatuts = includeGarantieSansDate ? ["en_attente","garantie","sans_date"] : ["en_attente"];
    return {
      totalRecu:   t.filter(x=>x.sens==="recu" && !["solde","encaisse"].includes(x.statut)).reduce((s,x)=>s+x.montant,0),
      totalEmis:   t.filter(x=>x.sens==="emis" && !["solde","encaisse"].includes(x.statut)).reduce((s,x)=>s+x.montant,0),
      nbAttente:   t.filter(x=>x.statut==="en_attente").length,
      montAttente: t.filter(x=>x.statut==="en_attente").reduce((s,x)=>s+x.montant,0),
      nbAttenteRecu:  t.filter(x=>activeStatuts.includes(x.statut) && x.sens==="recu").length,
      montAttenteRecu:t.filter(x=>activeStatuts.includes(x.statut) && x.sens==="recu").reduce((s,x)=>s+x.montant,0),
      nbAttenteEmis:  t.filter(x=>activeStatuts.includes(x.statut) && x.sens==="emis").length,
      montAttenteEmis:t.filter(x=>activeStatuts.includes(x.statut) && x.sens==="emis").reduce((s,x)=>s+x.montant,0),
      nbGarantie:  t.filter(x=>x.statut==="garantie").length,
      montGarantie:t.filter(x=>x.statut==="garantie").reduce((s,x)=>s+x.montant,0),
      nbSansDate:  t.filter(x=>x.statut==="sans_date").length,
      montSansDate:t.filter(x=>x.statut==="sans_date").reduce((s,x)=>s+x.montant,0),
      nbImpaye:    t.filter(x=>x.statut==="impaye").length,
      montImpaye:  t.filter(x=>x.statut==="impaye").reduce((s,x)=>s+x.montant,0),
      nbSolde:     t.filter(x=>["solde","encaisse"].includes(x.statut)).length,
      prochains7:  t.filter(x=>activeStatuts.includes(x.statut) && daysUntil(x.dateEcheance)<=7 && daysUntil(x.dateEcheance)>=0),
      prochains30: t.filter(x=>activeStatuts.includes(x.statut) && daysUntil(x.dateEcheance)<=30 && daysUntil(x.dateEcheance)>7),
      depasses:    t.filter(x=>activeStatuts.includes(x.statut) && daysUntil(x.dateEcheance)<0),
    };
  }, [data, includeGarantieSansDate]);

  if (!loaded) return <div style={{ background:LIGHT_BG, height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:TEXT_MUT }}>Chargement...</div>;

  if (dbError) return (
    <div style={{ background:LIGHT_BG, height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:TEXT_MAIN, gap:"16px", padding:"40px" }}>
      <div style={{ fontSize:"48px" }}>🔌</div>
      <div style={{ fontWeight:700, fontSize:"18px" }}>Connexion à la base de données impossible</div>
      <div style={{ color:TEXT_MUT, fontSize:"14px", maxWidth:"500px", textAlign:"center" }}>{dbError}</div>
      <button style={s.btnSolid(NAV_BG)} onClick={loadFromServer}>🔄 Réessayer</button>
    </div>
  );

  /* CRUD */
  const tierceName = id => [...data.clients,...data.fournisseurs].find(x=>x.id===id)?.nom||"–";
  const banqueName = id => data.banques.find(x=>x.id===id)?.nom||"–";

  const saveTitre = async t => {
    const saved = await supabaseSaveTitre(t);
    setModal(null);
    return saved;
  };
  const delTitre = async id => {
    if (!window.confirm("Supprimer ce titre ?")) return;
    await supabaseDeleteTitre(id);
  };
  const statTitre = async (id, st) => {
    await updateTitreStatut(id, st);
  };

  const saveEntity = async (type, e) => {
    const saved = await supabaseSaveEntity(type, e);
    setModal(null);
    return saved;
  };
  const delEntity = async (type, id) => {
    if (!window.confirm("Supprimer ?")) return;
    await supabaseDeleteEntity(type, id);
  };

  /* Tab titres views */
  const getTabTitres = () => {
    let list = filtered;
    if (tab==="recus")   list = list.filter(t=>t.sens==="recu");
    if (tab==="emis")    list = list.filter(t=>t.sens==="emis");
    if (tab==="attente") list = list.filter(t=>t.statut==="en_attente");
    if (tab==="impayes") list = list.filter(t=>t.statut==="impaye");
    if (tab==="soldes")  list = list.filter(t=>["solde","encaisse"].includes(t.statut));
    return list;
  };

  /* ── TABS CONFIG ─────────────────────── */
  const TABS = [
    { id:"dashboard", label:"📊 Tableau de bord" },
    { id:"recus",     label:"📥 Reçus (Clients)" },
    { id:"emis",      label:"📤 Émis (Fournisseurs)" },
    { id:"attente",   label:`⏳ En attente ${stats.nbAttente>0?`(${stats.nbAttente})`:""}` },
    { id:"impayes",   label:`🚨 Impayés ${stats.nbImpaye>0?`(${stats.nbImpaye})`:""}` },
    { id:"soldes",    label:"✅ Soldés/Encaissés" },
    { id:"tous",      label:"📋 Tous les titres" },
    { id:"refs",      label:"🗂️ Référentiels" },
  ];

  /* ── RENDER ─────────────────────────── */
  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          🏦 CHÉQUIER PRO
          <span style={{ fontWeight:300, fontSize:"13px", color:"rgba(255,255,255,0.5)", marginLeft:"4px" }}>| Gestion des Échéances</span>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          {stats.depasses?.length > 0 && <span style={{...s.badge, background:"rgba(220,53,69,0.25)", color:"#FF8080"}}>🚨 {stats.depasses.length} échéance(s) dépassée(s)</span>}
          {stats.prochains7?.length > 0 && <span style={{...s.badge, background:"rgba(255,193,7,0.2)", color:"#FFC107"}}>⚠️ {stats.prochains7.length} dans 7j</span>}
          <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)" }}>{new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</span>
        </div>
      </header>

      {/* Nav */}
      <nav style={s.nav}>
        {TABS.map(t=>(
          <button key={t.id} style={s.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      {/* Body */}
      <main style={s.body}>

        {/* ── DASHBOARD ──────────────────── */}
        {tab==="dashboard" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"10px 16px", background:CARD_BG, borderRadius:"8px", border:`1px solid ${BORDER}`, fontSize:"13px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", userSelect:"none" }}>
                <input type="checkbox" checked={includeGarantieSansDate} onChange={e=>setIncludeGarantieSansDate(e.target.checked)} style={{ width:"16px", height:"16px", cursor:"pointer", accentColor:NAV_BG }} />
                <span>Inclure les chèques <b>Garantie</b> et <b>Sans date</b> dans le solde « En attente » et les alertes d'échéance</span>
              </label>
            </div>
            <div style={s.kpiGrid}>
              <div style={s.kpiCard(GOLD)}>
                <div style={s.kpiLabel}>📥 Reçus actifs (hors soldés)</div>
                <div style={{...s.kpiNum, color:"#1A5276"}}>{fmt(stats.totalRecu)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{data.titres.filter(x=>x.sens==="recu" && !["solde","encaisse"].includes(x.statut)).length} titre(s)</div>
              </div>
              <div style={s.kpiCard("#0D6EFD")}>
                <div style={s.kpiLabel}>📤 Émis actifs (hors soldés)</div>
                <div style={{...s.kpiNum, color:"#0D2137"}}>{fmt(stats.totalEmis)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{data.titres.filter(x=>x.sens==="emis" && !["solde","encaisse"].includes(x.statut)).length} titre(s)</div>
              </div>
              <div style={s.kpiCard(WARN_C)}>
                <div style={s.kpiLabel}>⏳ En attente — 📥 Reçus{includeGarantieSansDate ? " + Garantie/Sans date" : ""}</div>
                <div style={{...s.kpiNum, color:"#856404"}}>{fmt(stats.montAttenteRecu)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{stats.nbAttenteRecu} titre(s)</div>
              </div>
              <div style={s.kpiCard("#E6A817")}>
                <div style={s.kpiLabel}>⏳ En attente — 📤 Émis{includeGarantieSansDate ? " + Garantie/Sans date" : ""}</div>
                <div style={{...s.kpiNum, color:"#856404"}}>{fmt(stats.montAttenteEmis)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{stats.nbAttenteEmis} titre(s)</div>
              </div>
              <div style={s.kpiCard("#1A5276")}>
                <div style={s.kpiLabel}>🔒 Garantie</div>
                <div style={{...s.kpiNum, color:"#0D2137"}}>{fmt(stats.montGarantie)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{stats.nbGarantie} titre(s)</div>
              </div>
              <div style={s.kpiCard("#935116")}>
                <div style={s.kpiLabel}>📅 Sans date</div>
                <div style={{...s.kpiNum, color:"#6B3A0A"}}>{fmt(stats.montSansDate)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{stats.nbSansDate} titre(s)</div>
              </div>
              <div style={s.kpiCard(DANGER_C)}>
                <div style={s.kpiLabel}>🚨 Impayés</div>
                <div style={{...s.kpiNum, color:DANGER_C}}>{fmt(stats.montImpaye)}</div>
                <div style={{ fontSize:"12px", color:TEXT_MUT }}>{stats.nbImpaye} titre(s)</div>
              </div>
              <div style={s.kpiCard(SUCCESS_C)}>
                <div style={s.kpiLabel}>✅ Soldés / Encaissés</div>
                <div style={{...s.kpiNum, color:"#0A5C36"}}>{stats.nbSolde} titre(s)</div>
              </div>
              <div style={s.kpiCard("#6F42C1")}>
                <div style={s.kpiLabel}>🏦 Banques enregistrées</div>
                <div style={{...s.kpiNum, color:"#4A148C"}}>{data.banques.length}</div>
              </div>
            </div>

            {/* Alerts */}
            {stats.depasses?.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>🚨 Échéances dépassées (non soldées)</div>
                {stats.depasses.map(t=>(
                  <div key={t.id} style={{...s.alertRow, background:"#FFF5F5", border:`1px solid #FFCCCC`}}>
                    <span style={{ fontFamily:"monospace", fontWeight:700, color:"#842029", fontSize:"12px" }}>{t.numero}</span>
                    <span style={{ flex:1 }}>{tierceName(t.tierce)}</span>
                    <span style={{ fontWeight:700, color:DANGER_C }}>{fmt(t.montant)}</span>
                    <span style={{ fontSize:"12px", color:DANGER_C }}>Échéance : {fmtDate(t.dateEcheance)} ({Math.abs(daysUntil(t.dateEcheance))}j)</span>
                  </div>
                ))}
              </div>
            )}

            {stats.prochains7?.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>⚠️ Échéances dans les 7 prochains jours</div>
                {stats.prochains7.map(t=>(
                  <div key={t.id} style={{...s.alertRow, background:"#FFFBF0", border:`1px solid #FFE08A`}}>
                    <SensBadge sens={t.sens}/>
                    <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:"12px" }}>{t.numero}</span>
                    <span style={{ flex:1 }}>{tierceName(t.tierce)}</span>
                    <span style={{ fontWeight:700 }}>{fmt(t.montant)}</span>
                    <span style={{ fontSize:"12px", color:"#856404" }}>dans {daysUntil(t.dateEcheance)}j — {fmtDate(t.dateEcheance)}</span>
                    <span style={{ fontSize:"12px", color:TEXT_MUT }}>{banqueName(t.banque)}</span>
                  </div>
                ))}
              </div>
            )}

            {stats.prochains30?.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>📅 Échéances dans les 30 prochains jours</div>
                {stats.prochains30.map(t=>(
                  <div key={t.id} style={{...s.alertRow, background:"#F8F9FA", border:`1px solid #E9ECEF`}}>
                    <SensBadge sens={t.sens}/>
                    <span style={{ fontFamily:"monospace", fontWeight:600, fontSize:"12px" }}>{t.numero}</span>
                    <span style={{ flex:1 }}>{tierceName(t.tierce)}</span>
                    <span style={{ fontWeight:700 }}>{fmt(t.montant)}</span>
                    <span style={{ fontSize:"12px", color:TEXT_MUT }}>dans {daysUntil(t.dateEcheance)}j — {fmtDate(t.dateEcheance)}</span>
                    <span style={{ fontSize:"12px", color:TEXT_MUT }}>{banqueName(t.banque)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECUS / EMIS / EN ATTENTE / IMPAYES / SOLDES / TOUS ─── */}
        {["recus","emis","attente","impayes","soldes","tous"].includes(tab) && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px", marginBottom:"14px" }}>
              <div style={{ fontWeight:600, fontSize:"16px" }}>
                {tab==="recus"&&"📥 Titres reçus (Clients)"}
                {tab==="emis"&&"📤 Titres émis (Fournisseurs)"}
                {tab==="attente"&&"⏳ En attente"}
                {tab==="impayes"&&"🚨 Impayés"}
                {tab==="soldes"&&"✅ Soldés / Encaissés"}
                {tab==="tous"&&"📋 Tous les titres"}
              </div>
              <div style={{ display:"flex", gap:"8px" }}>
                <button style={s.btnSolid(NAV_BG)} onClick={()=>setModal({type:"titre",mode:"add",data:{}})}>+ Nouveau titre</button>
              </div>
            </div>
            <FilterBar filters={filters} setF={setF} data={data} showSens={tab==="tous"}/>
            <div style={s.card}>
              <TitresTable titres={getTabTitres()} data={data} onEdit={e=>setModal({type:"titre",mode:"edit",data:e})} onDelete={delTitre} onStatut={statTitre} showSens={tab==="tous"}/>
              <TotalsBar titres={getTabTitres()}/>
            </div>
          </div>
        )}

        {/* ── REFERENTIELS ────────────────── */}
        {tab==="refs" && (
          <div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px", borderBottom:`1px solid ${BORDER}` }}>
              <button style={s.subTab(refTab==="clients")} onClick={()=>setRefTab("clients")}>👤 Clients ({data.clients.length})</button>
              <button style={s.subTab(refTab==="fournisseurs")} onClick={()=>setRefTab("fournisseurs")}>🏭 Fournisseurs ({data.fournisseurs.length})</button>
              <button style={s.subTab(refTab==="banques")} onClick={()=>setRefTab("banques")}>🏦 Banques ({data.banques.length})</button>
            </div>

            {refTab==="clients" && (
              <div style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                  <div style={s.cardTitle}>👤 Clients</div>
                  <button style={s.btnSolid(NAV_BG)} onClick={()=>setModal({type:"clients",mode:"add",data:{}})}>+ Nouveau client</button>
                </div>
                <EntityTable
                  items={sortByName(data.clients)}
                  columns={[{key:"nom",label:"Raison sociale"},{key:"ice",label:"ICE"},{key:"tel",label:"Téléphone"},{key:"email",label:"Email"},{key:"ville",label:"Ville"}]}
                  onEdit={e=>setModal({type:"clients",mode:"edit",data:e})}
                  onDelete={id=>delEntity("clients",id)}
                />
              </div>
            )}

            {refTab==="fournisseurs" && (
              <div style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                  <div style={s.cardTitle}>🏭 Fournisseurs</div>
                  <button style={s.btnSolid(NAV_BG)} onClick={()=>setModal({type:"fournisseurs",mode:"add",data:{}})}>+ Nouveau fournisseur</button>
                </div>
                <EntityTable
                  items={sortByName(data.fournisseurs)}
                  columns={[{key:"nom",label:"Raison sociale"},{key:"ice",label:"ICE"},{key:"tel",label:"Téléphone"},{key:"email",label:"Email"},{key:"ville",label:"Ville"}]}
                  onEdit={e=>setModal({type:"fournisseurs",mode:"edit",data:e})}
                  onDelete={id=>delEntity("fournisseurs",id)}
                />
              </div>
            )}

            {refTab==="banques" && (
              <div style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
                  <div style={s.cardTitle}>🏦 Banques</div>
                  <button style={s.btnSolid(NAV_BG)} onClick={()=>setModal({type:"banques",mode:"add",data:{}})}>+ Nouvelle banque</button>
                </div>
                <EntityTable
                  items={sortByName(data.banques)}
                  columns={[{key:"nom",label:"Nom banque"},{key:"agence",label:"Agence"},{key:"rib",label:"RIB"}]}
                  onEdit={e=>setModal({type:"banques",mode:"edit",data:e})}
                  onDelete={id=>delEntity("banques",id)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {modal?.type==="titre" && <TitreModal mode={modal.mode} initial={modal.data} data={data} onSave={saveTitre} onClose={()=>setModal(null)}/>}
      {["clients","fournisseurs"].includes(modal?.type) && <EntityModal type={modal.type} mode={modal.mode} initial={modal.data} onSave={e=>saveEntity(modal.type,e)} onClose={()=>setModal(null)}/>}
      {modal?.type==="banques" && <BanqueModal mode={modal.mode} initial={modal.data} onSave={e=>saveEntity("banques",e)} onClose={()=>setModal(null)}/>}
    </div>
  );
}
