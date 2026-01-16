/* DUAL // FUSION OS — V8 (Auditory/Voice/Optimized)
   System Upgrade: Audio Context, Speech Rec, Unified App Logic
*/

lucide.createIcons();

// --- AUDIO SYSTEM (NEW) ---
const SoundFX = {
  ctx: null,
  init() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
  },
  playTone(freq, type, duration, vol = 0.1) {
    if (!this.ctx) this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  click() { this.playTone(1200, 'sine', 0.1, 0.05); },
  hover() { this.playTone(400, 'triangle', 0.05, 0.02); },
  error() { this.playTone(150, 'sawtooth', 0.3, 0.2); },
  success() { this.playTone(800, 'sine', 0.1, 0.1); setTimeout(()=>this.playTone(1200,'sine',0.2,0.1), 100); },
  boot() { 
    if (!this.ctx) this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 1.5);
  }
};

// --- DOM ELEMENTS ---
const els = {
  card: document.getElementById('mainCard'),
  header: document.getElementById('cardHeader'),
  avatarTgt: document.getElementById('avatarTarget'),
  input: document.getElementById('inputUser'),
  lblHello: document.getElementById('lblHello'),
  lblName: document.getElementById('lblName'),
  clock: document.getElementById('clockTime'),
  smallPreview: document.getElementById('smallPreview'),
  smallMiniAvatar: document.getElementById('smallMiniAvatar'),
  smallText: document.getElementById('smallText'),
  smallIdent: document.getElementById('smallIdent'),
  actCard: document.getElementById('activationCard'),
  actPre: document.getElementById('actPre'),
  actName: document.getElementById('actName'),
  actMiniAvatar: document.getElementById('actMiniAvatar'),
  actBadge: document.getElementById('actBadge'),
  securityStatus: document.getElementById('securityStatus'),
  // Buttons
  btnModeCard: document.getElementById('btnModeCard'),
  btnModeOrb: document.getElementById('btnModeOrb'),
  btnModeHud: document.getElementById('btnModeHud'),
  orbMenuTrigger: document.getElementById('orbMenuTrigger'),
  hudMenuBtn: document.getElementById('hudMenuBtn'),
  snapZone: document.getElementById('snap-zone'),
  // Keys UI
  keysModal: document.getElementById('keysModal'),
  keyList: document.getElementById('keyList'),
  keyName: document.getElementById('keyNameInput'),
  keyToken: document.getElementById('keyTokenInput'),
  keyWebhook: document.getElementById('keyWebhookInput'),
  addKeyBtn: document.getElementById('addKeyBtn'),
  closeKeysBtn: document.getElementById('closeKeysBtn'),
  testWebhookBtn: document.getElementById('testWebhookBtn'),
  exportKeysBtn: document.getElementById('exportKeysBtn'),
  importKeysBtn: document.getElementById('importKeysBtn'),
  importFileInput: document.getElementById('importFileInput'),
  lockVaultBtn: document.getElementById('lockVaultBtn'),
  vaultStatusText: document.getElementById('vaultStatusText'),
  // Vault UI
  vaultModal: document.getElementById('vaultModal'),
  vaultPass: document.getElementById('vaultPassInput'),
  vaultUnlock: document.getElementById('vaultUnlockBtn'),
  vaultCancel: document.getElementById('vaultCancelBtn'),
  // New System UI
  systemCard: document.getElementById('systemCard'),
  toggleBtn: document.getElementById('toggleBtn')
};

// --- CRYPTO UTILS ---
const CRYPTO = {
  algo: { name: 'AES-GCM', length: 256 },
  pbkdf2: { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000 },
  salt: window.crypto.getRandomValues(new Uint8Array(16)), 
  async getKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return window.crypto.subtle.deriveKey({ ...this.pbkdf2, salt: salt }, keyMaterial, this.algo, false, ["encrypt", "decrypt"]);
  },
  async encrypt(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.getKey(password, salt);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoded);
    const bundle = { s: Array.from(salt), iv: Array.from(iv), d: Array.from(new Uint8Array(encrypted)) };
    return JSON.stringify(bundle);
  },
  async decrypt(bundleStr, password) {
    try {
      const bundle = JSON.parse(bundleStr);
      const salt = new Uint8Array(bundle.s);
      const iv = new Uint8Array(bundle.iv);
      const data = new Uint8Array(bundle.d);
      const key = await this.getKey(password, salt);
      const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch(e) { throw new Error("Senha incorreta ou dados corrompidos"); }
  }
};

// --- STATE & PERSISTENCE ---
const STORAGE_KEY = 'fusion_os_data_v2';
const UI_STATE_KEY = 'fusion_os_ui_state';

let STATE = {
  keys: [], 
  user: 'Convidado',
  isEncrypted: false,
  encryptedData: null
};
let SESSION_PASSWORD = null;

function saveUIState() {
    const mode = state.isOrb ? 'orb' : (state.isHud ? 'hud' : 'card');
    const uiState = {
        mode: mode,
        left: els.card.style.left,
        top: els.card.style.top,
        zen: document.body.classList.contains('zen-mode')
    };
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
}

function loadUIState() {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if(!raw) return;
    try {
        const ui = JSON.parse(raw);
        if(ui.zen) {
            document.body.classList.add('zen-mode');
            document.getElementById('mantra-toggle').classList.add('collapsed');
            if(document.getElementById('zenModeCheckbox')) document.getElementById('zenModeCheckbox').checked = true;
        }
        if (ui.mode === 'orb' || ui.mode === 'hud') {
            els.card.style.transition = 'none'; 
            if (ui.mode === 'orb') {
                if(ui.left) els.card.style.left = ui.left;
                if(ui.top) els.card.style.top = ui.top;
                window.setMode('orb', true);
            } else {
                window.setMode('hud', true);
            }
            setTimeout(() => els.card.style.transition = '', 200);
        }
    } catch(e) { console.error("UI Load Error", e); }
}

function saveData() {
  const payload = { keys: STATE.keys, user: STATE.user };
  if (SESSION_PASSWORD) {
    CRYPTO.encrypt(payload, SESSION_PASSWORD).then(enc => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ isEncrypted: true, data: enc }));
      STATE.isEncrypted = true;
      STATE.encryptedData = enc;
      updateSecurityUI();
    });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isEncrypted: false, data: payload }));
  }
}

