/**
 * DUAL // FUSION OS — V9 (Divine Architecture)
 * System: Unified, Modular, Secured.
 * "Ordem no Caos, Clareza na Execução."
 */

const FusionOS = (() => {
    // --- 1. CONFIGURAÇÃO & CONSTANTES (A Lei) ---
    const CONFIG = {
        storageKey: 'fusion_os_data_v9',
        uiStateKey: 'fusion_os_ui_state',
        vaultKey: 'dual_vault_data',
        api: {
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            defaultModel: 'meta-llama/llama-3-8b-instruct:free', // Modelo atualizado
            temp: 0.7
        },
        dom: {
            card: 'mainCard',
            header: 'cardHeader',
            input: 'inputUser',
            output: 'response',
            clock: 'clockTime'
        }
    };

    // --- 2. UTILITÁRIOS DE CRIPTOGRAFIA (A Proteção) ---
    const Security = {
        algo: { name: 'AES-GCM', length: 256 },
        pbkdf2: { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000 },

        async deriveKey(password, salt) {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
            return crypto.subtle.deriveKey({ ...this.pbkdf2, salt }, keyMaterial, this.algo, false, ["encrypt", "decrypt"]);
        },
        async encrypt(data, password) {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await this.deriveKey(password, salt);
            const encoded = new TextEncoder().encode(JSON.stringify(data));
            const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
            return JSON.stringify({
                s: Array.from(salt),
                iv: Array.from(iv),
                d: Array.from(new Uint8Array(encrypted))
            });
        },
        async decrypt(bundleStr, password) {
            try {
                const bundle = JSON.parse(bundleStr);
                const salt = new Uint8Array(bundle.s);
                const iv = new Uint8Array(bundle.iv);
                const data = new Uint8Array(bundle.d);
                const key = await this.deriveKey(password, salt);
                const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
                return JSON.parse(new TextDecoder().decode(decrypted));
            } catch (e) { throw new Error("Acesso Negado: Credenciais Inválidas."); }
        },
        hash(str) {
            let h = 0xdeadbeef;
            for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
            return ((h ^ h >>> 16) >>> 0).toString(16);
        }
    };

    // --- 3. SISTEMA DE ÁUDIO (A Voz) ---
    const AudioEngine = {
        ctx: null,
        init() {
            if (!this.ctx) {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
            }
        },
        play(freq, type, duration, vol = 0.1) {
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
        sfx: {
            click: () => AudioEngine.play(1200, 'sine', 0.1, 0.05),
            hover: () => AudioEngine.play(400, 'triangle', 0.05, 0.02),
            error: () => AudioEngine.play(150, 'sawtooth', 0.3, 0.15),
            success: () => { AudioEngine.play(800, 'sine', 0.1, 0.1); setTimeout(() => AudioEngine.play(1200, 'sine', 0.2, 0.1), 100); },
            boot: () => {
                AudioEngine.init();
                const now = AudioEngine.ctx.currentTime;
                const osc = AudioEngine.ctx.createOscillator();
                const gain = AudioEngine.ctx.createGain();
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.5);
                osc.connect(gain); gain.connect(AudioEngine.ctx.destination);
                osc.start(); osc.stop(now + 1.5);
            }
        }
    };

    // --- 4. ESTADO GLOBAL (A Memória) ---
    const State = {
        user: 'Convidado',
        keys: [],
        encryptedBlob: null,
        sessionPassword: null,
        isOrb: false,
        assistantEnabled: false,
        
        load() {
            const raw = localStorage.getItem(CONFIG.storageKey);
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                if (parsed.isEncrypted) {
                    this.encryptedBlob = parsed.data;
                } else {
                    this.keys = parsed.data.keys || [];
                    this.user = parsed.data.user || 'Convidado';
                    this.syncEnv();
                }
                this.assistantEnabled = localStorage.getItem('di_assistantEnabled') === '1';
            } catch(e) { console.error("Erro ao carregar estado", e); }
        },
        
        save() {
            const payload = { keys: this.keys, user: this.user };
            if (this.sessionPassword) {
                Security.encrypt(payload, this.sessionPassword).then(enc => {
                    localStorage.setItem(CONFIG.storageKey, JSON.stringify({ isEncrypted: true, data: enc }));
                    this.encryptedBlob = enc;
                    UI.updateSecurity();
                });
            } else {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify({ isEncrypted: false, data: payload }));
            }
        },

        syncEnv() {
            const activeKey = this.keys.find(k => k.active);
            if (activeKey) localStorage.setItem('di_apiKey', activeKey.token);
            localStorage.setItem('di_userName', this.user);
        },

        getActiveToken() {
            const k = this.keys.find(x => x.active);
            return k ? k.token : localStorage.getItem('di_apiKey');
        }
    };

    // --- 5. UI MANAGER (A Interface) ---
    const UI = {
        el: (id) => document.getElementById(id),
        
        init() {
            if(window.lucide) lucide.createIcons();
            this.startClock();
            this.loadLayout();
            this.bindCoreEvents();
            Chat.init();
            Vault.init();
            this.updateIdentity();
            this.updateSecurity();
        },

        showToaster(txt, type = 'default') {
            const wrap = this.el('toasterWrap');
            if(!wrap) return;
            const t = document.createElement('div');
            t.className = `toaster ${type}`;
            t.innerText = txt;
            wrap.appendChild(t);
            requestAnimationFrame(() => t.classList.add('show'));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
        },

        updateIdentity() {
            const name = State.user || 'Convidado';
            const safeId = Security.hash(name);
            
            if(this.el('lblName')) this.el('lblName').innerText = name;
            if(this.el('actName')) this.el('actName').innerText = name;
            if(this.el('inputUser')) this.el('inputUser').value = name;
            
            const createAvatar = (seed, sz) => {
                 const hue = parseInt(seed.substring(0,2), 16) * 10;
                 return `<svg width="${sz}" height="${sz}" viewBox="0 0 32 32" style="border-radius:6px;background:#0a1016"><circle cx="16" cy="16" r="6" fill="hsl(${hue}, 80%, 60%)"/></svg>`;
            };
            
            if(this.el('smallMiniAvatar')) this.el('smallMiniAvatar').innerHTML = createAvatar(safeId, 30);
            if(this.el('actMiniAvatar')) this.el('actMiniAvatar').innerHTML = createAvatar(safeId, 36);
            
            const activeKey = State.keys.find(k=>k.active);
            if(this.el('actBadge')) this.el('actBadge').innerText = activeKey ? `KEY: ${activeKey.name}` : 'NO KEY';
        },

        updateSecurity() {
            const statusEl = this.el('securityStatus');
            const btnEl = this.el('lockVaultBtn');
            if(!statusEl) return;

            if (State.sessionPassword) {
                statusEl.innerText = "COFRE ABERTO"; statusEl.style.color = "var(--neon-success)";
                if(btnEl) btnEl.innerText = "TRANCAR";
            } else if (State.encryptedBlob) {
                statusEl.innerText = "CRIPTOGRAFADO"; statusEl.style.color = "var(--neon-gold)";
                if(btnEl) btnEl.innerText = "REDEFINIR";
            } else {
                statusEl.innerText = "DESPROTEGIDO"; statusEl.style.color = "rgba(255,255,255,0.5)";
                if(btnEl) btnEl.innerText = "CRIAR SENHA";
            }
        },

        startClock() {
            setInterval(() => {
                if(this.el('clockTime')) this.el('clockTime').innerText = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }, 1000);
        },

        loadLayout() {
            try {
                const ui = JSON.parse(localStorage.getItem(CONFIG.uiStateKey));
                if (ui && ui.mode) Gestures.setMode(ui.mode, true);
                if (ui && ui.zen) document.body.classList.add('zen-mode');
            } catch (e) {}
        },

        bindCoreEvents() {
            const iUser = this.el('inputUser');
            if(iUser) iUser.addEventListener('input', (e) => {
                State.user = e.target.value;
                State.syncEnv();
                this.updateIdentity();
                State.save();
            });
            
            const mantraToggle = this.el('mantra-toggle');
            if(mantraToggle) {
                mantraToggle.addEventListener('click', () => {
                    AudioEngine.sfx.hover();
                    document.body.classList.toggle('zen-mode');
                    mantraToggle.classList.toggle('collapsed');
                    const uiState = JSON.parse(localStorage.getItem(CONFIG.uiStateKey) || '{}');
                    uiState.zen = document.body.classList.contains('zen-mode');
                    localStorage.setItem(CONFIG.uiStateKey, JSON.stringify(uiState));
                });
            }
        }
    };

    // --- 6. GESTOS & MODOS (A Física) ---
    const Gestures = {
        state: { dragging: false, startX:0, startY:0, mode: 'card' },
        
        init() {
            const card = UI.el(CONFIG.dom.card);
            if(!card) return;
            
            card.addEventListener('pointerdown', this.start.bind(this));
            window.addEventListener('pointermove', this.move.bind(this));
            window.addEventListener('pointerup', this.end.bind(this));
            
            if(UI.el('btnModeCard')) UI.el('btnModeCard').onclick = () => this.setMode('card');
            if(UI.el('btnModeOrb')) UI.el('btnModeOrb').onclick = () => this.setMode('orb');
            if(UI.el('btnModeHud')) UI.el('btnModeHud').onclick = () => this.setMode('hud');
        },

        start(e) {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.no-drag')) return;
            if(this.state.mode === 'card' && !e.target.closest('#cardHeader')) return;
            
            this.state.dragging = true;
            this.state.startX = e.clientX;
            this.state.startY = e.clientY;
            
            const card = UI.el(CONFIG.dom.card);
            const rect = card.getBoundingClientRect();
            this.state.offsetX = e.clientX - rect.left;
            this.state.offsetY = e.clientY - rect.top;
            
            try { card.setPointerCapture(e.pointerId); } catch(err){}
        },

        move(e) {
            if(!this.state.dragging) return;
            e.preventDefault();
            const card = UI.el(CONFIG.dom.card);
            
            if (this.state.mode === 'orb') {
                card.style.left = (e.clientX - this.state.offsetX) + 'px';
                card.style.top = (e.clientY - this.state.offsetY) + 'px';
            } else if (this.state.mode === 'hud') {
                const dy = e.clientY - this.state.startY;
                if(dy > 0) card.style.transform = `translateX(-50%) translateY(${dy * 0.5}px)`;
            }
        },

        end(e) {
            this.state.dragging = false;
            const card = UI.el(CONFIG.dom.card);
            card.style.transition = '';
            
            if(this.state.mode === 'hud' && (e.clientY - this.state.startY) > 80) {
                 this.setMode('orb'); 
                 card.style.left = (e.clientX - 34) + 'px';
                 card.style.top = (e.clientY - 10) + 'px';
            } else if (this.state.mode === 'orb' && card.getBoundingClientRect().top < 60) {
                 this.setMode('hud');
            } else if (this.state.mode === 'hud') {
                 card.style.transform = '';
            }
            this.saveState();
        },

        setMode(mode, skipAnim = false) {
            this.state.mode = mode;
            State.isOrb = (mode === 'orb');
            
            const card = UI.el(CONFIG.dom.card);
            const btns = [UI.el('btnModeCard'), UI.el('btnModeOrb'), UI.el('btnModeHud')];
            btns.forEach(b => b && b.classList.remove('active-mode'));
            
            card.classList.remove('orb', 'hud', 'closed', 'content-visible');
            
            if(mode === 'card') {
                if(btns[0]) btns[0].classList.add('active-mode');
                card.style = ''; 
                if(!skipAnim) AudioEngine.sfx.click();
                setTimeout(()=> card.classList.add('content-visible'), 300);
            } 
            else if (mode === 'orb') {
                if(btns[1]) btns[1].classList.add('active-mode');
                card.classList.add('orb', 'closed');
                if(!skipAnim) AudioEngine.sfx.play(300, 'sine', 0.2);
            }
            else if (mode === 'hud') {
                if(btns[2]) btns[2].classList.add('active-mode');
                card.classList.add('hud', 'closed');
                card.style.left = ''; card.style.top = ''; card.style.transform = '';
            }
            this.saveState();
        },
        
        saveState() {
             const card = UI.el(CONFIG.dom.card);
             const s = {
                 mode: this.state.mode,
                 left: card.style.left,
                 top: card.style.top,
                 zen: document.body.classList.contains('zen-mode')
             };
             localStorage.setItem(CONFIG.uiStateKey, JSON.stringify(s));
        }
    };

    // --- 7. CHAT ENGINE (O Oráculo) ---
    const Chat = {
        history: [],
        
        init() {
            if(UI.el('sendBtn')) UI.el('sendBtn').onclick = () => this.send();
            if(UI.el('userInput')) UI.el('userInput').onkeypress = (e) => { if(e.key === 'Enter') this.send(); };
            
            // Configuração do Microfone
            this.setupVoice();
        },

        setupVoice() {
            const inputGroup = UI.el('userInput')?.parentElement;
            if (!inputGroup) return;

            // Remove microfone antigo se existir
            const oldMic = inputGroup.querySelector('.mic-btn-generated');
            if(oldMic) oldMic.remove();

            const micBtn = document.createElement('button');
            micBtn.className = 'icon-btn mic-btn-generated';
            micBtn.innerHTML = '<i data-lucide="mic"></i>';
            micBtn.style.cssText = "position:absolute; right:50px; bottom:10px; border:none; background:transparent; color:var(--text-muted); cursor:pointer";
            inputGroup.appendChild(micBtn);
            if(window.lucide) lucide.createIcons();

            if(window.webkitSpeechRecognition || window.SpeechRecognition) {
                const Speech = window.webkitSpeechRecognition || window.SpeechRecognition;
                const rec = new Speech();
                rec.lang = 'pt-BR';
                rec.continuous = false;
                
                rec.onstart = () => { micBtn.classList.add('mic-active'); AudioEngine.sfx.click(); };
                rec.onend = () => { micBtn.classList.remove('mic-active'); };
                rec.onresult = (e) => { 
                    const transcript = e.results[0][0].transcript;
                    if(UI.el('userInput')) UI.el('userInput').value = transcript;
                    this.send();
                };
                micBtn.onclick = () => rec.start();
            } else { micBtn.style.display = 'none'; }
        },

        async send() {
            const input = UI.el('userInput');
            const txt = input.value.trim();
            if(!txt) return;
            
            input.value = '';
            AudioEngine.sfx.success();
            this.renderPage("Processando...", true);
            
            this.history.push({ role: 'user', content: txt });
            
            // Check Special Commands
            if(txt.toLowerCase().includes('oi dual')) {
                State.assistantEnabled = true;
                UI.showToaster("Modo Assistente Ativado");
            }

            try {
                const token = State.getActiveToken();
                if(!token) throw new Error("Sem Chave API. Configure no Cofre.");

                const sysMsg = localStorage.getItem('di_trainingText');
                const msgs = [];
                if(State.assistantEnabled && sysMsg) msgs.push({ role: 'system', content: sysMsg });
                msgs.push(...this.history);

                const req = await fetch(CONFIG.api.endpoint, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: localStorage.getItem('di_modelName') || CONFIG.api.defaultModel,
                        messages: msgs,
                        temperature: CONFIG.api.temp
                    })
                });

                if(!req.ok) throw new Error(`Erro API: ${req.status}`);
                const res = await req.json();
                const reply = res.choices?.[0]?.message?.content || "Sem resposta.";
                
                this.history.push({ role: 'assistant', content: reply });
                this.processResponse(reply);

            } catch (e) {
                this.renderPage(`ERRO: ${e.message}`, false);
                AudioEngine.sfx.error();
            }
        },

        processResponse(text) {
            const blocks = text.split(/\n\s*\n/).filter(p => p.trim());
            const pages = [];
            for (let i = 0; i < blocks.length; i += 3) {
                pages.push(blocks.slice(i, i + 3).join('\n\n'));
            }
            this.renderPage(pages[0], false, pages);
        },

        renderPage(content, isLoading, allPages = []) {
            const out = UI.el('response');
            if(!out) return;
            
            const old = out.querySelectorAll('.page');
            old.forEach(p => p.remove());

            const div = document.createElement('div');
            div.className = 'page active';
            div.innerHTML = isLoading ? `<p class="footer-text" style="color:var(--neon-cyan)">${content}</p>` : this.formatText(content);
            
            const ctrls = out.querySelector('.response-controls');
            if(ctrls) out.insertBefore(div, ctrls);
            else out.appendChild(div);

            if(!isLoading) this.typeEffect(div);
        },

        formatText(txt) {
            return txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                      .split('<br><br>').map(p => `<div class="response-block"><p>${p}</p></div>`).join('');
        },

        typeEffect(container) {
            const els = container.querySelectorAll('p');
            els.forEach((p, idx) => {
                const t = p.innerText;
                p.innerHTML = '';
                let i = 0;
                setTimeout(() => {
                    p.classList.add('typewriter-cursor');
                    const int = setInterval(() => {
                        p.textContent += t.charAt(i);
                        i++;
                        if(i > t.length) { clearInterval(int); p.classList.remove('typewriter-cursor'); }
                    }, 10);
                }, idx * 500);
            });
        }
    };

    // --- 8. VAULT & EDITOR (O Tesouro) ---
    const Vault = {
        stacks: [],
        
        init() {
            // Carrega stacks do localStorage
            const raw = localStorage.getItem(CONFIG.vaultKey);
            if(raw) try { this.stacks = JSON.parse(raw); } catch(e){}
            this.render();
            
            // Events do Cofre
            if(UI.el('addKeyBtn')) UI.el('addKeyBtn').onclick = this.addKey.bind(this);
            if(UI.el('vaultUnlockBtn')) UI.el('vaultUnlockBtn').onclick = this.unlock.bind(this);
            if(UI.el('lockVaultBtn')) UI.el('lockVaultBtn').onclick = this.lock.bind(this);
            
            // Events do Editor (Mini OS)
            if(UI.el('orbBtn')) UI.el('orbBtn').onclick = () => document.body.classList.toggle('system-active');
            
            if(UI.el('createBtn')) UI.el('createBtn').onclick = () => {
                UI.el('viewEditor').classList.remove('state-translated-x');
            };
            
            if(UI.el('cancelEditor')) UI.el('cancelEditor').onclick = () => {
                UI.el('viewEditor').classList.add('state-translated-x');
            };

            if(UI.el('saveEditor')) UI.el('saveEditor').onclick = this.saveModule.bind(this);
            
            // Runtime Close Button
            if(UI.el('closeRuntime')) UI.el('closeRuntime').onclick = () => {
                UI.el('runtimeLayer').classList.remove('state-visible-y');
                setTimeout(()=> UI.el('appFrame').srcdoc = '', 300);
            };
        },

        addKey() {
            const name = UI.el('keyNameInput').value;
            const token = UI.el('keyTokenInput').value;
            if(!name || !token) return UI.showToaster("Dados incompletos", "error");
            
            State.keys.push({ id: Date.now().toString(36), name, token, active: State.keys.length === 0 });
            State.save();
            this.renderKeys();
            UI.el('keyNameInput').value = '';
            UI.el('keyTokenInput').value = '';
            UI.showToaster("Chave Adicionada", "success");
        },

        renderKeys() {
            const list = UI.el('keyList');
            if(!list) return;
            list.innerHTML = '';
            State.keys.forEach(k => {
                const div = document.createElement('div');
                div.className = `key-item ${k.active?'active-item':''}`;
                div.innerHTML = `
                    <div class="meta"><strong>${k.name}</strong></div>
                    <div class="actions">
                        <button onclick="FusionOS.Vault.activateKey('${k.id}')" class="small-btn">ATIVAR</button>
                        <button onclick="FusionOS.Vault.removeKey('${k.id}')" class="small-btn danger">X</button>
                    </div>`;
                list.appendChild(div);
            });
        },

        activateKey(id) {
            State.keys.forEach(k => k.active = (k.id === id));
            State.save();
            State.syncEnv();
            this.renderKeys();
            UI.updateIdentity();
            UI.showToaster("Chave Ativada", "success");
        },

        removeKey(id) {
            if(!confirm("Remover?")) return;
            State.keys = State.keys.filter(k => k.id !== id);
            State.save();
            this.renderKeys();
        },

        unlock() {
            const pass = UI.el('vaultPassInput').value;
            if(!State.encryptedBlob) { UI.showToaster("Cofre não está criptografado", "error"); return; }
            
            Security.decrypt(State.encryptedBlob, pass).then(data => {
                State.keys = data.keys;
                State.user = data.user;
                State.sessionPassword = pass;
                State.syncEnv();
                
                UI.el('vaultModal').style.display = 'none';
                UI.el('keysModal').style.display = 'flex';
                this.renderKeys();
                UI.updateSecurity();
                AudioEngine.sfx.success();
            }).catch(() => {
                UI.showToaster("Senha Incorreta", "error");
                AudioEngine.sfx.error();
            });
        },

        lock() {
            if(State.sessionPassword) {
                State.sessionPassword = null;
                UI.el('keysModal').style.display = 'none';
                UI.updateSecurity();
                UI.showToaster("Sessão Encerrada");
            } else if (!State.encryptedBlob) {
                const p = prompt("Defina senha do Cofre:");
                if(p) {
                    State.sessionPassword = p;
                    State.save();
                    UI.updateSecurity();
                }
            }
        },

        // --- Mini App Store ---
        render() {
            const list = UI.el('stackList');
            if(!list) return;
            list.innerHTML = State.keys.length > 0 ? '' : ''; // Limpa
            
            if(this.stacks.length === 0) {
                 list.innerHTML = '<div style="padding:20px;text-align:center;color:#666">NENHUM APP CRIADO</div>';
                 return;
            }

            this.stacks.forEach(s => {
                const item = document.createElement('div');
                item.className = 'stack-item';
                item.innerHTML = `<div class="stack-info"><h4>${s.title}</h4></div>`;
                item.onclick = () => this.runModule(s);
                list.appendChild(item);
            });
        },

        saveModule() {
            const title = UI.el('modTitle').value;
            const content = UI.el('modContent').value;
            if(!title) { UI.showToaster("Precisa de título", "error"); return; }
            
            this.stacks.unshift({ id: Date.now(), title, content });
            localStorage.setItem(CONFIG.vaultKey, JSON.stringify(this.stacks));
            
            this.render();
            UI.el('viewEditor').classList.add('state-translated-x');
            UI.el('modTitle').value = '';
            UI.el('modContent').value = '';
            UI.showToaster("App Criado!", "success");
        },

        runModule(mod) {
            const frame = UI.el('appFrame');
            if(!frame) return;
            frame.srcdoc = mod.content;
            UI.el('runtimeLayer').classList.add('state-visible-y');
        }
    };

    // --- 9. INICIALIZAÇÃO (O Gênesis) ---
    const init = () => {
        console.log("%c DUAL // FUSION OS V9 ", "background:#000; color:#0ff; padding:5px; border-radius:3px;");
        State.load();
        UI.init();
        Gestures.init();
        AudioEngine.sfx.boot();
    };

    return {
        init,
        Vault, // Expor para onclicks no HTML
        Audio: AudioEngine
    };

})();

// Start
window.addEventListener('DOMContentLoaded', FusionOS.init);
