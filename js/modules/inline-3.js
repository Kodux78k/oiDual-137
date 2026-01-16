
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
      editingId: null // novo: id do módulo que está sendo editado (null = criar novo)
    },

    init() {
      this.cacheDOM();
      this.loadData();
      this.bindEvents();
      if(window.lucide) lucide.createIcons();

      const theme = localStorage.getItem(this.config.themeKey);
      if(theme) document.documentElement.setAttribute('data-theme', theme);

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
        remoteBtn: document.getElementById('remoteBtn')
      };
    },

    bindEvents() {
      this.dom.orbBtn.addEventListener('click', () => this.toggleSystem());
      document.querySelectorAll('[data-url]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.dom.navFrame.src = btn.dataset.url;
          this.showToast(`NAV: ${btn.title}`);
        });
      });

      document.getElementById('createBtn').addEventListener('click', () => this.toggleEditor(true));
      document.getElementById('cancelEditor').addEventListener('click', () => this.cancelEditing());
      document.getElementById('saveEditor').addEventListener('click', () => this.saveModule());

      document.getElementById('dropZone').addEventListener('click', () => this.dom.uploadInput.click());
      this.dom.uploadInput.addEventListener('change', (e) => this.handleUpload(e));
      document.getElementById('uploadBtn').addEventListener('click', () => this.dom.uploadInput.click());
      document.getElementById('backupBtn').addEventListener('click', () => this.exportVault());

      document.getElementById('safeBtn').addEventListener('click', () => this.toggleSafe());

      document.getElementById('themeToggle').addEventListener('click', () => {
         const current = document.documentElement.getAttribute('data-theme');
         const next = current === 'light' ? 'dark' : 'light';
         document.documentElement.setAttribute('data-theme', next);
         localStorage.setItem(this.config.themeKey, next);
         this.showToast(`THEME: ${next.toUpperCase()}`);
      });

      document.getElementById('closeRuntime').addEventListener('click', () => this.closeRuntime());
      document.getElementById('exportBtn').addEventListener('click', () => {
        if(this.dom.appFrame.srcdoc) {
          const blob = new Blob([this.dom.appFrame.srcdoc], {type:'text/html'});
          this.dom.navFrame.src = URL.createObjectURL(blob);
          this.showToast("EXPORTED TO NAV");
          this.closeRuntime();
        }
      });

      // Novo: botão globo aceita URLs
      this.dom.remoteBtn.addEventListener('click', () => this.handleRemoteUrl());
    },

    loadData() {
      try {
        const raw = localStorage.getItem(this.config.vaultKey);
        if(raw) this.state.stacks = JSON.parse(raw);
      } catch(e) { this.state.stacks = []; }
      this.renderVault();

      const last = localStorage.getItem(this.config.navKey);
      if(last && last !== 'about:blank') this.dom.navFrame.src = last;

      this.dom.navFrame.onload = () => {
        try { localStorage.setItem(this.config.navKey, this.dom.navFrame.contentWindow.location.href); } catch(e){}
      };
    },

    toggleSystem(force) {
      this.state.active = force !== undefined ? force : !this.state.active;
      localStorage.setItem(this.config.sysKey, this.state.active);
      if(this.state.active) {
        this.dom.body.classList.add('system-active');
        this.dom.sysStatus.innerText = "ONLINE";
        this.dom.sysStatus.style.color = "var(--neon-cyan)";
        this.dom.sysStatus.style.borderColor = "var(--neon-cyan)";
      } else {
        this.dom.body.classList.remove('system-active');
        this.dom.sysStatus.innerText = "STANDBY";
        this.dom.sysStatus.style.color = "var(--text-muted)";
        this.dom.sysStatus.style.borderColor = "var(--glass-border)";
      }
    },

    toggleEditor(show, moduleObj = null) {
      if(show) {
        this.dom.viewEditor.classList.remove('state-translated-x');
        if(moduleObj) {
          // abrir em modo edição
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
      this.state.safeMode = !this.state.safeMode;
      this.dom.safeLabel.innerText = this.state.safeMode ? "SAFE" : "RAW";
      this.dom.safeLabel.style.color = this.state.safeMode ? "inherit" : "var(--alert-red)";
      this.showToast(this.state.safeMode ? "PROTOCOL: SAFE" : "PROTOCOL: RAW (UNSAFE)");
    },

    exportVault() {
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
        // Atualiza módulo existente
        const idx = this.state.stacks.findIndex(s => s.id === this.state.editingId);
        if(idx === -1) return this.showToast("ERROR: MODULE NOT FOUND");
        this.state.stacks[idx].title = title;
        this.state.stacks[idx].content = content;
        this.state.stacks[idx].date = new Date().toLocaleDateString();
        localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
        this.showToast("MODULE UPDATED");
      } else {
        // Cria novo módulo
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
          } catch(e) { /* Not a JSON array, treat as single file */ }

        this.state.stacks.unshift({
          id: Date.now(),
          title: file.name,
          content: ev.target.result,
          date: new Date().toLocaleDateString()
        });
        localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
        this.renderVault();
        this.showToast("FILE UPLOADED");
      };
      reader.readAsText(file);
      // reset input so same file can be re-uploaded if needed
      e.target.value = '';
    },

    deleteModule(id) {
      if(!confirm("DELETE MODULE?")) return;
      this.state.stacks = this.state.stacks.filter(s => s.id !== id);
      localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
      this.renderVault();
    },

    // Novo: download individual
    downloadModule(id) {
      const mod = this.state.stacks.find(s => s.id === id);
      if(!mod) return this.showToast("ERROR: NOT FOUND");
      const blob = new Blob([mod.content], {type: 'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // sanitize filename
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
      document.getElementById('vaultCount').innerText = `${this.state.stacks.length} ITEMS`;

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

        // Bind actions
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
      this.dom.sysStatus.innerText = "RUNNING";
      this.dom.sysStatus.style.opacity = '0.7';
    },

    closeRuntime() {
      this.dom.runtimeLayer.classList.remove('state-visible-y');
      this.dom.sysStatus.style.opacity = '1';
      this.dom.sysStatus.innerText = "ONLINE";
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

    // Abre editor com módulo carregado (modo editar)
    editModule(id) {
      const mod = this.state.stacks.find(s => s.id === id);
      if(!mod) return this.showToast("ERROR: MODULE NOT FOUND");
      this.toggleEditor(true, mod);
    },

    // Novo: aceita URL, tenta fetch; se fetch falhar faz fallback para abrir navFrame
    async handleRemoteUrl() {
      const url = prompt("INSIRA URL (http(s)://...):");
      if(!url) return;
      try {
        // tentativa de fetch do HTML (CORS pode bloquear)
        const res = await fetch(url, {mode:'cors'});
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const ct = res.headers.get('content-type') || '';
        if(ct.includes('text/html') || ct.includes('application/xhtml+xml')) {
          const text = await res.text();
          // salva como módulo automaticamente
          const mod = { id: Date.now(), title: url, content: text, date: new Date().toLocaleDateString() };
          this.state.stacks.unshift(mod);
          localStorage.setItem(this.config.vaultKey, JSON.stringify(this.state.stacks));
          this.renderVault();
          this.showToast("REMOTE SAVED TO VAULT");
        } else {
          // não-html — apenas abre no navFrame
          this.dom.navFrame.src = url;
          this.showToast("OPENED IN NAV (non-HTML)");
        }
      } catch(err) {
        // Falha (CORS ou rede) — fallback: abrir no navFrame e avisar
        try {
          this.dom.navFrame.src = url;
          this.showToast("FALLBACK: OPENED IN NAV (fetch failed)");
        } catch(e) {
          this.showToast("ERROR: COULD NOT OPEN URL");
        }
      }
    }
  };

  window.onload = () => App.init();