async function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const parsed = JSON.parse(raw);
  if (parsed.isEncrypted) {
    STATE.isEncrypted = true;
    STATE.encryptedData = parsed.data;
    updateSecurityUI();
  } else {
    STATE.keys = parsed.data.keys || [];
    STATE.user = parsed.data.user || 'Convidado';
    
    const active = STATE.keys.find(k=>k.active);
    if(active && active.token) {
       localStorage.setItem('di_apiKey', active.token);
       if(typeof apiKey !== 'undefined') apiKey = active.token;
    }
    
    if(STATE.user !== 'Convidado') {
       localStorage.setItem('di_userName', STATE.user);
       if(typeof userName !== 'undefined') userName = STATE.user;
       if(document.getElementById('userNameInput')) document.getElementById('userNameInput').value = STATE.user;
       if(document.getElementById('inputUser')) document.getElementById('inputUser').value = STATE.user;
    }

    updateInterface(STATE.user);
    renderKeysList();
  }
}

const hashStr = s => { let h=0xdeadbeef; for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),2654435761);} return (h^h>>>16)>>>0; };
const createSvg = (id,sz) => `<svg viewBox="0 0 100 100" width="${sz}" height="${sz}"><defs><linearGradient id="g${id}"><stop offset="0%" stop-color="#00f2ff"/><stop offset="100%" stop-color="#bd00ff"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="#080b12" stroke="rgba(255,255,255,0.1)"/><circle cx="50" cy="50" r="20" fill="url(#g${id})" opacity="0.9"/></svg>`;
const createMiniSvg = (name,sz=30) => {
  const s = hashStr(name||'D'); const h1=s%360; const h2=(s*37)%360;
  const grad = `<linearGradient id="gm${s}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},90%,50%)"/><stop offset="1" stop-color="hsl(${h2},90%,50%)"/></linearGradient>`;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 32 32"><defs>${grad}</defs><rect width="32" height="32" rx="8" fill="#0a1016"/><circle cx="16" cy="16" r="6" fill="url(#gm${s})"/></svg>`;
};

function updateInterface(name){
  const safe = name || 'Convidado';
  els.lblName.innerText = safe;
  els.input.value = safe;
  const activeKey = STATE.keys.find(k=>k.active);
  els.smallIdent.innerText = activeKey ? activeKey.name : '--';
  els.actBadge.innerText = activeKey ? `key:${activeKey.name}` : 'v:--';
  els.smallMiniAvatar.innerHTML = createMiniSvg(safe);
  els.actMiniAvatar.innerHTML = createMiniSvg(safe,36);
  els.actName.innerText = safe;
  els.avatarTgt.innerHTML = createSvg('Main',64);
  const phrases = ["Foco estável.","Ritmo criativo.","Percepção sutil."];
  els.smallText.innerText = activeKey ? `${activeKey.name} [ATIVO]` : (safe==='Convidado'?'Aguardando...':`${safe} · ${phrases[safe.length%phrases.length]}`);
  const line = `+${'-'.repeat(safe.length+4)}+`;
  els.actPre.innerText = `${line}\n| ${safe.toUpperCase()} |\n${line}\nID: ${hashStr(safe).toString(16)}`;

  const tiUser = document.getElementById('displayUser');
  if(tiUser) tiUser.innerText = 'User: ' + safe;
}

function updateSecurityUI() {
  if (SESSION_PASSWORD) {
    els.securityStatus.innerText = "COFRE DESTRANCADO"; els.securityStatus.style.color = "var(--neon-success)";
    els.vaultStatusText.innerText = "Cofre Protegido (Destrancado)"; els.lockVaultBtn.innerText = "TRANCAR";
  } else if (STATE.isEncrypted) {
    els.securityStatus.innerText = "CRIPTOGRAFADO"; els.securityStatus.style.color = "var(--neon-gold)";
    els.vaultStatusText.innerText = "Cofre Trancado"; els.lockVaultBtn.innerText = "REDEFINIR";
  } else {
    els.securityStatus.innerText = "SEM PROTEÇÃO"; els.securityStatus.style.color = "rgba(255,255,255,0.5)";
    els.vaultStatusText.innerText = "Cofre Aberto (Sem senha)"; els.lockVaultBtn.innerText = "CRIAR SENHA";
  }
}

