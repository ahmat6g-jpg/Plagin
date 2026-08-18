const STORE = {
    plugins: [],
    installed: [],
    currentTab: 'home'
};

function loadData() {
    // Загружаем из localStorage
    try {
        const installed = localStorage.getItem('store_installed');
        if (installed) STORE.installed = JSON.parse(installed);
    } catch(e) {}

    // Загружаем каталог
    fetch('plugins.json')
        .then(r => r.json())
        .then(data => {
            STORE.plugins = data;
            renderAll();
        })
        .catch(() => {
            // Если нет plugins.json — используем встроенный
            STORE.plugins = defaultPlugins();
            renderAll();
        });
}

function defaultPlugins() {
    return [
        { id: 'dolphy.vpn', name: 'DolphyVPN', description: 'HTTP/3 VPN tunnel with traffic encryption', author: 'DCA', version: '2.5.0', icon: '🔒', color: '#00BCD4', downloads: 1256, rating: 42 },
        { id: 'dolphy.scanner', name: 'Security Scanner', description: 'Plugin security scanner with detailed report', author: 'gyrut', version: '3.2.0', icon: '🛡️', color: '#2196F3', downloads: 2345, rating: 49 },
        { id: 'dolphy.news', name: 'Dolphy News', description: 'News aggregator with RSS support', author: 'DCA', version: '2.3.0', icon: '📰', color: '#1565C0', downloads: 867, rating: 46 },
        { id: 'dolphy.browser', name: 'Dolphy Browser', description: 'Full-featured browser with tabs and bookmarks', author: 'DCA', version: '2.0.0', icon: '🌐', color: '#4CAF50', downloads: 543, rating: 45 },
        { id: 'dolphy.code', name: 'Dolphy Code', description: 'Code editor with syntax highlighting', author: 'DCA', version: '2.1.0', icon: '💻', color: '#007ACC', downloads: 789, rating: 47 }
    ];
}

function renderAll() {
    renderStats();
    renderPopular();
    renderCatalog();
    renderInstalled();
}

function renderStats() {
    document.getElementById('total-plugins').textContent = STORE.plugins.length;
    document.getElementById('installed-count').textContent = STORE.installed.length;
    
    const updates = STORE.installed.filter(p => {
        const available = STORE.plugins.find(a => a.id === p.id);
        return available && available.version !== p.version;
    }).length;
    document.getElementById('update-count').textContent = updates;
}