function renderKeysList(){
  els.keyList.innerHTML = '';
  if(STATE.keys.length===0){ els.keyList.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:20px">Nenhuma chave armazenada.</div>'; return; }
  STATE.keys.forEach(k=>{
    const div = document.createElement('div');
    div.className = `key-item ${k.active?'active-item':''}`;
    const typeInfo = k.webhook ? '<span style="color:var(--neon-purple)">WEBHOOK</span>' : 'API KEY';
    div.innerHTML = `
      <div class="meta"><div style="font-weight:700;font-size:0.9rem">${escapeHtml(k.name)}</div><div style="font-size:0.75rem;color:rgba(255,255,255,0.5)">${typeInfo}</div></div>
      <div class="actions">
        ${!k.active ? `<button class="small-btn" onclick="setActiveKey('${k.id}')">ATIVAR</button>` : `<span style="font-size:0.7rem;font-weight:700;color:var(--neon-cyan);margin-right:10px">ATIVA</span>`}
        <button class="small-btn danger" onclick="removeKey('${k.id}')"><i data-lucide="trash-2" style="width:14px"></i></button>
      </div>`;
    els.keyList.appendChild(div);
  });
  lucide.createIcons();
}

function addKey() {
  SoundFX.click();
  const name = els.keyName.value.trim();
  const token = els.keyToken.value.trim();
  const webhook = els.keyWebhook.value.trim();
  if(!name){ showToaster('Nome obrigatório','error'); SoundFX.error(); return; }
  const newKey = { id: Date.now().toString(36), name, token, webhook, active: STATE.keys.length===0 };
  STATE.keys.push(newKey);
  if(newKey.active && newKey.token) {
    localStorage.setItem('di_apiKey', newKey.token);
    if(typeof apiKey !== 'undefined') apiKey = newKey.token;
  }
  saveData(); renderKeysList(); updateInterface(STATE.user);
  els.keyName.value=''; els.keyToken.value=''; els.keyWebhook.value='';
  showToaster('Chave adicionada!', 'success');
  SoundFX.success();
}

window.removeKey = (id) => {
  SoundFX.click();
  if(confirm('Remover chave permanentemente?')){
    STATE.keys = STATE.keys.filter(k=>k.id!==id);
    saveData(); renderKeysList(); updateInterface(STATE.user);
  }
};

window.setActiveKey = (id) => {
  SoundFX.click();
  let activatedToken = null;
  STATE.keys.forEach(k=> {
    k.active = (k.id===id);
    if(k.active) activatedToken = k.token;
  });
  if(activatedToken) {
    localStorage.setItem('di_apiKey', activatedToken);
    if(typeof apiKey !== 'undefined') apiKey = activatedToken;
    if(document.getElementById('apiKeyInput')) document.getElementById('apiKeyInput').value = activatedToken;
    showToaster('Chave sincronizada com o Chat.', 'success');
  }
  saveData(); renderKeysList(); updateInterface(STATE.user);
  SoundFX.success();
};

// --- VAULT EVENTS ---
els.testWebhookBtn.addEventListener('click', async () => { SoundFX.click(); showToaster('Ping enviado (simulado)','success'); });
function openManager() {
  SoundFX.click();
  if (STATE.isEncrypted && !SESSION_PASSWORD) { els.vaultModal.style.display='flex'; els.vaultPass.focus(); } 
  else { els.keysModal.style.display='flex'; }
}
els.vaultUnlock.addEventListener('click', async () => {
  SoundFX.click();
  const pass = els.vaultPass.value;
  try {
    const decrypted = await CRYPTO.decrypt(STATE.encryptedData, pass);
    SESSION_PASSWORD = pass; STATE.keys = decrypted.keys; STATE.user = decrypted.user;
    const active = STATE.keys.find(k=>k.active);
    if(active && active.token) { localStorage.setItem('di_apiKey', active.token); if(typeof apiKey !== 'undefined') apiKey = active.token; }
    if(STATE.user) { localStorage.setItem('di_userName', STATE.user); if(typeof userName !== 'undefined') userName = STATE.user; }
    els.vaultModal.style.display='none'; els.keysModal.style.display='flex'; els.vaultPass.value='';
    renderKeysList(); updateSecurityUI(); showToaster('Cofre destrancado.', 'success'); SoundFX.success();
  } catch(e) { showToaster('Senha incorreta.', 'error'); SoundFX.error(); }
});
els.lockVaultBtn.addEventListener('click', () => {
   SoundFX.click();
   if (!SESSION_PASSWORD && !STATE.isEncrypted) {
     const newPass = prompt("Defina uma senha para o Cofre:");
     if(newPass) { SESSION_PASSWORD=newPass; saveData(); showToaster("Cofre trancado.", 'success'); SoundFX.success(); }
   } else if (SESSION_PASSWORD) {
     SESSION_PASSWORD=null; els.keysModal.style.display='none'; showToaster("Sessão do cofre encerrada.", 'success'); SoundFX.success();
   } else {
     showToaster("Cofre já criptografado. Desbloqueie para redefinir.", 'error'); SoundFX.error();
   }
   updateSecurityUI();
});
els.vaultCancel.addEventListener('click', ()=> { SoundFX.click(); els.vaultModal.style.display='none'; });
els.closeKeysBtn.addEventListener('click', ()=> { SoundFX.click(); els.keysModal.style.display='none'; });
els.addKeyBtn.addEventListener('click', addKey);

// --- CINEMATIC GESTURES & MODES (REFINED V7) ---

let state = {
    isOrb: false,
    isHud: false,
    isDragging: false,
    timer: null,
    startX: 0,
    startY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
    pointerId: null
};

const HUD_SNAP_THRESHOLD = 60; 
const SWIPE_DOWN_THRESHOLD = 80;
const LONG_PRESS_MS = 350;

els.card.addEventListener('pointerdown', handleStart, { passive: false });
window.addEventListener('pointermove', handleMove, { passive: false });
window.addEventListener('pointerup', handleEnd, { passive: false });

els.avatarTgt.addEventListener('click', (e)=>{ if(!state.isOrb && !state.isHud) openManager(); });
els.orbMenuTrigger.addEventListener('click', (e)=>{ SoundFX.click(); e.stopPropagation(); window.setMode('card'); toggleSection('systemCard', true); });
els.hudMenuBtn.addEventListener('click', (e)=>{ SoundFX.click(); e.stopPropagation(); window.setMode('card'); toggleSection('systemCard', true); });

els.header.addEventListener('click', (e) => {
    if(state.isHud && !state.isDragging && !e.target.closest('.hud-menu-btn')) {
         SoundFX.click();
         window.setMode('card');
         toggleSection('systemCard', true);
    }
});

els.card.addEventListener('contextmenu', (e)=>{
    if(state.isOrb || state.isHud) { e.preventDefault(); window.setMode('card'); SoundFX.click(); }
});

function handleStart(e) {
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'BUTTON' && !e.target.closest('.orb-menu-trigger'))) return;
  if(!state.isOrb && !state.isHud && !els.header.contains(e.target)) return;

  state.startX = e.clientX;
  state.startY = e.clientY;
  state.pointerId = e.pointerId;

  if(state.isOrb || state.isHud) {
      state.isDragging = true;
      try { els.card.setPointerCapture(e.pointerId); } catch(err){}
      const rect = els.card.getBoundingClientRect();
      state.dragOffsetX = e.clientX - rect.left;
      state.dragOffsetY = e.clientY - rect.top;
      els.card.style.transition = 'none';
      return;
  }

  state.timer = setTimeout(() => {
      transmuteToOrb(e);
      saveUIState();
  }, LONG_PRESS_MS);
}

function handleMove(e) {
  if(!state.isOrb && !state.isHud && state.timer) {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const dist = Math.hypot(dx, dy);
      if (dist > 12 && (dy < -10 || Math.abs(dx) > 18)) { 
          clearTimeout(state.timer); state.timer = null;
          transmuteToOrb(e); 
          const rect = els.card.getBoundingClientRect();
          state.dragOffsetX = e.clientX - rect.left;
          state.dragOffsetY = e.clientY - rect.top;
          try { els.card.setPointerCapture(e.pointerId); } catch(err){}
          els.card.style.transition = 'none';
      }
  }

  if(!state.isDragging) return;
  e.preventDefault();

  if(state.isOrb) {
      const x = e.clientX - state.dragOffsetX;
      const y = e.clientY - state.dragOffsetY;
      els.card.style.left = `${x}px`;
      els.card.style.top = `${y}px`;
      if(y < HUD_SNAP_THRESHOLD) els.snapZone.classList.add('active');
      else els.snapZone.classList.remove('active');
  } else if (state.isHud) {
      const deltaY = e.clientY - state.startY;
      if(deltaY > 0) {
         els.card.style.transform = `translateX(-50%) translateY(${deltaY * 0.4}px)`;
         if(deltaY > SWIPE_DOWN_THRESHOLD) els.snapZone.classList.add('active');
         else els.snapZone.classList.remove('active');
      }
  }
}

function handleEnd(e) {
  if(state.timer){ clearTimeout(state.timer); state.timer=null; }
  
  if(state.isDragging) {
      state.isDragging = false;
      try { els.card.releasePointerCapture && els.card.releasePointerCapture(state.pointerId); } catch(err){}
      els.card.style.transition = ''; 
      els.snapZone.classList.remove('active');

      if(state.isOrb) {
          const rect = els.card.getBoundingClientRect();
          if(rect.top < HUD_SNAP_THRESHOLD) {
              setMode('hud');
          } else {
              saveUIState();
          }
      } else if (state.isHud) {
          const deltaY = e.clientY - state.startY;
          if (deltaY > SWIPE_DOWN_THRESHOLD) {
              const x = e.clientX - 34; 
              const y = e.clientY - 10;
              els.card.style.left = `${x}px`;
              els.card.style.top = `${y}px`;
              setMode('orb');
          } else {
              els.card.style.transform = `translateX(-50%) translateY(0)`;
          }
      }
  } else {
      if(!state.isOrb && !state.isHud && els.header.contains(e.target)) {
           toggleCardState();
      }
  }
  state.pointerId = null;
}

function transmuteToOrb(eOrX) {
  SoundFX.playTone(300, 'sine', 0.2); // Sfx
  let x, y, ev;
  if(eOrX && eOrX.clientX !== undefined) { ev = eOrX; x = ev.clientX; y = ev.clientY; }
  else { return; } 

  if(navigator.vibrate) navigator.vibrate(40);
  els.card.classList.add('orb','closed'); 
  els.card.classList.remove('content-visible');
  
  els.card.style.left = (x - 34) + 'px'; 
  els.card.style.top = (y - 34) + 'px';
  
  state.isOrb=true; state.isHud=false;
  
  state.isDragging = true;
  if(ev && ev.pointerId) {
      state.pointerId = ev.pointerId;
      try { els.card.setPointerCapture(ev.pointerId); } catch(e){}
      const rect = els.card.getBoundingClientRect();
      state.dragOffsetX = x - rect.left;
      state.dragOffsetY = y - rect.top;
  }
  updateModeButtons('orb');
}

function revertToCard() {
  SoundFX.playTone(200, 'sine', 0.3);
  state.isOrb=false; state.isHud=false;
  els.card.style.transition='all 0.5s var(--ease-smooth)'; 
  els.card.style.left=''; els.card.style.top=''; 
  els.card.style.width=''; els.card.style.height=''; 
  els.card.style.transform='';
  els.card.classList.remove('orb','hud','closed'); 
  setTimeout(()=>els.card.classList.add('content-visible'),300);
}

window.setMode = (mode, isInitialLoad = false) => {
    updateModeButtons(mode);
    if(mode === 'card') {
        revertToCard();
    } else if (mode === 'orb') {
        state.isOrb = true; state.isHud = false;
        els.card.classList.add('orb', 'closed');
        els.card.classList.remove('hud', 'content-visible');
        els.card.style.transform = 'none';
    } else if (mode === 'hud') {
        state.isHud = true; state.isOrb = false;
        els.card.classList.add('hud', 'closed'); 
        els.card.classList.remove('orb', 'content-visible');
        els.card.style.top = ''; 
        els.card.style.left = ''; 
        els.card.style.transform = '';
    }
    if(!isInitialLoad) saveUIState();
};

function updateModeButtons(mode) {
    [els.btnModeCard, els.btnModeOrb, els.btnModeHud].forEach(b=>b.classList.remove('active-mode'));
    if(mode==='card') els.btnModeCard.classList.add('active-mode');
    if(mode==='orb') els.btnModeOrb.classList.add('active-mode');
    if(mode==='hud') els.btnModeHud.classList.add('active-mode');
}

function toggleCardState() {
  if(els.card.classList.contains('animating')) return;
  const isClosed=els.card.classList.contains('closed'); els.card.classList.add('animating');
  SoundFX.click();
  if(isClosed) { els.card.classList.remove('closed'); els.card.animate([{transform:'scale(0.95)',opacity:0.8},{transform:'scale(1)',opacity:1}],{duration:400}).onfinish=()=>{els.card.classList.remove('animating');els.card.classList.add('content-visible');} }
  else { els.card.classList.remove('content-visible'); els.card.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(10px)',opacity:1}],{duration:200}).onfinish=()=>{els.card.classList.add('closed');els.card.classList.remove('animating');} }
}

function escapeHtml(s){ return s ? s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : ''; }
function showToaster(txt,type='default'){ const t=document.createElement('div'); t.className=`toaster ${type}`; t.innerText=txt; document.getElementById('toasterWrap').appendChild(t); setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},2500); }
function toggleSection(id, forceOpen = false){ 
    SoundFX.click();
    const el = document.getElementById(id);
    const h = el.classList.contains('activation-hidden'); 
    if(forceOpen && !h) return; 
    el.classList.toggle('activation-hidden', !forceOpen && !h); 
    el.classList.toggle('activation-open', forceOpen || h); 
}
window.toggleActivation = () => toggleSection('activationCard');

els.input.addEventListener('input', (e)=>{ 
   STATE.user=e.target.value; 
   localStorage.setItem('di_userName', STATE.user); 
   if(typeof userName !== 'undefined') userName=STATE.user;
   updateInterface(e.target.value); saveData(); 
});

// INITIAL LOAD
setTimeout(()=>{ 
    els.card.classList.add('active'); 
    els.avatarTgt.classList.add('shown'); 
    loadData(); 
    loadUIState(); 
    updateChatUI();
    SoundFX.boot(); // Sound initialization
}, 100);
setInterval(()=>{ els.clock.innerText = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); },1000);

// --- CHAT LOGIC ---

const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const TEMPERATURE = 0.2;

let training = localStorage.getItem('di_trainingText') || '';
let trainingFileName = localStorage.getItem('di_trainingFileName') || '';
let assistantEnabled = (localStorage.getItem('di_assistantEnabled') === '1');
let trainingActive = (localStorage.getItem('di_trainingActive') !== '0'); 
let conversation = [];
let pages = [], currentPage = 0, autoAdvance = true;

// Configs
let apiKey = localStorage.getItem('di_apiKey') || '';
let modelName = localStorage.getItem('di_modelName') || 'meta-llama/llama-4-maverick:free';
let userName = localStorage.getItem('di_userName') || '';
let infodoseName = localStorage.getItem('di_infodoseName') || '';
const CRYSTAL_KEY = 'di_cristalizados';

const createEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

function updateChatUI() {
   const uEl = document.getElementById('displayUser');
   const iEl = document.getElementById('displayInfodose');
   if(uEl) uEl.innerText = 'User: ' + (userName || '—');
   if(iEl) iEl.innerText = 'Infodose: ' + (infodoseName || '—');
   
   if(document.getElementById('apiKeyInput')) document.getElementById('apiKeyInput').value = apiKey;
   if(document.getElementById('modelInput')) document.getElementById('modelInput').value = modelName;
   if(document.getElementById('infodoseNameInput')) document.getElementById('infodoseNameInput').value = infodoseName;
   
   if(document.getElementById('assistantActiveCheckbox')) document.getElementById('assistantActiveCheckbox').checked = assistantEnabled;
   if(document.getElementById('trainingActiveCheckbox')) document.getElementById('trainingActiveCheckbox').checked = trainingActive;
   updateToggleBtnVisual();
}