function renderPopular() {
    const container = document.getElementById('popular-list');
    const popular = [...STORE.plugins].sort((a,b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 3);
    container.innerHTML = popular.map(p => createPluginCardHTML(p, true)).join('');
}

function renderCatalog() {
    const container = document.getElementById('catalog-list');
    container.innerHTML = STORE.plugins.map(p => createPluginCardHTML(p, false)).join('');
}

function renderInstalled() {
    const container = document.getElementById('installed-list');
    if (STORE.installed.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📦</div>
                <h4>Нет установленных плагинов</h4>
                <p style="color:#666;font-size:13px;">Перейдите в каталог и установите что-нибудь!</p>
            </div>
        `;
        return;
    }
    container.innerHTML = STORE.installed.map(p => createInstalledCardHTML(p)).join('');
}

function createPluginCardHTML(plugin, compact) {
    const isInstalled = STORE.installed.some(p => p.id === plugin.id);
    const color = plugin.color || '#2196F3';

    return `
        <div class="plugin-card" style="border-left-color:${color}">
            <div class="plugin-row">
                <div class="plugin-icon">${plugin.icon || '🔌'}</div>
                <div class="plugin-info">
                    <div class="plugin-name">${plugin.name}</div>
                    <div class="plugin-desc">${compact ? plugin.description.substring(0, 60) + '...' : plugin.description}</div>
                    <div class="plugin-meta">
                        <span>v${plugin.version}</span>
                        <span>· ${plugin.author}</span>
                        <span>· ⭐ ${plugin.rating || 0}</span>
                        <span>· 📥 ${plugin.downloads || 0}</span>
                    </div>
                </div>
            </div>
            <div class="plugin-actions">
                ${!compact ? `<button class="btn-details" onclick="showDetails('${plugin.id}')">📖 Подробнее</button>` : ''}
                ${isInstalled ? 
                    `<button class="btn-installed" disabled>✅ Установлен</button>` :
                    `<button class="btn-install" onclick="installPlugin('${plugin.id}')">📥 Установить</button>`
                }
            </div>
        </div>
    `;
}

function createInstalledCardHTML(plugin) {
    const available = STORE.plugins.find(p => p.id === plugin.id);
    const hasUpdate = available && available.version !== plugin.version;

    return `
        <div class="plugin-card" style="border-left-color:${hasUpdate ? '#FFA726' : '#4CAF50'}">
            <div class="plugin-row">
                <div class="plugin-icon">${plugin.icon || '🔌'}</div>
                <div class="plugin-info">
                    <div class="plugin-name">${plugin.name} ${hasUpdate ? '🔄' : ''}</div>
                    <div class="plugin-meta">
                        <span>v${plugin.version}</span>
                        <span>· ${plugin.author}</span>
                        ${hasUpdate ? `<span style="color:#FFA726;">→ v${available.version} доступно</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="plugin-actions">
                ${hasUpdate ? `<button class="btn-install" onclick="updatePlugin('${plugin.id}')">🔄 Обновить</button>` : ''}
                <button class="btn-details" onclick="showDetails('${plugin.id}')">📖 Подробнее</button>
                <button class="btn-delete" onclick="deletePlugin('${plugin.id}')">🗑️</button>
            </div>
        </div>
    `;
}

function filterPlugins() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('#catalog-list .plugin-card');
    cards.forEach(card => {
        const name = card.querySelector('.plugin-name')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('.plugin-desc')?.textContent?.toLowerCase() || '';
        card.style.display = name.includes(query) || desc.includes(query) ? 'block' : 'none';
    });
}

function installPlugin(id) {
    const plugin = STORE.plugins.find(p => p.id === id);
    if (!plugin) return;

    if (STORE.installed.some(p => p.id === id)) {
        showToast('⚠️ Плагин уже установлен');
        return;
    }

    if (confirm(`Установить ${plugin.name} v${plugin.version}?\nАвтор: ${plugin.author}`)) {
        STORE.installed.push({
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            author: plugin.author,
            description: plugin.description,
            icon: plugin.icon || '🔌',
            installed: Date.now()
        });
        localStorage.setItem('store_installed', JSON.stringify(STORE.installed));
        renderAll();
        showToast('✅ ' + plugin.name + ' установлен!');
    }
}

function updatePlugin(id) {
    const installed = STORE.installed.find(p => p.id === id);
    const available = STORE.plugins.find(p => p.id === id);
    if (!installed || !available) return;

    if (confirm(`Обновить ${installed.name}?\nТекущая: v${installed.version}\nНовая: v${available.version}`)) {
        installed.version = available.version;
        localStorage.setItem('store_installed', JSON.stringify(STORE.installed));
        renderAll();
        showToast('✅ ' + installed.name + ' обновлён до v' + available.version);
    }
}

function deletePlugin(id) {
    if (confirm('Удалить плагин?')) {
        STORE.installed = STORE.installed.filter(p => p.id !== id);
        localStorage.setItem('store_installed', JSON.stringify(STORE.installed));
        renderAll();
        showToast('🗑️ Плагин удалён');
    }
}

function showDetails(id) {
    const plugin = STORE.plugins.find(p => p.id === id) || STORE.installed.find(p => p.id === id);
    if (!plugin) return;

    const isInstalled = STORE.installed.some(p => p.id === plugin.id);
    alert(
        `${plugin.name} v${plugin.version}\n\n` +
        `📝 ${plugin.description}\n` +
        `👤 Автор: ${plugin.author}\n` +
        `⭐ Рейтинг: ${plugin.rating || 'Нет'}\n` +
        `📥 Загрузок: ${plugin.downloads || 0}\n` +
        (isInstalled ? '\n✅ Установлен' : '\n❌ Не установлен')
    );
}

function uploadPlugin() {
    const name = document.getElementById('upload-name').value.trim();
    const desc = document.getElementById('upload-desc').value.trim();
    const author = document.getElementById('upload-author').value.trim();
    const version = document.getElementById('upload-version').value.trim() || '1.0.0';
    const file = document.getElementById('file-input').files[0];

    if (!name || !desc || !author || !file) {
        showToast('⚠️ Заполните все поля и выберите файл');
        return;
    }

    // В реальности здесь будет загрузка на сервер
    // Сейчас просто добавляем локально
    const newPlugin = {
        id: 'user_' + Date.now(),
        name: name,
        description: desc,
        author: author,
        version: version,
        icon: '🔌',
        rating: 0,
        downloads: 0,
        isUser: true
    };

    STORE.plugins.push(newPlugin);
    STORE.installed.push({
        id: newPlugin.id,
        name: name,
        version: version,
        author: author,
        description: desc,
        icon: '🔌',
        installed: Date.now()
    });
    localStorage.setItem('store_installed', JSON.stringify(STORE.installed));
    renderAll();
    showToast('✅ Плагин "' + name + '" загружен!');

    document.getElementById('upload-name').value = '';
    document.getElementById('upload-desc').value = '';
    document.getElementById('upload-author').value = '';
    document.getElementById('upload-version').value = '1.0.0';
    document.getElementById('file-input').value = '';
    document.getElementById('file-name').textContent = 'Выберите файл';
    switchTab('installed');
}

function selectFile() {
    const input = document.getElementById('file-input');
    const label = document.getElementById('file-name');
    if (input.files && input.files[0]) {
        label.textContent = '📄 ' + input.files[0].name;
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById('tab-' + tab).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');

    STORE.currentTab = tab;
}

function showToast(text) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Загрузка
loadData();

// Обработчики для закладок
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
    });
});