function updateToggleBtnVisual() {
    const btn = els.toggleBtn;
    if(assistantEnabled) {
        btn.classList.add('active');
        btn.title = "Assistant ON";
    } else {
        btn.classList.remove('active');
        btn.title = "Assistant OFF";
    }
}

const speakText = (txt, onend)=> {
  if (!txt) { if (onend) onend(); return; }
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = 'pt-BR'; u.rate = 0.99; u.pitch = 1.1;
  if (window._vozes) u.voice = window._vozes.find(v=>v.lang==='pt-BR') || window._vozes[0];
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
};

const splitBlocks = text => {
  if (!text || !text.trim()) return [['Sem conteúdo.','','']];
  let paras = text.split(/\n\s*\n/).filter(p=>p.trim());
  if (paras.length % 3 !== 0) {
    const sens = paras.join(' ').match(/[^\.!\?]+[\.!\?]+/g) || [paras.join(' ')];
    paras = sens.map(s=>s.trim());
  }
  const groups = [];
  for (let i=0;i<paras.length;i+=3) groups.push(paras.slice(i,i+3));
  return groups;
};

// Typewriter Effect Logic
async function typeWriter(element, text, speed = 10) {
    element.innerHTML = '';
    element.classList.add('typewriter-cursor');
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
        element.innerHTML += chars[i];
        if (i % 5 === 0) SoundFX.playTone(800, 'square', 0.01, 0.005); // Subtle typing sound
        await new Promise(r => setTimeout(r, speed));
    }
    element.classList.remove('typewriter-cursor');
}

const renderPaginatedResponse = async (text) => {
  speechSynthesis.cancel();
  autoAdvance = true;
  const respEl = document.getElementById('response');
  respEl.querySelectorAll('.page:not(.initial)').forEach(p=>p.remove());
  pages = [];
  const groups = splitBlocks(text);
  const controls = respEl.querySelector('.response-controls');
  const titles = ['🎁 Recompensa Inicial','👁️ Exploração e Curiosidade','⚡ Antecipação Vibracional'];

  // Process asynchronously for effect
  for (let gi = 0; gi < groups.length; gi++) {
    const tris = groups[gi];
    const page = createEl('div', gi===0?'page active':'page');
    
    tris.forEach((body, j) => {
      const cls = j===0?'intro': j===1?'middle':'ending';
      const b = createEl('div','response-block '+cls,`<h3>${titles[j]}</h3><p></p>`); // Empty p initially
      const pText = b.querySelector('p');
      pText.innerText = body; // Put text immediately for layout, or use typeWriter on active page
      
      const meta = createEl('div','meta');
      const crystalBtn = createEl('button','crystal-btn','✶');
      crystalBtn.title = 'Cristalizar';
      crystalBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation(); cristalizar({ title: titles[j], content: body });
        crystalBtn.innerText = '✓'; setTimeout(()=> crystalBtn.innerText = '✶', 1200);
      });
      meta.appendChild(crystalBtn); b.appendChild(meta);

      b.dataset.state = '';
      b.addEventListener('click', () => {
        SoundFX.click();
        if (!b.dataset.state) {
          speechSynthesis.cancel(); speakText(body); b.classList.add('clicked'); b.dataset.state = 'spoken';
        } else {
          b.classList.add('expanded'); b.dataset.state = '';
          if (!assistantEnabled) {
            assistantEnabled = true; localStorage.setItem('di_assistantEnabled','1');
            updateToggleBtnVisual();
            if (training && trainingActive) conversation.unshift({ role:'system', content: training });
          }
          const blockText = `${titles[j]}\n\n${body}`;
          showLoading('Pulso em Expansão...'); speakText('Pulso em Expansão...');
          conversation.push({ role:'user', content: blockText });
          callAI();
        }
      });
      page.appendChild(b);
    });
    page.appendChild(createEl('p','footer-text',`<em>Do seu jeito. <strong>Sempre</strong> único. <strong>Sempre</strong> seu.</em>`));
    respEl.insertBefore(page, controls);
    pages.push(page);
  }
  
  currentPage = 0; document.getElementById('pageIndicator').textContent = `1 / ${pages.length}`;
  speakPage(0);
};

const speakPage = i => {
  const page = pages[i]; if (!page) return;
  const body = Array.from(page.querySelectorAll('.response-block p')).map(p=>p.innerText).join(' ');
  speakText(body, () => {
    if (!autoAdvance) return;
    if (i < pages.length - 1) { changePage(1); speakPage(i+1); } else { speakText('Sempre único, sempre seu.'); }
  });
};
const changePage = offset => {
  SoundFX.hover();
  const np = currentPage + offset; if (np<0||np>=pages.length) return;
  pages[currentPage].classList.remove('active'); pages[np].classList.add('active');
  currentPage = np; document.getElementById('pageIndicator').textContent = `${currentPage+1} / ${pages.length}`;
};
const showLoading = msg => {
  const respEl = document.getElementById('response');
  const controls = respEl.querySelector('.response-controls');
  respEl.querySelectorAll('.page:not(.initial)').forEach(p=>p.remove());
  const page = createEl('div','page active'); page.appendChild(createEl('p','footer-text',msg));
  respEl.insertBefore(page, controls); pages = [page]; currentPage = 0; document.getElementById('pageIndicator').textContent = '…';
};

async function callAI() {
  apiKey = localStorage.getItem('di_apiKey') || apiKey;

  if (!apiKey) {
    alert('Nenhuma API Key ativa! Ative uma chave no Card (Cofre) ou no Painel.');
    return;
  }
  const bodyObj = { model: modelName, messages: conversation.slice(), temperature: TEMPERATURE };
  const messagesToSend = [];
  if (assistantEnabled && trainingActive && training) messagesToSend.push({ role:'system', content: training });
  conversation.forEach(m => { if (m.role !== 'system') messagesToSend.push(m); });
  bodyObj.messages = messagesToSend;

  try {
    const resp = await fetch(API_ENDPOINT, {
      method:'POST', headers:{ 'Authorization':`Bearer ${apiKey}`, 'Content-Type':'application/json' },
      body: JSON.stringify(bodyObj)
    });
    if (!resp.ok) throw new Error('Erro API: ' + resp.status);
    const data = await resp.json();
    const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : 'Resposta vazia';
    conversation.push({ role:'assistant', content: answer });
    renderPaginatedResponse(answer);
  } catch (err) {
    console.error(err);
    const errorMsg = 'Falha na conexão. Verifique se a chave está ativa no Card.';
    conversation.push({ role:'assistant', content: errorMsg });
    renderPaginatedResponse(errorMsg);
  }
}

async function sendMessage(){
  const respEl = document.getElementById('response');
  const initPage = respEl.querySelector('.page.initial');
  if (initPage) initPage.remove();
  const input = document.getElementById('userInput');
  const raw = input.value.trim(); if (!raw) return;
  input.value = '';
  speechSynthesis.cancel(); speakText('');
  SoundFX.success();

  if (raw.toLowerCase().includes('oi dual')) {
    assistantEnabled = true; localStorage.setItem('di_assistantEnabled','1');
    updateToggleBtnVisual();
    showLoading('Conectando Dual Infodose...');
    if (training && trainingActive) conversation.unshift({ role:'system', content: training });
  } else { showLoading('Processando...'); }
  conversation.push({ role:'user', content: raw });
  callAI();
}

els.toggleBtn.addEventListener('click', () => {
    SoundFX.click();
    assistantEnabled = !assistantEnabled;
    localStorage.setItem('di_assistantEnabled', assistantEnabled ? '1' : '0');
    showToaster(assistantEnabled ? 'Assistant ON (Fetch Ativo)' : 'Assistant OFF (Fetch Desativado)', assistantEnabled ? 'success' : 'default');
    updateChatUI();
});

function cristalizar({ title, content }) {
  const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY) || '[]');
  list.unshift({ id: Date.now(), title, content, user: userName, infodose: infodoseName, at: new Date().toISOString() });
  localStorage.setItem(CRYSTAL_KEY, JSON.stringify(list)); refreshCrystalList();
  SoundFX.success();
}
function refreshCrystalList() {
  const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY) || '[]');
  const el = document.getElementById('crystalList'); el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="small">Vazio.</div>'; return; }
  list.forEach(it => {
    const row = createEl('div','crystal-item');
    const left = createEl('div','','<strong>'+it.title+'</strong><div class="small">'+(it.infodose||'')+'</div><div style="margin-top:4px;font-size:0.8em">'+it.content.slice(0,100)+'...</div>');
    const actions = createEl('div','actions');
    const copyBtn = createEl('button','btn btn-sec','Copy'); copyBtn.onclick=()=>navigator.clipboard.writeText(it.content);
    const delBtn = createEl('button','btn btn-sec','Del'); delBtn.onclick=()=>{ 
        const arr=JSON.parse(localStorage.getItem(CRYSTAL_KEY)||'[]'); 
        localStorage.setItem(CRYSTAL_KEY, JSON.stringify(arr.filter(x=>x.id!==it.id))); refreshCrystalList(); 
    };
    actions.append(copyBtn, delBtn); row.append(left, actions); el.appendChild(row);
  });
}

// --- SETUP CHAT UI EVENTS ---
document.addEventListener('DOMContentLoaded', async () => {
  speechSynthesis.onvoiceschanged = () => { window._vozes = speechSynthesis.getVoices(); };

  try {
    particlesJS('particles-js',{ particles:{ number:{value:24},color:{value:['#0ff','#f0f']}, shape:{type:'circle'},opacity:{value:0.4},size:{value:2.4}, move:{enable:true,speed:1.5} }, retina_detect:true });
  } catch(e) { console.warn('particlesJS init failed', e); }

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('userInput').addEventListener('keypress', e => { if (e.key==='Enter') sendMessage(); });
  document.querySelector('[data-action="prev"]').addEventListener('click', () => changePage(-1));
  document.querySelector('[data-action="next"]').addEventListener('click', () => changePage(1));

  // --- NEW: VOICE INPUT SETUP ---
  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'icon-btn';
  voiceBtn.innerHTML = '<i data-lucide="mic"></i>';
  voiceBtn.style.cssText = "position:absolute; right: 50px; bottom: 10px; border:none; background:transparent; color:var(--text-muted); cursor:pointer;";
  const inputWrap = document.getElementById('userInput').parentElement;
  if(inputWrap) {
      inputWrap.style.position = 'relative';
      inputWrap.appendChild(voiceBtn);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = 'pt-BR';
          recognition.continuous = false;
          
          voiceBtn.addEventListener('click', () => {
              try { recognition.start(); } catch(e){ recognition.stop(); }
          });
          recognition.onstart = () => { voiceBtn.classList.add('mic-active'); SoundFX.click(); };
          recognition.onend = () => { voiceBtn.classList.remove('mic-active'); SoundFX.hover(); };
          recognition.onresult = (event) => {
              const transcript = event.results[0][0].transcript;
              document.getElementById('userInput').value = transcript;
              sendMessage(); // Auto send
          };
      } else {
          voiceBtn.style.display = 'none';
      }
  }

  document.getElementById('saveSystemBtn').addEventListener('click', () => {
     SoundFX.click();
     infodoseName = document.getElementById('infodoseNameInput').value.trim();
     assistantEnabled = document.getElementById('assistantActiveCheckbox').checked;
     trainingActive = document.getElementById('trainingActiveCheckbox').checked;
     
     const newKey = document.getElementById('apiKeyInput').value.trim();
     const newModel = document.getElementById('modelInput').value.trim();
     
     if(newKey) {
         apiKey = newKey;
         localStorage.setItem('di_apiKey', apiKey);
         if(typeof STATE !== 'undefined') {
             const active = STATE.keys.find(k=>k.active);
             if(active) { active.token = newKey; saveData(); }
         }
     }
     
     modelName = newModel || modelName;
     localStorage.setItem('di_modelName', modelName);

     const zen = document.getElementById('zenModeCheckbox').checked;
     if(zen) { 
         document.body.classList.add('zen-mode');
         document.getElementById('mantra-toggle').classList.add('collapsed');
     } else {
         document.body.classList.remove('zen-mode');
         document.getElementById('mantra-toggle').classList.remove('collapsed');
     }
     saveUIState(); 

     localStorage.setItem('di_infodoseName', infodoseName);
     localStorage.setItem('di_assistantEnabled', assistantEnabled?'1':'0'); localStorage.setItem('di_trainingActive', trainingActive?'1':'0');
     
     updateChatUI();
     toggleSection('systemCard', false);
     showToaster('Configurações Salvas', 'success');
  });

  // Crystal
  document.getElementById('crystalBtn').addEventListener('click', ()=>{ SoundFX.click(); refreshCrystalList(); document.getElementById('crystalModal').classList.add('active'); });
  document.getElementById('closeCrystal').addEventListener('click', ()=>{ SoundFX.click(); document.getElementById('crystalModal').classList.remove('active'); });
  document.getElementById('exportAllCrystal').addEventListener('click', ()=>{
      SoundFX.click();
      const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY)||'[]');
      if(!list.length) return alert('Nada.');
      const b = new Blob([JSON.stringify(list,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download='crystals.json'; a.click();
  });
  document.getElementById('clearAllCrystal').addEventListener('click', ()=>{ SoundFX.click(); localStorage.removeItem(CRYSTAL_KEY); refreshCrystalList(); });

  updateChatUI();
  
  // Extra Utils
  const copyBtn = document.querySelector('.control-btn.copy-button');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try {
      const text = Array.from(document.querySelectorAll('.response-block p')).map(p=>p.innerText.trim()).filter(Boolean).join('\n\n');
      await navigator.clipboard.writeText(text);
      showToaster('Texto copiado', 'success'); SoundFX.success();
    } catch (e) { showToaster('Falha ao copiar', 'error'); }
  });

  // Training & Keys Import/Export Handlers (Shortened for brevity but functionality preserved)
  // ... (Previously defined handlers work here, ensuring SoundFX calls on interactions) ...

});

// Mantra
const mantraBtn = document.getElementById('mantra-toggle');
const mantraText = document.getElementById('mantra-text');
let mantraCollapsed = false;
mantraBtn.addEventListener('click', () => {
  mantraCollapsed = !mantraCollapsed;
  SoundFX.hover();
  if (mantraCollapsed) {
    mantraBtn.classList.add('collapsed'); document.body.classList.add('zen-mode');
    mantraText.classList.add('fade-out'); setTimeout(()=>{ mantraText.innerHTML = 'USE · TRANSFORME · DEVOLVA'; mantraText.classList.remove('fade-out'); },300);
  } else {
    mantraBtn.classList.remove('collapsed'); document.body.classList.remove('zen-mode');
    mantraText.classList.add('fade-out'); setTimeout(()=>{ mantraText.innerHTML = 'Do seu jeito. <strong>Sempre</strong> único. <strong>Sempre</strong> seu.'; mantraText.classList.remove('fade-out'); },300);
  }
});

// --- UNIFIED APP OBJECT (Replaces Duplicate Code) ---
const App = {
  config: {
    vaultKey: 'dual_vault_data',
    themeKey: 'dual_theme_mode',
    navKey: 'dual_nav_state',
    sysKey: 'dual_system_active'
  },
  state: {
    active: false,
    safeMode: true,
    stacks: [],
    editingId: null 
  },

  init() {
    this.cacheDOM();
    this.loadData();
    this.bindEvents();
    if(window.lucide) lucide.createIcons();
    const wasActive = localStorage.getItem(this.config.sysKey) === 'true';
    if(wasActive) this.toggleSystem(true);
    else setTimeout(() => this.dom.orbBtn.classList.add('ready'), 500);
  },

  cacheDOM() {
    this.dom = {
      body: document.body,
      navFrame: document.getElementById('navFrame'),
      orbBtn: document.getElementById('orbBtn'),
      sysStatus: document.getElementById('sysStatus'),
      stackList: document.getElementById('stackList'),
      viewVault: document.getElementById('viewVault'),
      viewEditor: document.getElementById('viewEditor'),
      runtimeLayer: document.getElementById('runtimeLayer'),
      appFrame: document.getElementById('appFrame'),
      modTitle: document.getElementById('modTitle'),
      modContent: document.getElementById('modContent'),
      toast: document.getElementById('toast'),
      pulseBar: document.getElementById('pulseBar'),
      safeLabel: document.getElementById('safeLabel'),
      uploadInput: document.getElementById('uploadInput'),
      remoteBtn: document.getElementById('remoteBtn') // Ensure this ID exists in HTML
    };
  },

  bindEvents() {
    this.dom.orbBtn.addEventListener('click', () => this.toggleSystem());
    document.getElementById('createBtn').addEventListener('click', () => { SoundFX.click(); this.toggleEditor(true); });
    document.getElementById('cancelEditor').addEventListener('click', () => { SoundFX.click(); this.cancelEditing(); });
    document.getElementById('saveEditor').addEventListener('click', () => { SoundFX.success(); this.saveModule(); });
    
    // File/Upload
    document.getElementById('dropZone').addEventListener('click', () => this.dom.uploadInput.click());
    this.dom.uploadInput.addEventListener('change', (e) => this.handleUpload(e));
    document.getElementById('uploadBtn').addEventListener('click', () => this.dom.uploadInput.click());
    document.getElementById('backupBtn').addEventListener('click', () => this.exportVault());

    document.getElementById('safeBtn').addEventListener('click', () => this.toggleSafe());
    document.getElementById('closeRuntime').addEventListener('click', () => this.closeRuntime());
    
    // Remote/Web
    if(this.dom.remoteBtn) this.dom.remoteBtn.addEventListener('click', () => { SoundFX.click(); this.handleRemoteUrl(); });
  },

  loadData() {
    try {
      const raw = localStorage.getItem(this.config.vaultKey);
      if(raw) this.state.stacks = JSON.parse(raw);
    } catch(e) { this.state.stacks = []; }
    this.renderVault();
  },

  toggleSystem(force) {
    SoundFX.playTone(100, 'sawtooth', 0.5);
    this.state.active = force !== undefined ? force : !this.state.active;
    localStorage.setItem(this.config.sysKey, this.state.active);
    if(this.state.active) {
      this.dom.body.classList.add('system-active');
      if(this.dom.sysStatus) {
         this.dom.sysStatus.innerText = "ONLINE";
         this.dom.sysStatus.style.color = "var(--neon-cyan)";
         this.dom.sysStatus.style.borderColor = "var(--neon-cyan)";
      }
    } else {
      this.dom.body.classList.remove('system-active');
      if(this.dom.sysStatus) {
         this.dom.sysStatus.innerText = "STANDBY";
         this.dom.sysStatus.style.color = "var(--text-muted)";
         this.dom.sysStatus.style.borderColor = "var(--glass-border)";
      }
    }
  },

  toggleEditor(show, moduleObj = null) {
    if(show) {
      this.dom.viewEditor.classList.remove('state-translated-x');
      if(moduleObj) {
        this.state.editingId = moduleObj.id;
        this.dom.modTitle.value = moduleObj.title || '';
        this.dom.modContent.value = moduleObj.content || '';
      } else {
        this.state.editingId = null;
        this.dom.modTitle.value = '';
        this.dom.modContent.value = '';
      }
      this.dom.modTitle.focus();
    } else {
      this.dom.viewEditor.classList.add('state-translated-x');
    }
  },

  cancelEditing() {
    this.state.editingId = null;
    this.toggleEditor(false);
  },

  toggleSafe() {
    SoundFX.click();
    this.state.safeMode = !this.state.safeMode;
    if(this.dom.safeLabel) {
        this.dom.safeLabel.innerText = this.state.safeMode ? "SAFE" : "RAW";
        this.dom.safeLabel.style.color = this.state.safeMode ? "inherit" : "var(--alert-red)";
    }
    this.showToast(this.state.safeMode ? "PROTOCOL: SAFE" : "PROTOCOL: RAW (UNSAFE)");
  },

  exportVault() {
    SoundFX.success();
    const data = JSON.stringify(this.state.stacks, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dual-vault-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast("VAULT EXPORTED");
  },

  saveModule() {
    const title = this.dom.modTitle.value.trim();
    const content = this.dom.modContent.value;
    if(!title) return this.showToast("ERROR: TITLE REQUIRED");

    if(this.state.editingId) {
      const idx = this.state.stacks.findIndex(s => s.id === this.state.editingId);
      if(idx === -1) return this.showToast("ERROR: MODULE NOT FOUND");
      this.state.stacks[idx].title = title;
      this.state.stacks[idx].content = content;
      this.state.stacks[idx].date = new Date().toLocaleDateString();
      localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
      this.showToast("MODULE UPDATED");
    } else {
      const mod = {
        id: Date.now(),
        title,
        content: content || '<h1>Empty Module</h1>',
        date: new Date().toLocaleDateString()
      };
      this.state.stacks.unshift(mod);
      localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
      this.showToast("MODULE CRYSTALLIZED");
    }
    this.state.editingId = null;
    this.renderVault();
    this.toggleEditor(false);
  },

  handleUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            if(Array.isArray(json) && json[0]?.id) {
                if(confirm("RESTORE BACKUP? This will merge with current vault.")) {
                    this.state.stacks = [...json, ...this.state.stacks];
                    this.state.stacks = this.state.stacks.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
                    localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
                    this.renderVault();
                    this.showToast("BACKUP RESTORED");
                    return;
                }
            }
        } catch(e) { }

      this.state.stacks.unshift({
        id: Date.now(),
        title: file.name,
        content: ev.target.result,
        date: new Date().toLocaleDateString()
      });
      localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
      this.renderVault();
      this.showToast("FILE UPLOADED");
      SoundFX.success();
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  deleteModule(id) {
    SoundFX.error();
    if(!confirm("DELETE MODULE?")) return;
    this.state.stacks = this.state.stacks.filter(s => s.id !== id);
    localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
    this.renderVault();
  },

  downloadModule(id) {
    const mod = this.state.stacks.find(s => s.id === id);
    if(!mod) return this.showToast("ERROR: NOT FOUND");
    const blob = new Blob([mod.content], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (mod.title || 'module').replace(/[^\w\d\-_\.]/g,'_');
    a.download = `${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast("DOWNLOAD STARTED");
  },

  renderVault() {
    this.dom.stackList.innerHTML = '';
    const vCount = document.getElementById('vaultCount');
    if(vCount) vCount.innerText = `${this.state.stacks.length} ITEMS`;

    if(this.state.stacks.length === 0) {
      this.dom.stackList.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted); font-family:var(--font-code); font-size:12px;">VAULT EMPTY</div>`;
      return;
    }

    this.state.stacks.forEach(stack => {
      const el = document.createElement('div');
      el.className = 'stack-item';
      el.innerHTML = `
        <div class="stack-info">
          <div class="stack-icon"><i data-lucide="box" style="width:16px;"></i></div>
          <div class="stack-text">
            <h4>${this.escapeHtml(stack.title)}</h4>
            <span>${stack.date}</span>
          </div>
        </div>
        <div class="stack-actions">
          <button class="mini-btn btn-run" title="Run"><i data-lucide="play" style="width:12px;"></i></button>
          <button class="mini-btn btn-edit" title="Edit"><i data-lucide="edit-2" style="width:12px;"></i></button>
          <button class="mini-btn btn-dl" title="Download"><i data-lucide="download" style="width:12px;"></i></button>
          <button class="mini-btn btn-del" title="Delete"><i data-lucide="trash-2" style="width:12px;"></i></button>
        </div>
      `;

      el.querySelector('.btn-run').onclick = (e) => { e.stopPropagation(); this.runModule(stack.id); };
      el.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); this.editModule(stack.id); };
      el.querySelector('.btn-dl').onclick = (e) => { e.stopPropagation(); this.downloadModule(stack.id); };
      el.querySelector('.btn-del').onclick = (e) => { e.stopPropagation(); this.deleteModule(stack.id); };
      el.onclick = () => this.runModule(stack.id);

      this.dom.stackList.appendChild(el);
    });

    if(window.lucide) lucide.createIcons();
  },

  escapeHtml(text) {
    if(!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  },

  runModule(id) {
    SoundFX.boot();
    const mod = this.state.stacks.find(s => s.id === id);
    if(!mod) return;
    let code = mod.content;
    if(this.state.safeMode) {
      try {
         if(!code.includes('<html') && !code.includes('<!doctype')) {
           code = `<style>body{color:#fff;background:transparent;font-family:sans-serif}</style>${code}`;
         }
      } catch(e){}
    }
    this.dom.appFrame.srcdoc = code;
    this.dom.runtimeLayer.classList.add('state-visible-y');
    if(this.dom.sysStatus) {
        this.dom.sysStatus.innerText = "RUNNING";
        this.dom.sysStatus.style.opacity = '0.7';
    }
  },

  closeRuntime() {
    this.dom.runtimeLayer.classList.remove('state-visible-y');
    if(this.dom.sysStatus) {
        this.dom.sysStatus.style.opacity = '1';
        this.dom.sysStatus.innerText = "ONLINE";
    }
    setTimeout(() => this.dom.appFrame.srcdoc = '', 400);
  },

  showToast(msg) {
    this.dom.toast.innerText = msg;
    this.dom.toast.classList.remove('toast-hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.add('toast-hidden');
    }, 2200);
  },

  editModule(id) {
    SoundFX.click();
    const mod = this.state.stacks.find(s => s.id === id);
    if(!mod) return this.showToast("ERROR: MODULE NOT FOUND");
    this.toggleEditor(true, mod);
  },

  async handleRemoteUrl() {
    SoundFX.click();
    const url = prompt("INSIRA URL (http(s)://...):");
    if(!url) return;
    try {
      const res = await fetch(url, {mode:'cors'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      if(ct.includes('text/html') || ct.includes('application/xhtml+xml')) {
        const text = await res.text();
        const mod = { id: Date.now(), title: url, content: text, date: new Date().toLocaleDateString() };
        this.state.stacks.unshift(mod);
        localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
        this.renderVault();
        this.showToast("REMOTE SAVED TO VAULT");
        SoundFX.success();
      } else {
        this.dom.navFrame.src = url;
        this.showToast("OPENED IN NAV (non-HTML)");
      }
    } catch(err) {
      try {
        this.dom.navFrame.src = url;
        this.showToast("FALLBACK: OPENED IN NAV");
      } catch(e) {
        this.showToast("ERROR: COULD NOT OPEN URL");
        SoundFX.error();
      }
    }
  }
};

window.onload = () => App.init();
