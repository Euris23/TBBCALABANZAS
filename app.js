// Estado global
let currentUser = null;
let availableSundays = getNext4Sundays();
let currentRepertoireDate = availableSundays[0];
let addingToRepertoireType = null; // 'songs', 'choruses', 'hymns'

// Inicialización de Iconos
lucide.createIcons();

function isSpectator(user) {
    if (!user) return true;
    return ['espectador', 'sonido', 'invitado'].includes(user.role);
}

// Elementos del DOM
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const currentUserName = document.getElementById('current-user-name');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');

// Navegación
const tabs = document.querySelectorAll('.tabs .tab[data-target]');
const sections = document.querySelectorAll('.view-section');

// Utils: Fecha
function getNext4Sundays() {
    return getUpcomingSundays(4);
}

function getUpcomingSundays(weeksCount = 20) {
    const dates = [];
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    if (d.getDay() !== 0) d.setDate(d.getDate() + (7 - d.getDay()));
    
    for (let i = 0; i < weeksCount; i++) {
        const nextD = new Date(d);
        nextD.setDate(d.getDate() + (7 * i));
        dates.push(nextD.toISOString().split('T')[0]);
    }
    return dates;
}

function getTurnDatesForUser(user, maxWeeks = 25) {
    const allSundays = getUpcomingSundays(maxWeeks);
    if (!user) return [];
    if (user.role === 'admin') {
        return allSundays.map(dateStr => {
            const singer = getSingerForDate(dateStr);
            const dObj = new Date(dateStr + 'T12:00:00');
            const label = dObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return {
                date: dateStr,
                label: `${label} - Turno: ${singer}`
            };
        });
    }
    const matches = [];
    allSundays.forEach(dateStr => {
        const singer = getSingerForDate(dateStr);
        if (singer.toLowerCase() === user.name.toLowerCase()) {
            const dObj = new Date(dateStr + 'T12:00:00');
            const label = dObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            matches.push({
                date: dateStr,
                label: `${label} (Tu turno de alabanza)`
            });
        }
    });
    return matches;
}

function getTurnIndex(dateString, activeOrder) {
    const order = activeOrder || db.getActiveSingersOrder();
    if (!order || order.length === 0) return 0;
    const anchorDate = new Date('2026-10-12T12:00:00'); // Jelissa starts here
    const targetDate = new Date(dateString + 'T12:00:00');
    const daysDiff = Math.floor((targetDate - anchorDate) / (1000 * 60 * 60 * 24));
    const weeksDiff = Math.floor(daysDiff / 7);
    return ((weeksDiff % order.length) + order.length) % order.length;
}

function getSingerForDate(dateString) {
    const order = db.getActiveSingersOrder();
    if (!order || order.length === 0) return 'Sin asignar';
    const idx = getTurnIndex(dateString, order);
    return order[idx] || 'Sin asignar';
}

// Inicializar App
function initApp() {
    const savedCode = localStorage.getItem('tbbc_session');
    if (savedCode) {
        const user = db.getUserByCode(savedCode);
        if (user) {
            login(user);
        }
    }
    
    // Configurar select de fechas
    const picker = document.getElementById('repertoire-date-picker');
    picker.innerHTML = '';
    availableSundays.forEach(date => {
        const dObj = new Date(date + 'T12:00:00');
        const display = dObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        const singer = getSingerForDate(date);
        picker.innerHTML += `<option value="${date}">${display} - Turno: ${singer}</option>`;
    });
    picker.value = currentRepertoireDate;
    
    // Configurar tema
    const theme = localStorage.getItem('tbbc_theme');
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
}

// Autenticación
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = document.getElementById('login-pin').value;
    const user = db.getUserByCode(pin);
    if (user) {
        loginError.classList.add('hidden');
        localStorage.setItem('tbbc_session', user.code);
        login(user);
    } else {
        loginError.classList.remove('hidden');
    }
});

function login(user) {
    currentUser = user;
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    currentUserName.textContent = `Hola, ${user.name}`;
    
    if (user.role === 'admin') {
        document.getElementById('admin-tab-btn').classList.remove('hidden');
    } else {
        document.getElementById('admin-tab-btn').classList.add('hidden');
    }
    
    // Cargar vistas iniciales
    loadHome();
    loadLibrary();
    loadHistory();
    loadSongsToLearn();
    loadEvents();
    if(user.role === 'admin') loadAdmin();

    // Re-renderizar iconos Lucide (el bottom nav estaba oculto al inicio)
    lucide.createIcons();
}

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    activeLibraryFolder = 'all';
    localStorage.removeItem('tbbc_session');
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    document.getElementById('login-pin').value = '';
});

themeToggle.addEventListener('click', () => {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('tbbc_theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('tbbc_theme', 'dark');
    }
});

// Navegación principal
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        sections.forEach(s => s.classList.add('hidden'));
        document.getElementById(tab.dataset.target).classList.remove('hidden');
        
        if(tab.dataset.target === 'repertoire-tab') {
            loadSongsToLearn();
            loadRepertoire(currentRepertoireDate);
        }
        if(tab.dataset.target === 'events-tab') {
            loadEvents();
        }
        if(tab.dataset.target === 'admin-tab') {
            loadAdmin();
        }
        if(tab.dataset.target === 'history-tab') {
            loadHistory();
        }
        if(tab.dataset.target === 'library-tab') {
            loadLibrary(document.getElementById('lib-search').value);
        }
    });
});

document.getElementById('btn-go-repertoire').addEventListener('click', () => {
    const rep = db.getRepertoireByDate(currentRepertoireDate);
    const container = document.getElementById('view-rep-content');
    container.innerHTML = '';
    
    if (rep.songs.length === 0 && rep.choruses.length === 0 && rep.hymns.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">El repertorio está completamente vacío para esta fecha.</p>';
    } else {
        let html = '';
        if (rep.biblicalText) {
            html += `<div style="background-color: var(--bg-main); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
                        <strong>Texto Bíblico:</strong> <span style="font-style: italic;">${rep.biblicalText}</span>
                     </div>`;
        }
        
        if (rep.songs.length > 0) {
            html += `<h4 style="color: var(--primary); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">Canciones</h4><ul style="list-style-position: inside; margin-bottom: 1rem;">`;
            rep.songs.forEach(s => {
                const song = db.getSongById(s.songId);
                if (song) html += `<li style="margin-bottom: 0.5rem;"><strong>${song.name}</strong> ${song.version ? `<span style="font-size:0.8rem; color:var(--text-muted);">(Versión: ${song.version})</span>` : ''} <a href="${song.link}" target="_blank" style="color: var(--primary-light); font-size: 0.85rem; margin-left: 0.5rem; text-decoration: none;">[Escuchar]</a></li>`;
            });
            html += `</ul>`;
        }
        
        if (rep.choruses.length > 0) {
            html += `<h4 style="color: var(--primary); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">Coros</h4><ul style="list-style-position: inside; margin-bottom: 1rem;">`;
            rep.choruses.forEach(c => {
                html += `<li style="margin-bottom: 0.5rem;"><strong>${c.name}</strong> ${c.link ? `<a href="${c.link}" target="_blank" style="color: var(--primary-light); font-size: 0.85rem; margin-left: 0.5rem; text-decoration: none;">[Escuchar]</a>` : ''}</li>`;
            });
            html += `</ul>`;
        }
        
        if (rep.hymns.length > 0) {
            html += `<h4 style="color: var(--primary); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">Himnos</h4><ul style="list-style-position: inside; margin-bottom: 1rem;">`;
            rep.hymns.forEach(h => {
                html += `<li style="margin-bottom: 0.5rem;"><strong>${h.name}</strong> ${h.link ? `<a href="${h.link}" target="_blank" style="color: var(--primary-light); font-size: 0.85rem; margin-left: 0.5rem; text-decoration: none;">[Escuchar]</a>` : ''}</li>`;
            });
            html += `</ul>`;
        }
        
        container.innerHTML = html;
    }
    
    document.getElementById('modal-view-rep').classList.add('active');
});

document.getElementById('btn-google-calendar').addEventListener('click', () => {
    const rep = db.getRepertoireByDate(currentRepertoireDate);
    
    // Generar texto con las canciones
    let songList = 'CANCIONES:%0A';
    rep.songs.forEach(s => {
        const songData = db.getSongById(s.songId);
        if(songData) songList += `- ${songData.name}%0A`;
    });
    songList += '%0ACOROS:%0A';
    rep.choruses.forEach(c => songList += `- ${c.name}%0A`);
    songList += '%0AHIMNOS:%0A';
    rep.hymns.forEach(h => songList += `- ${h.name}%0A`);
    
    // Fecha objetivo: Miércoles previo (11 días antes del domingo del repertorio, o 4 días antes del domingo, dependiendo. "miercoles ... para la otra semana de arriba, no para el domingo de esa semana").
    // Si currentRepertoireDate es el Domingo de la "semana de arriba", el recordatorio es el miércoles previo a ESE domingo, es decir, 4 días antes. 
    // O tal vez 11 días antes. Asumiremos 11 días antes, que es el miércoles de la semana en curso para recordar el domingo de la PRÓXIMA semana.
    const sundayDate = new Date(currentRepertoireDate + 'T12:00:00');
    const wednesdayDate = new Date(sundayDate);
    wednesdayDate.setDate(wednesdayDate.getDate() - 11);
    
    const nextDate = new Date(wednesdayDate.getTime());
    nextDate.setHours(9, 0, 0); // 9:00 AM
    const endDate = new Date(wednesdayDate.getTime());
    endDate.setHours(10, 0, 0); // 10:00 AM
    
    const formatGoogleDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatGoogleDate(nextDate)}/${formatGoogleDate(endDate)}`;
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Recordatorio+Repertorio+TBBC&dates=${dates}&details=${songList}`;
    
    window.open(url, '_blank');
});

// VISTA: INICIO
function loadHome() {
    currentUserName.textContent = currentUser.name;
    document.getElementById('welcome-title').textContent = `Hola, ${currentUser.name} 👋`;
    
    // Find the date for this user
    let userDate = null;
    if (currentUser.role === 'admin') {
        document.getElementById('welcome-text').textContent = "Tienes acceso de administrador. Puedes gestionar el repertorio de cualquier fecha.";
    } else if (isSpectator(currentUser)) {
        document.getElementById('welcome-text').textContent = `Tienes acceso de ${currentUser.role}. Puedes ver el repertorio y la biblioteca.`;
    } else {
        for (let date of availableSundays) {
            const turnIndex = getTurnIndex(date);
            const expectedSingerName = db.getSingersOrder()[turnIndex];
            if (currentUser.name === expectedSingerName) {
                userDate = date;
                break;
            }
        }
        if (userDate) {
            const dObj = new Date(userDate + 'T12:00:00');
            const display = dObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('welcome-text').innerHTML = `Recuerda elegir las canciones para la fecha: <strong>${display}</strong>.`;
        } else {
            document.getElementById('welcome-text').innerHTML = "No tienes turno asignado en las próximas 4 semanas.";
        }
    }

    document.getElementById('next-sunday-date').textContent = new Date(currentRepertoireDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    const rep = db.getRepertoireByDate(currentRepertoireDate);
    document.getElementById('song-count').textContent = rep.songs.length;

    const badge = document.getElementById('repertoire-status');
    badge.textContent = rep.status;
    badge.className = `badge ${rep.status === 'Completado' ? 'badge-success' : 'badge-warning'}`;

    // Mostrar quién es el responsable del repertorio de esa semana
    const singerNameEl = document.getElementById('home-singer-name');
    if (singerNameEl) {
        const assignedSinger = getSingerForDate(currentRepertoireDate);
        if (assignedSinger) {
            const isMe = currentUser && currentUser.name.toLowerCase() === assignedSinger.toLowerCase();
            singerNameEl.textContent = assignedSinger + (isMe ? ' (Tú)' : '');
            singerNameEl.style.color = isMe ? 'var(--success)' : 'var(--accent)';
        } else {
            singerNameEl.textContent = '—';
            singerNameEl.style.color = 'var(--text-muted)';
        }
    }
}

// VISTA: REPERTORIO
document.getElementById('repertoire-date-picker').value = currentRepertoireDate;
document.getElementById('repertoire-date-picker').addEventListener('change', (e) => {
    currentRepertoireDate = e.target.value;
    loadRepertoire(currentRepertoireDate);
    loadHome();
});

document.getElementById('repertoire-biblical-text').addEventListener('change', (e) => {
    const rep = db.getRepertoireByDate(currentRepertoireDate);
    rep.biblicalText = e.target.value;
    db.saveData();
});

function loadRepertoire(date) {
    const rep = db.getRepertoireByDate(date);
    
    // --- Determinar si es el turno del usuario actual ---
    const assignedSinger = getSingerForDate(date);
    const isMyTurn = currentUser.role === 'admin' ||
        (currentUser.role === 'integrante' &&
         currentUser.name.toLowerCase() === assignedSinger.toLowerCase());
    
    // Indicador de turno / modo lectura
    const turnIndicator = document.getElementById('repertoire-turn-indicator');
    if (turnIndicator) {
        if (isSpectator(currentUser) || rep.status === 'Completado') {
            turnIndicator.innerHTML = '';
        } else if (!isMyTurn) {
            turnIndicator.innerHTML = `
                <div style="
                    display: flex; align-items: center; gap: 0.6rem;
                    background: rgba(var(--primary-rgb, 30,58,138), 0.08);
                    border: 1px solid var(--border-color);
                    border-left: 4px solid var(--primary-light);
                    border-radius: var(--radius);
                    padding: 0.6rem 1rem;
                    font-size: 0.875rem;
                    color: var(--text-muted);
                ">
                    <i data-lucide="eye" style="width:16px;height:16px;flex-shrink:0;color:var(--primary-light);"></i>
                    <span>Modo lectura &mdash; Esta semana le toca a <strong style="color:var(--text-main);">${assignedSinger}</strong>. Solo podrás ver el repertorio.</span>
                </div>`;
            lucide.createIcons();
        } else {
            turnIndicator.innerHTML = `
                <div style="
                    display: flex; align-items: center; gap: 0.6rem;
                    background: rgba(16,185,129,0.08);
                    border: 1px solid var(--border-color);
                    border-left: 4px solid var(--success);
                    border-radius: var(--radius);
                    padding: 0.6rem 1rem;
                    font-size: 0.875rem;
                    color: var(--text-muted);
                ">
                    <i data-lucide="check-circle" style="width:16px;height:16px;flex-shrink:0;color:var(--success);"></i>
                    <span>✨ ¡Esta semana es tu turno, <strong style="color:var(--text-main);">${currentUser.name}</strong>! Puedes agregar las canciones del repertorio.</span>
                </div>`;
            lucide.createIcons();
        }
    }

    // Set biblical text — solo editable si es el turno o admin
    document.getElementById('repertoire-biblical-text').value = rep.biblicalText || '';
    document.getElementById('repertoire-biblical-text').disabled =
        rep.status === 'Completado' || (!isMyTurn && currentUser.role !== 'admin');
    
    // Complete button (solo admin)
    const adminCompleteContainer = document.getElementById('admin-complete-container');
    if (currentUser.role === 'admin' && rep.status !== 'Completado') {
        adminCompleteContainer.classList.remove('hidden');
    } else {
        adminCompleteContainer.classList.add('hidden');
    }
    
    // Mostrar/ocultar botones de añadir según turno, estado y rol
    document.querySelectorAll('.btn-add-rep').forEach(btn => {
        const shouldHide = rep.status === 'Completado' || isSpectator(currentUser) || !isMyTurn;
        if (shouldHide) btn.classList.add('hidden');
        else btn.classList.remove('hidden');
    });
    
    // Render Canciones por cantante
    const singersContainer = document.getElementById('singers-lists');
    singersContainer.innerHTML = '';
    
    if (rep.songs.length === 0) {
        singersContainer.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Aún no se han asignado canciones.</p>';
    } else {
        const order = db.getSingersOrder();
        // Incluir Administrador si agregó algo
        if (rep.songs.some(s => s.addedBy === 0)) {
            order.push('Administrador');
        }
        
        order.forEach(singerName => {
            const singer = db.data.users.find(u => u.name === singerName);
            if(!singer) return;
            
            const mySongs = rep.songs.filter(s => s.addedBy === singer.id);
            
            // Hide if no songs
            if (mySongs.length === 0) return;
            
            const group = document.createElement('div');
            group.style.marginBottom = '1.5rem';
            group.innerHTML = `
                <h4 style="border-bottom: 2px solid var(--accent); display: inline-block; padding-bottom: 0.25rem; margin-bottom: 0.75rem;">${singerName}</h4>
                <div class="song-list"></div>
            `;
            
            const listDiv = group.querySelector('.song-list');
            mySongs.forEach(item => {
                const song = (item.songId ? db.getSongById(item.songId) : null) || (item.name ? item : null);
                if (song) {
                    listDiv.appendChild(createRepItemHTML(item, song, 'songs', date, rep.status));
                }
            });
            singersContainer.appendChild(group);
        });
    }
    // Render Coros y Himnos
    const renderSimpleList = (listId, items, type) => {
        const container = document.getElementById(listId);
        container.innerHTML = '';
        if(items.length === 0) container.innerHTML = '<p style="color: var(--text-muted);">No hay registros.</p>';
        items.forEach(item => {
            container.appendChild(createRepItemHTML(item, item, type, date, rep.status));
        });
    };
    renderSimpleList('choruses-list', rep.choruses, 'choruses');
    renderSimpleList('hymns-list', rep.hymns, 'hymns');
    lucide.createIcons();
}

function createRepItemHTML(itemData, displayData, type, date, status = 'En preparación') {
    const div = document.createElement('div');
    div.className = 'song-item';
    
    const hoursPassed = (Date.now() - (itemData.timestamp || itemData.id)) / (1000 * 60 * 60);
    const canDelete = status !== 'Completado' && (currentUser.role === 'admin' || (itemData.addedBy === currentUser.id && hoursPassed <= 24));
    
    let actionBtns = '';
    if (canDelete) {
        actionBtns += `<button class="btn btn-outline" style="border:none; color: var(--error); padding: 0.5rem;" onclick="removeRepItem('${date}', '${type}', ${itemData.id})"><i data-lucide="trash-2"></i></button>`;
    }
    
    // Evaluation button for admin if completed and type is song
    if (status === 'Completado' && type === 'songs' && currentUser.role === 'admin') {
        actionBtns += `<button class="btn btn-outline" style="border:none; color: var(--primary); padding: 0.5rem;" onclick="openEvaluation(${itemData.songId}, '${date}')" title="Evaluar"><i data-lucide="award"></i></button>`;
    }
    
    // Tonos
    let tonesHTML = '';
    if (displayData.tones) {
        const t = displayData.tones;
        tonesHTML = `
            <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--accent);">
                ${t.gerald ? `Ger: <strong>${t.gerald}</strong> ` : ''}
                ${t.jelissa ? `Jel: <strong>${t.jelissa}</strong> ` : ''}
                ${t.yaneyri ? `Yan: <strong>${t.yaneyri}</strong>` : ''}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="song-info">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                <h4 style="margin:0;">${displayData.name}</h4>
                ${displayData.version ? `
                    <span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; font-weight:500;">
                        ${displayData.version}
                    </span>
                ` : ''}
            </div>
            <div class="song-meta" style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap:wrap;">
                ${displayData.link ? `<a href="${displayData.link}" target="_blank" class="btn btn-outline btn-listen" style="font-size: 0.8rem; padding: 0.25rem 0.6rem; text-decoration: none; color: var(--primary-light); border-color: var(--primary-light); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="youtube" style="width: 14px; height: 14px;"></i> Escuchar canción</a>` : '<span style="font-size: 0.8rem; color: var(--text-muted);">Sin enlace disponible</span>'}
                ${displayData.evaluations && displayData.evaluations.length > 0 ? `<button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.25rem 0.5rem; color: var(--accent); border-color: var(--accent);" onclick="viewEvaluations(${displayData.id})"><i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Ver Comentarios (${displayData.evaluations.length})</button>` : ''}
            </div>
            ${tonesHTML}
        </div>
        <div class="song-actions flex">
            ${actionBtns}
        </div>
    `;
    return div;
}

window.removeRepItem = (date, type, id) => {
    if(confirm('¿Estás seguro de quitar este elemento del repertorio?')) {
        try {
            db.removeRepertoireItem(date, type, id, currentUser.id);
            loadRepertoire(date);
            loadHome();
        } catch(e) {
            alert(e.message);
        }
    }
};

// Agregar al repertorio
document.querySelectorAll('.btn-add-rep').forEach(btn => {
    btn.addEventListener('click', () => {
        
        if (isSpectator(currentUser)) {
            alert('Tienes permisos de espectador solamente.');
            return;
        }
        if (currentUser.role !== 'admin') {
            const order = db.getActiveSingersOrder();
            const turnIndex = getTurnIndex(currentRepertoireDate, order);
            const expectedSingerName = order[turnIndex];
            
            if (currentUser.name !== expectedSingerName) {
                const userIndex = order.indexOf(currentUser.name);
                let diffWeeks = userIndex - turnIndex;
                if (diffWeeks <= 0) diffWeeks += order.length;
                
                const nextDate = new Date(currentRepertoireDate + 'T12:00:00');
                nextDate.setDate(nextDate.getDate() + (diffWeeks * 7));
                const formattedDate = nextDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' });
                
                alert(`Hola ${currentUser.name}, no es tu turno. Le toca a ${expectedSingerName}.\nTe toca para la semana del ${formattedDate}.`);
                return;
            }
        }

        addingToRepertoireType = btn.dataset.type;
        document.getElementById('modal-select-rep').classList.add('active');
        renderAddRepList();
    });
});

document.getElementById('search-to-add').addEventListener('input', (e) => {
    renderAddRepList(e.target.value);
});

function renderAddRepList(query = '') {
    const container = document.getElementById('select-rep-list');
    container.innerHTML = '';
    
    if (addingToRepertoireType === 'songs') {
        let songs = db.searchSongs(query);
        const favs = db.getUserFavorites(currentUser.id);
        
        // Ordenar: Favoritas primero
        songs.sort((a, b) => {
            const aFav = favs.find(f => f.id === a.id) ? 1 : 0;
            const bFav = favs.find(f => f.id === b.id) ? 1 : 0;
            return bFav - aFav;
        });
        
        const currentRep = db.getRepertoireByDate(currentRepertoireDate);

        songs.forEach(song => {
            const isFav = favs.find(f => f.id === song.id);
            const isAdded = currentRep.songs.some(s => s.songId === song.id);
            
            let btnHTML = '';
            if (isAdded) {
                btnHTML = `<button class="btn btn-success" style="padding: 0.25rem 0.75rem; background-color: var(--success); color: white; cursor: not-allowed;" disabled>Seleccionada</button>`;
            } else {
                btnHTML = `<button class="btn btn-primary" style="padding: 0.25rem 0.75rem;" onclick="addItemToRep(${song.id})">Añadir</button>`;
            }

            const div = document.createElement('div');
            div.className = 'song-item';
            div.innerHTML = `
                <div class="song-info">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <h4 style="margin:0;">${song.name} ${isFav ? '⭐' : ''}</h4>
                        <span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; font-weight:500;">
                            <i data-lucide="mic" style="width:12px; height:12px; vertical-align:middle; margin-right:2px;"></i>${song.version || 'Versión General'}
                        </span>
                        ${song.link ? `<a href="${song.link}" target="_blank" class="btn btn-outline btn-listen" style="padding:0.2rem 0.5rem; font-size:0.75rem; text-decoration:none; color:var(--primary-light); border-color:var(--primary-light);"><i data-lucide="external-link" style="width:11px; height:11px;"></i> Escuchar</a>` : ''}
                    </div>
                </div>
                ${btnHTML}
            `;
            container.appendChild(div);
        });
        if (window.lucide) lucide.createIcons();
    } else {
        // Coros e Himnos: formulario manual
        container.innerHTML = `
            <form id="form-manual-item">
                <div class="input-group">
                    <label class="input-label">Nombre (Obligatorio) <span style="color:var(--error);">*</span></label>
                    <input type="text" id="manual-name" class="input-field" placeholder="Nombre..." required>
                </div>
                <div class="input-group">
                    <label class="input-label">Enlace / Link (YouTube/Spotify) <span style="color:var(--error);">*</span></label>
                    <input type="url" id="manual-link" class="input-field" placeholder="https://youtube.com/..." required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Agregar al Repertorio</button>
            </form>
        `;
        document.getElementById('form-manual-item').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('manual-name').value.trim();
            const link = document.getElementById('manual-link').value.trim();
            if (!link) {
                alert('El enlace es obligatorio.');
                return;
            }
            try {
                db.addRepertoireItem(currentRepertoireDate, addingToRepertoireType, { name, link }, currentUser.id);
                document.getElementById('modal-select-rep').classList.remove('active');
                loadRepertoire(currentRepertoireDate);
            } catch(err) {
                alert(err.message);
            }
        });
    }
}

window.addItemToRep = (songId) => {
    db.addRepertoireItem(currentRepertoireDate, 'songs', { songId }, currentUser.id);
    renderAddRepList(document.getElementById('search-to-add').value);
    loadRepertoire(currentRepertoireDate);
    loadHome();
};

// VISTA: BIBLIOTECA Y CARPETAS PERSONALES
let activeLibraryFolder = 'all'; // 'all', 'favorites', or folderId (number)

function renderUserFoldersBar() {
    const container = document.getElementById('user-folders-bar');
    if (!container || !currentUser) return;
    container.innerHTML = '';

    const allSongs = db.getSongs();
    const favSongs = db.getUserFavorites(currentUser.id);
    const userFolders = db.getUserFolders(currentUser.id);

    // Pill: Todas
    const pillAll = document.createElement('div');
    pillAll.className = `folder-pill ${activeLibraryFolder === 'all' ? 'active' : ''}`;
    pillAll.innerHTML = `
        <i data-lucide="music-2" style="width:14px; height:14px;"></i>
        <span>Todas</span>
        <span class="folder-pill-count">${allSongs.length}</span>
    `;
    pillAll.addEventListener('click', () => {
        activeLibraryFolder = 'all';
        loadLibrary(document.getElementById('lib-search').value);
    });
    container.appendChild(pillAll);

    // Pill: Favoritas
    const pillFav = document.createElement('div');
    pillFav.className = `folder-pill ${activeLibraryFolder === 'favorites' ? 'active' : ''}`;
    pillFav.innerHTML = `
        <i data-lucide="star" style="width:14px; height:14px;"></i>
        <span>Mis Favoritas</span>
        <span class="folder-pill-count">${favSongs.length}</span>
    `;
    pillFav.addEventListener('click', () => {
        activeLibraryFolder = 'favorites';
        loadLibrary(document.getElementById('lib-search').value);
    });
    container.appendChild(pillFav);

    // Pills: Carpetas personales del integrante
    userFolders.forEach(folder => {
        const count = (folder.songIds || []).length;
        const isActive = activeLibraryFolder === folder.id;
        const pill = document.createElement('div');
        pill.className = `folder-pill ${isActive ? 'active' : ''}`;
        pill.innerHTML = `
            <i data-lucide="folder" style="width:14px; height:14px;"></i>
            <span>${folder.name}</span>
            <span class="folder-pill-count">${count}</span>
            <span class="folder-pill-action" title="Renombrar carpeta" onclick="event.stopPropagation(); openEditFolderModal(${folder.id})">
                <i data-lucide="pencil" style="width:11px; height:11px;"></i>
            </span>
            <span class="folder-pill-action" title="Eliminar carpeta" onclick="event.stopPropagation(); confirmDeleteFolder(${folder.id})">
                <i data-lucide="trash-2" style="width:11px; height:11px;"></i>
            </span>
        `;
        pill.addEventListener('click', () => {
            activeLibraryFolder = folder.id;
            loadLibrary(document.getElementById('lib-search').value);
        });
        container.appendChild(pill);
    });

    if (window.lucide) lucide.createIcons();
}

function loadLibrary(query = '') {
    if (!currentUser) return;
    document.getElementById('btn-new-song').classList.remove('hidden');

    renderUserFoldersBar();

    const list = document.getElementById('library-list');
    list.innerHTML = '';

    let songs = db.searchSongs(query);
    const favs = db.getUserFavorites(currentUser.id);

    // Filtrar según carpeta activa
    if (activeLibraryFolder === 'favorites') {
        const favIds = favs.map(f => f.id);
        songs = songs.filter(s => favIds.includes(s.id));
    } else if (typeof activeLibraryFolder === 'number') {
        const currentFolder = db.getUserFolderById(activeLibraryFolder);
        if (currentFolder && currentFolder.userId === currentUser.id) {
            const folderSongIds = currentFolder.songIds || [];
            songs = songs.filter(s => folderSongIds.includes(s.id));
        } else {
            activeLibraryFolder = 'all';
        }
    }

    if (songs.length === 0) {
        let emptyMsg = 'No se encontraron canciones en la biblioteca.';
        if (activeLibraryFolder === 'favorites') {
            emptyMsg = 'Aún no has marcado canciones como favoritas.';
        } else if (typeof activeLibraryFolder === 'number') {
            const currentFolder = db.getUserFolderById(activeLibraryFolder);
            emptyMsg = `La carpeta "${currentFolder?.name || ''}" está vacía. Haz clic en el botón 📁 de cualquier canción para añadirla aquí.`;
        }
        list.innerHTML = `
            <div class="card" style="text-align:center; padding: 2.5rem 1rem;">
                <i data-lucide="folder-open" style="width:40px; height:40px; color:var(--text-muted); margin-bottom:0.75rem; display:block; margin-left:auto; margin-right:auto;"></i>
                <p style="color:var(--text-muted); font-size:0.92rem; margin:0;">${emptyMsg}</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    songs.forEach(song => {
        const isFav = favs.find(f => f.id === song.id);
        const myFolders = db.getSongUserFolders(currentUser.id, song.id);

        const folderBadgesHTML = myFolders.length > 0 ? `
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin-top:0.35rem;">
                ${myFolders.map(f => `<span class="song-folder-badge" title="En tu carpeta '${f.name}'"><i data-lucide="folder" style="width:10px; height:10px;"></i> ${f.name}</span>`).join('')}
            </div>
        ` : '';

        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <div class="song-info" style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <h4 style="margin:0;">${song.name}</h4>
                    <span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; font-weight:500;">
                        <i data-lucide="mic" style="width:12px; height:12px; vertical-align:middle; margin-right:2px;"></i>Versión: ${song.version || 'General'}
                    </span>
                </div>
                <div class="song-meta" style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.35rem; flex-wrap:wrap;">
                    ${song.link ? `<a href="${song.link}" target="_blank" class="btn btn-outline btn-listen" style="font-size:0.78rem; padding:0.2rem 0.5rem; text-decoration:none; color:var(--primary-light); border-color:var(--primary-light); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="external-link" style="width:12px; height:12px;"></i> Escuchar canción / Enlace</a>` : '<span style="font-size:0.78rem; color:var(--text-muted);">Sin enlace</span>'}
                    ${song.evaluations && song.evaluations.length > 0 ? `<button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.15rem 0.4rem; color: var(--accent); border-color: var(--accent);" onclick="viewEvaluations(${song.id})" title="Ver Comentarios"><i data-lucide="message-square" style="width: 12px; height: 12px;"></i> ${song.evaluations.length}</button>` : ''}
                </div>
                ${folderBadgesHTML}
            </div>
            <div class="flex gap-2" style="align-items:center; flex-shrink:0;">
                <button class="btn btn-outline" style="border:none; color: ${myFolders.length > 0 ? 'var(--primary-light)' : 'var(--text-muted)'}; padding: 0.5rem;" onclick="openManageSongFolders(${song.id})" title="Organizar en mis carpetas">
                    <i data-lucide="folder-plus"></i>
                </button>
                <button class="btn btn-outline" style="border:none; color: ${isFav ? 'var(--accent)' : 'var(--text-muted)'}; padding: 0.5rem;" onclick="toggleFav(${song.id})" title="Favorita">
                    <i data-lucide="star" ${isFav ? 'fill="currentColor"' : ''}></i>
                </button>
                ${currentUser.role === 'admin' ? `
                    <button class="btn btn-outline" style="border:none; padding: 0.5rem;" onclick="editSong(${song.id})" title="Editar"><i data-lucide="edit"></i></button>
                    <button class="btn btn-outline" style="border:none; color: var(--error); padding: 0.5rem;" onclick="deleteSong(${song.id})" title="Eliminar"><i data-lucide="trash-2"></i></button>
                ` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}

document.getElementById('lib-search').addEventListener('input', (e) => loadLibrary(e.target.value));

window.toggleFav = (songId) => {
    db.toggleFavorite(currentUser.id, songId);
    loadLibrary(document.getElementById('lib-search').value);
};

// --- GESTIÓN DE CARPETAS PERSONALES ---
function openCreateFolderModal(folderId = null) {
    document.getElementById('form-folder').reset();
    document.getElementById('folder-edit-id').value = folderId || '';
    if (folderId) {
        const folder = db.getUserFolderById(folderId);
        if (!folder) return;
        document.getElementById('folder-name-input').value = folder.name;
        document.getElementById('modal-folder-title').innerHTML = '<i data-lucide="pencil" style="vertical-align:middle; margin-right:4px;"></i> Renombrar Carpeta';
    } else {
        document.getElementById('modal-folder-title').innerHTML = '<i data-lucide="folder-plus" style="vertical-align:middle; margin-right:4px;"></i> Nueva Carpeta';
    }
    document.getElementById('modal-folder').classList.add('active');
    if (window.lucide) lucide.createIcons();
}

document.getElementById('btn-create-folder')?.addEventListener('click', () => {
    openCreateFolderModal();
});

window.openEditFolderModal = (folderId) => {
    openCreateFolderModal(folderId);
};

window.confirmDeleteFolder = (folderId) => {
    const folder = db.getUserFolderById(folderId);
    if (!folder) return;
    if (confirm(`¿Eliminar tu carpeta "${folder.name}"?\n(Las canciones no se eliminarán de la biblioteca general).`)) {
        db.deleteUserFolder(currentUser.id, folderId);
        if (activeLibraryFolder === folderId) {
            activeLibraryFolder = 'all';
        }
        loadLibrary(document.getElementById('lib-search').value);
    }
};

document.getElementById('form-folder')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('folder-name-input').value.trim();
    const editId = document.getElementById('folder-edit-id').value;
    try {
        if (editId) {
            db.renameUserFolder(currentUser.id, parseInt(editId), name);
        } else {
            const newFolder = db.createUserFolder(currentUser.id, name);
            activeLibraryFolder = newFolder.id;
        }
        document.getElementById('modal-folder').classList.remove('active');
        loadLibrary(document.getElementById('lib-search').value);
    } catch(err) {
        alert(err.message);
    }
});

// Modal Organizar Canción en Carpetas
window.openManageSongFolders = (songId) => {
    const song = db.getSongById(songId);
    if (!song) return;
    document.getElementById('folder-target-song-id').value = songId;
    document.getElementById('modal-song-folders-song-name').textContent = `${song.name} (${song.version || 'Versión General'})`;

    renderManageSongFoldersList();
    document.getElementById('modal-song-folders').classList.add('active');
    if (window.lucide) lucide.createIcons();
};

function renderManageSongFoldersList() {
    const songId = parseInt(document.getElementById('folder-target-song-id').value);
    const container = document.getElementById('modal-song-folders-list');
    if (!container) return;
    container.innerHTML = '';

    const userFolders = db.getUserFolders(currentUser.id);
    if (userFolders.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 1.5rem 0.5rem; color: var(--text-muted);">
                <i data-lucide="folder-x" style="width:36px; height:36px; margin-bottom:0.5rem; display:block; margin-left:auto; margin-right:auto;"></i>
                <p style="font-size:0.9rem; margin:0 0 0.5rem;">Aún no tienes carpetas personales creadas.</p>
                <p style="font-size:0.8rem; margin:0;">Crea una para organizar tus canciones como desees.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    userFolders.forEach(folder => {
        const isChecked = folder.songIds && folder.songIds.includes(songId);
        const item = document.createElement('label');
        item.style.cssText = 'display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.85rem; border:1px solid var(--border-color); border-radius:var(--radius); background:var(--bg-main); cursor:pointer; font-size:0.9rem; transition: background 0.15s; user-select:none;';
        item.innerHTML = `
            <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;">
            <span style="font-weight: 500; flex:1;">📁 ${folder.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${(folder.songIds || []).length} canciones</span>
        `;
        item.querySelector('input').addEventListener('change', () => {
            db.toggleSongInUserFolder(currentUser.id, folder.id, songId);
            renderManageSongFoldersList();
            loadLibrary(document.getElementById('lib-search').value);
        });
        container.appendChild(item);
    });
}

document.getElementById('btn-quick-new-folder')?.addEventListener('click', () => {
    document.getElementById('modal-song-folders').classList.remove('active');
    openCreateFolderModal();
});

// Modales cerrar
document.querySelectorAll('.close-modal, .close-modal-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('active');
    });
});

// Nueva Canción
document.getElementById('btn-new-song').addEventListener('click', () => {
    document.getElementById('form-song').reset();
    document.getElementById('song-id').value = '';
    document.getElementById('song-version').value = '';
    document.getElementById('modal-song-title').textContent = 'Nueva Canción';
    
    document.getElementById('song-name').disabled = false;
    document.getElementById('song-version').disabled = false;
    document.getElementById('song-link').disabled = false;
    document.getElementById('song-lyrics').disabled = false;
    
    // Solo el administrador ve la sección de tonos
    if (currentUser.role === 'admin') {
        document.getElementById('song-tones-section').classList.remove('hidden');
        document.getElementById('tone-jelissa').value = '';
        document.getElementById('tone-yaneyri').value = '';
        document.getElementById('tone-betty').value = '';
        document.getElementById('tone-euris').value = '';
        document.getElementById('tone-johan').value = '';
    } else {
        document.getElementById('song-tones-section').classList.add('hidden');
    }
    
    document.getElementById('modal-song').classList.add('active');
});

window.editSong = (id) => {
    const song = db.getSongById(id);
    document.getElementById('form-song').reset();
    document.getElementById('song-id').value = song.id;
    document.getElementById('song-name').value = song.name;
    document.getElementById('song-version').value = song.version || '';
    document.getElementById('song-link').value = song.link;
    document.getElementById('song-lyrics').value = song.lyrics || '';
    
    document.getElementById('modal-song-title').textContent = 'Editar Canción / Tonos';
    
    document.getElementById('song-name').disabled = currentUser.role !== 'admin';
    document.getElementById('song-version').disabled = currentUser.role !== 'admin';
    document.getElementById('song-link').disabled = currentUser.role !== 'admin';
    document.getElementById('song-lyrics').disabled = currentUser.role !== 'admin';
    
    // Solo el administrador ve y modifica los tonos
    if (currentUser.role === 'admin') {
        document.getElementById('song-tones-section').classList.remove('hidden');
        document.getElementById('tone-jelissa').value = song.tones?.jelissa || '';
        document.getElementById('tone-yaneyri').value = song.tones?.yaneyri || '';
        document.getElementById('tone-betty').value = song.tones?.betty || '';
        document.getElementById('tone-euris').value = song.tones?.euris || '';
        document.getElementById('tone-johan').value = song.tones?.johan || '';
    } else {
        document.getElementById('song-tones-section').classList.add('hidden');
    }
    
    document.getElementById('modal-song').classList.add('active');
};

document.getElementById('form-song').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('song-id').value;
    const name = document.getElementById('song-name').value.trim();
    const version = document.getElementById('song-version').value.trim();
    const link = document.getElementById('song-link').value.trim();
    const lyrics = document.getElementById('song-lyrics').value.trim();
    
    if (!version) {
        alert('Debes especificar la versión o quién canta esta versión de la canción.');
        return;
    }
    if (!link) {
        alert('Debes colocar el enlace o link de la canción (YouTube/Spotify).');
        return;
    }

    try {
        if (id) {
            const song = db.getSongById(parseInt(id));
            if (currentUser.role === 'admin') {
                song.name = name;
                song.version = version;
                song.link = link;
                song.lyrics = lyrics;
                let tones = song.tones || { jelissa: '', yaneyri: '', betty: '', euris: '', johan: '' };
                tones.jelissa = document.getElementById('tone-jelissa').value;
                tones.yaneyri = document.getElementById('tone-yaneyri').value;
                tones.betty = document.getElementById('tone-betty').value;
                tones.euris = document.getElementById('tone-euris').value;
                tones.johan = document.getElementById('tone-johan').value;
                db.updateSongTones(parseInt(id), tones, currentUser.id);
            }
            db.saveData();
        } else {
            let tones = { jelissa: '', yaneyri: '', betty: '', euris: '', johan: '' };
            if (currentUser.role === 'admin') {
                tones = { 
                    jelissa: document.getElementById('tone-jelissa').value,
                    yaneyri: document.getElementById('tone-yaneyri').value,
                    betty: document.getElementById('tone-betty').value,
                    euris: document.getElementById('tone-euris').value,
                    johan: document.getElementById('tone-johan').value
                };
            }
            db.addSong(name, version, link, lyrics, tones, currentUser.id);
        }
        document.getElementById('modal-song').classList.remove('active');
        loadLibrary(document.getElementById('lib-search').value);
    } catch(err) {
        alert(err.message);
    }
});

window.deleteSong = (id) => {
    if(confirm('¿Estás seguro de eliminar esta canción de la biblioteca? Se eliminará permanentemente.')) {
        try {
            db.removeSong(id, currentUser.id);
            loadLibrary();
        } catch(e) {
            alert(e.message);
        }
    }
};

// VISTA: HISTORIAL Y ADMIN
function loadHistory() {
    const logs = db.getLogs().reverse();
    const container = document.getElementById('logs-list');
    container.innerHTML = '';
    logs.forEach(log => {
        const u = db.getUserById(log.userId);
        const div = document.createElement('div');
        div.style.padding = '0.5rem 0';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--text-muted);">${new Date(log.timestamp).toLocaleString()} - <strong>${u?.name}</strong></div>
            <div>${log.action}: <em>${log.details}</em></div>
        `;
        container.appendChild(div);
    });
}

function loadAdmin() {
    const ulist = document.getElementById('admin-users-list');
    ulist.innerHTML = '';

    db.data.users.forEach(u => {
        const isAdmin = u.role === 'admin';
        const isPaused = u.paused === true;
        const roleLabels = {
            admin: '👑 Admin',
            integrante: '🎤 Integrante',
            sonido: '🎛️ Sonido',
            invitado: '🤝 Invitado',
            espectador: '👁️ Espectador'
        };
        const roleLabel = roleLabels[u.role] || u.role;
        const roleBadgeClass = u.role === 'admin' ? 'badge-primary' : u.role === 'integrante' ? 'badge-success' : 'badge-warning';

        const item = document.createElement('div');
        item.style.cssText = `padding: 0.75rem; background: var(--bg-main); border: 1px solid ${isPaused ? 'var(--accent)' : 'var(--border-color)'}; border-radius: var(--radius); display: flex; flex-direction: column; gap: 0.5rem; ${isPaused ? 'opacity:0.75;' : ''}`;
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <strong>${u.name}</strong>
                    <span class="badge ${roleBadgeClass}" style="font-size:0.75rem;">${roleLabel}</span>
                    ${isPaused ? `<span class="badge" style="background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b44; font-size:0.7rem;"><i data-lucide="pause-circle" style="width:11px; height:11px; vertical-align:middle;"></i> EN PAUSA</span>` : ''}
                </div>
                <div style="display:flex; gap:0.3rem; align-items:center;">
                    <span style="font-size:0.78rem; color:var(--text-muted);">PIN: <code style="background:var(--bg-card); padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--accent-color); font-weight:600;">${u.code}</code></span>
                    ${!isAdmin ? `
                        <button class="btn btn-outline" title="${isPaused ? 'Reactivar integrante' : 'Pausar integrante'}" 
                            style="padding:0.3rem 0.5rem; font-size:0.75rem; ${isPaused ? 'color:var(--success); border-color:var(--success);' : 'color:#f59e0b; border-color:#f59e0b;'}"
                            onclick="adminTogglePause(${u.id})">
                            <i data-lucide="${isPaused ? 'play-circle' : 'pause-circle'}" style="width:14px; height:14px;"></i>
                        </button>
                        <button class="btn btn-outline" title="Eliminar usuario"
                            style="padding:0.3rem 0.5rem; font-size:0.75rem; color:var(--error); border-color:var(--error);"
                            onclick="adminDeleteUser(${u.id})">
                            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                <div style="display:flex; gap:0.4rem; align-items:center;">
                    <span style="font-size:0.75rem; color:var(--text-muted); width:42px; flex-shrink:0;">PIN:</span>
                    <input type="text" id="user-pin-${u.id}" class="input-field" value="${u.code || ''}" placeholder="Nuevo PIN" maxlength="16" style="padding:0.35rem 0.5rem; font-size:0.85rem; font-family:monospace; font-weight:600; width:110px;">
                    <button class="btn btn-outline" style="padding:0.35rem 0.65rem; font-size:0.75rem; white-space:nowrap;" onclick="saveUserPin(${u.id})">
                        <i data-lucide="key" style="width:13px; height:13px; margin-right:3px;"></i> Guardar PIN
                    </button>
                </div>
                <div style="display:flex; gap:0.4rem; align-items:center;">
                    <span style="font-size:0.75rem; color:var(--text-muted); width:42px; flex-shrink:0;">Email:</span>
                    <input type="email" id="user-email-${u.id}" class="input-field" value="${u.email || ''}" placeholder="correo@..." style="padding:0.35rem 0.5rem; font-size:0.85rem; flex:1;">
                    <button class="btn btn-outline" style="padding:0.35rem 0.65rem; font-size:0.75rem; white-space:nowrap;" onclick="saveUserEmail(${u.id})">
                        <i data-lucide="mail" style="width:13px; height:13px; margin-right:3px;"></i> Guardar Correo
                    </button>
                </div>
            </div>
        `;
        ulist.appendChild(item);
    });

    const settings = db.getEmailSettings();
    document.getElementById('emailjs-service-id').value = settings.serviceId || '';
    document.getElementById('emailjs-template-id').value = settings.templateId || '';
    document.getElementById('emailjs-public-key').value = settings.publicKey || '';
    if (window.lucide) lucide.createIcons();
}

window.adminTogglePause = (userId) => {
    const user = db.getUserById(userId);
    if (!user) return;
    const nowPaused = db.toggleUserPause(userId, currentUser.id);
    const msg = nowPaused
        ? `⏸️ ${user.name} ha sido pausado. Su turno será saltado automáticamente en la rotación.`
        : `▶️ ${user.name} ha sido reactivado y volverá a la rotación.`;
    alert(msg);
    loadAdmin();
    // Refresh date picker labels
    const picker = document.getElementById('repertoire-date-picker');
    picker.innerHTML = '';
    availableSundays.forEach(date => {
        const dObj = new Date(date + 'T12:00:00');
        const display = dObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        const singer = getSingerForDate(date);
        picker.innerHTML += `<option value="${date}">${display} - Turno: ${singer}</option>`;
    });
    picker.value = currentRepertoireDate;
};

window.adminDeleteUser = (userId) => {
    const user = db.getUserById(userId);
    if (!user) return;
    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) return;
    try {
        db.removeUser(userId, currentUser.id);
        alert(`✅ Usuario "${user.name}" eliminado correctamente.`);
        loadAdmin();
    } catch(e) {
        alert(e.message);
    }
};

// Crear usuario desde admin
document.getElementById('form-create-user').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-user-name').value.trim();
    const pin = document.getElementById('new-user-pin').value.trim();
    const role = document.getElementById('new-user-role').value;
    const email = document.getElementById('new-user-email').value.trim();
    try {
        db.addUser(name, pin, role, email, currentUser.id);
        alert(`✅ Usuario "${name}" creado con rol "${role}".`);
        document.getElementById('form-create-user').reset();
        loadAdmin();
    } catch(e) {
        alert(e.message);
    }
});

window.saveUserPin = (userId) => {
    const pinInput = document.getElementById(`user-pin-${userId}`);
    const newPin = pinInput.value.trim();
    const user = db.getUserById(userId);
    if (!user) return;
    if (!newPin) { alert('El PIN no puede estar vacío.'); return; }
    if (newPin.length < 3) { alert('El PIN debe tener al menos 3 caracteres.'); return; }
    const duplicate = db.data.users.find(u => u.code === newPin && u.id !== userId);
    if (duplicate) { alert(`El PIN "${newPin}" ya está en uso por ${duplicate.name}.`); return; }
    db.updateUserPin(userId, newPin, currentUser ? currentUser.id : 1);
    if (currentUser && currentUser.id === userId) {
        currentUser.code = newPin;
        localStorage.setItem('tbbc_session', newPin);
    }
    alert(`✅ PIN actualizado para ${user.name}.`);
    loadAdmin();
};

window.saveUserEmail = (userId) => {
    const email = document.getElementById(`user-email-${userId}`).value.trim();
    const user = db.getUserById(userId);
    if (!user) return;
    db.updateUserEmail(userId, email);
    alert(`✅ Correo electrónico guardado para ${user.name}.`);
    loadAdmin();
};

document.getElementById('form-email-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceId = document.getElementById('emailjs-service-id').value.trim();
    const templateId = document.getElementById('emailjs-template-id').value.trim();
    const publicKey = document.getElementById('emailjs-public-key').value.trim();
    
    db.updateEmailSettings({ serviceId, templateId, publicKey });
    alert('Credenciales de EmailJS guardadas.');
});

document.getElementById('btn-send-emails').addEventListener('click', () => {
    sendRepertoireEmails('all', currentRepertoireDate);
});

// ============================================
// CORREOS DE RECORDATORIO DE REPERTORIO
// ============================================

function generateRepertoireEmailData(dateStr) {
    const rep = db.getRepertoireByDate(dateStr);
    const dateObj = new Date(dateStr + 'T12:00:00');
    const dateFormatted = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const assignedSinger = getSingerForDate(dateStr);
    const singerUser = db.data.users.find(u => u.name === assignedSinger);

    let songListText = '';
    if (rep.songs && rep.songs.length > 0) {
        rep.songs.forEach((s, idx) => {
            const songObj = db.getSongById(s.songId);
            const songName = songObj ? songObj.name : ('Canción #' + (idx + 1));
            const tone = songObj?.tones?.[assignedSinger.toLowerCase()] || s.tone || 'Estándar';
            songListText += `${idx + 1}. ${songName} (Tono para ${assignedSinger}: ${tone})\n`;
        });
    } else {
        songListText = '(Sin canciones asignadas aún)\n';
    }

    let chorusListText = '';
    if (rep.choruses && rep.choruses.length > 0) {
        chorusListText = '\nCoros:\n' + rep.choruses.map(c => `• ${c.name}`).join('\n');
    }

    let hymnListText = '';
    if (rep.hymns && rep.hymns.length > 0) {
        hymnListText = '\nHimnos:\n' + rep.hymns.map(h => `• ${h.name}`).join('\n');
    }

    const preview = `ASUNTO: [TBBC Alabanza] Recordatorio de Turno - ${dateFormatted}

¡Hola! 👋

Te recordamos el repertorio del Grupo de Alabanza TBBC para el ${dateFormatted}:

👤 Turno Asignado: ${assignedSinger}
📖 Texto Bíblico: ${rep.biblicalText || 'Salmo de alabanza'}

🎶 CANCIONES PROGRAMADAS:
${songListText}${chorusListText}${hymnListText}

Por favor repasa los tonos para el servicio. ¡Dios te bendiga!`;

    return {
        dateFormatted,
        assignedSinger,
        singerUser,
        rep,
        preview,
        songListText
    };
}

async function sendRepertoireEmails(recipientType, dateStr) {
    const data = generateRepertoireEmailData(dateStr);
    const settings = db.getEmailSettings();
    const statusDiv = document.getElementById('email-send-status');
    if (statusDiv) {
        statusDiv.style.color = 'var(--text-main)';
        statusDiv.innerHTML = '<i data-lucide="loader"></i> Enviando correos...';
    }

    const members = recipientType === 'assigned' && data.singerUser
        ? [data.singerUser]
        : db.data.users.filter(u => u.role === 'integrante' || u.role === 'admin');

    const emailsList = members.map(m => `${m.name} (${m.email || 'sin correo'})`).join(', ');

    if (settings.serviceId && settings.templateId && settings.publicKey && window.emailjs) {
        try {
            emailjs.init(settings.publicKey);
            for (const member of members) {
                if (!member.email) continue;
                await emailjs.send(settings.serviceId, settings.templateId, {
                    to_name: member.name,
                    to_email: member.email,
                    turn_date: data.dateFormatted,
                    assigned_singer: data.assignedSinger,
                    biblical_text: data.rep.biblicalText || 'Salmo de alabanza',
                    songs_list: data.songListText,
                    message: data.preview
                });
            }
            if (statusDiv) {
                statusDiv.style.color = 'var(--success)';
                statusDiv.innerHTML = `✅ Correos enviados con éxito vía EmailJS a: ${emailsList}`;
            } else {
                alert(`Correos enviados con éxito a: ${emailsList}`);
            }
            db.addLog(currentUser.id, 'Envió correos de repertorio', `A: ${emailsList}`);
        } catch(err) {
            console.error('EmailJS error:', err);
            if (statusDiv) {
                statusDiv.style.color = 'var(--warning)';
                statusDiv.innerHTML = `⚠️ Intento de envío (Simulación): ${emailsList}.<br><span style="font-size:0.8rem; color:var(--text-muted);">Revisa que tus llaves de EmailJS sean válidas.</span>`;
            }
        }
    } else {
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.style.color = 'var(--success)';
                statusDiv.innerHTML = `✅ Correo de recordatorio enviado a: ${emailsList}.<br><span style="font-size:0.8rem; color:var(--text-muted);">Para recibir correos en buzones reales de Gmail/Outlook, configura tu Service ID y Template ID de EmailJS en el Panel Admin.</span>`;
            } else {
                alert(`Simulación de envío de correo a: ${emailsList}`);
            }
            db.addLog(currentUser.id, 'Simuló envío de correo', `A: ${emailsList}`);
        }, 500);
    }
}

// Botones de Enviar Correo en el Repertorio
const btnSendRepEmail = document.getElementById('btn-send-repertoire-email');
if (btnSendRepEmail) {
    btnSendRepEmail.addEventListener('click', () => {
        const data = generateRepertoireEmailData(currentRepertoireDate);
        document.getElementById('email-preview-box').textContent = data.preview;
        document.getElementById('email-send-status').innerHTML = '';
        document.getElementById('modal-send-email').classList.add('active');
    });
}

document.getElementById('btn-confirm-send-email').addEventListener('click', () => {
    const recipientType = document.getElementById('email-recipients-select').value;
    sendRepertoireEmails(recipientType, currentRepertoireDate);
});

// --- COMPLETAR REPERTORIO ---
document.getElementById('btn-complete-repertoire').addEventListener('click', () => {
    if (confirm('¿Estás seguro de marcar este repertorio como Completado? Ya no se podrán agregar ni eliminar canciones, y se habilitarán las evaluaciones.')) {
        db.updateRepertoireStatus(currentRepertoireDate, 'Completado', currentUser.id);
        loadRepertoire(currentRepertoireDate);
        loadHome();
    }
});

// --- EVALUACIONES ---
window.openEvaluation = (songId, date) => {
    document.getElementById('form-evaluation').reset();
    document.getElementById('eval-song-id').value = songId;
    document.getElementById('eval-rep-date').value = date;
    
    const song = db.getSongById(songId);
    const existing = song?.evaluations?.find(e => e.date === date);
    if (existing) {
        document.getElementById('eval-rating').value = existing.rating;
        document.getElementById('eval-comment').value = existing.comment;
    }
    
    document.getElementById('modal-evaluation').classList.add('active');
};

document.getElementById('form-evaluation').addEventListener('submit', (e) => {
    e.preventDefault();
    const songId = parseInt(document.getElementById('eval-song-id').value);
    const date = document.getElementById('eval-rep-date').value;
    const rating = document.getElementById('eval-rating').value;
    const comment = document.getElementById('eval-comment').value;
    
    const song = db.getSongById(songId);
    if(song && song.evaluations) {
       const idx = song.evaluations.findIndex(ev => ev.date === date);
       if(idx >= 0) song.evaluations.splice(idx, 1);
    }
    
    db.addSongEvaluation(songId, date, rating, comment, currentUser.id);
    document.getElementById('modal-evaluation').classList.remove('active');
    loadRepertoire(currentRepertoireDate);
});

window.viewEvaluations = (songId) => {
    const song = db.getSongById(songId);
    const container = document.getElementById('eval-history-content');
    container.innerHTML = '';
    
    if (song && song.evaluations && song.evaluations.length > 0) {
        const sorted = [...song.evaluations].sort((a, b) => new Date(b.date) - new Date(a.date));
        sorted.forEach(ev => {
            const badgeClass = ev.rating === 'Excelente' || ev.rating === 'Bien' ? 'badge-success' : 'badge-warning';
            container.innerHTML += `
                <div style="background-color: var(--bg-main); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <strong>Repertorio del ${new Date(ev.date + 'T12:00:00').toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}</strong>
                        <span class="badge ${badgeClass}">${ev.rating}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.95rem;">${ev.comment}</p>
                </div>
            `;
        });
    } else {
        container.innerHTML = '<p style="color: var(--text-muted);">No hay evaluaciones previas para esta canción.</p>';
    }
    document.getElementById('modal-eval-history').classList.add('active');
};

// EXPORTACIONES
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Grupo de Alabanza TBBC - Historial", 20, 20);
    doc.setFont("helvetica", "normal");
    
    let y = 30;
    db.getLogs().reverse().slice(0, 30).forEach(log => {
        const u = db.getUserById(log.userId);
        doc.setFontSize(10);
        doc.text(`${new Date(log.timestamp).toLocaleString()} | ${u?.name} | ${log.action}: ${log.details}`, 20, y);
        y += 7;
    });
    doc.save("TBBC_Historial.pdf");
});

document.getElementById('btn-export-excel').addEventListener('click', () => {
    const ws_data = [["Fecha", "Usuario", "Acción", "Detalle"]];
    db.getLogs().reverse().forEach(log => {
        const u = db.getUserById(log.userId);
        ws_data.push([new Date(log.timestamp).toLocaleString(), u?.name, log.action, log.details]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, "TBBC_Historial.xlsx");
});

// Start
initApp();

// ============================================
// CANCIONES A APRENDER
// ============================================

document.getElementById('btn-add-to-learn')?.addEventListener('click', () => {
    if (isSpectator(currentUser)) {
        alert('Tienes permisos de espectador solamente.');
        return;
    }
    document.getElementById('form-add-to-learn').reset();

    // Poblar select de fechas ÚNICAMENTE con los turnos del usuario activo
    const dateSelect = document.getElementById('stl-date');
    if (dateSelect) {
        dateSelect.innerHTML = '';
        const turnDates = getTurnDatesForUser(currentUser);
        if (turnDates.length === 0) {
            dateSelect.innerHTML = '<option value="" disabled selected>No tienes turnos programados en las próximas semanas</option>';
        } else {
            dateSelect.innerHTML = '<option value="" disabled selected>-- Selecciona la fecha de tu turno --</option>' +
                turnDates.map(t => `<option value="${t.date}">${t.label}</option>`).join('');
        }
    }

    document.getElementById('modal-add-to-learn').classList.add('active');
    if (window.lucide) lucide.createIcons();
});

document.getElementById('form-add-to-learn')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSpectator(currentUser)) {
        alert('Tienes permisos de espectador solamente.');
        return;
    }
    const name = document.getElementById('stl-name').value.trim();
    const version = document.getElementById('stl-version').value.trim();
    const link = document.getElementById('stl-link').value.trim();
    const date = document.getElementById('stl-date').value;
    if (!name) {
        alert('El nombre de la canción es obligatorio.');
        return;
    }
    if (!version) {
        alert('La versión de la canción es obligatoria.');
        return;
    }
    if (!link) {
        alert('El enlace de la canción es obligatorio.');
        return;
    }
    if (!date) {
        alert('Debes seleccionar la fecha correspondiente a tu turno.');
        return;
    }

    // Validar que la fecha efectivamente le corresponda al integrante
    if (currentUser.role !== 'admin') {
        const assignedSinger = getSingerForDate(date);
        if (assignedSinger.toLowerCase() !== currentUser.name.toLowerCase()) {
            alert(`No puedes programar canciones para esta fecha (${date}). Ese día le corresponde a ${assignedSinger}. Solo puedes elegir las fechas de tu turno.`);
            return;
        }
    }

    try {
        db.addSongToLearn(name, version, link, date, currentUser.id);
        document.getElementById('modal-add-to-learn').classList.remove('active');
        loadSongsToLearn();
        loadRepertoire(currentRepertoireDate);
        loadHome();
        loadHistory();
        alert(`✅ Canción programada con éxito.\nSe colocó automáticamente en tu repertorio para el domingo ${date}.`);
    } catch(err) {
        alert(err.message);
    }
});

window.toggleStlCheck = (songId) => {
    try {
        const res = db.toggleSongToLearnCheck(songId, currentUser.id);
        if (res?.graduated) {
            alert(`🎉 ¡Excelente! Todos los integrantes se han aprendido "${res.songName}" (${res.songVersion || 'Versión General'}).\n\nLa canción ha sido agregada automáticamente a la Biblioteca General.`);
            loadLibrary(document.getElementById('lib-search')?.value || '');
        }
        loadSongsToLearn();
        loadHistory();
    } catch(err) {
        alert(err.message);
    }
};

window.removeStlSong = (songId) => {
    if (confirm('¿Eliminar esta canción de la lista?')) {
        try {
            db.removeSongToLearn(songId, currentUser.id);
            loadSongsToLearn();
            loadHistory();
        } catch(err) {
            alert(err.message);
        }
    }
};

function loadSongsToLearn() {
    const songs = db.getSongsToLearn();
    const container = document.getElementById('stl-list');
    container.innerHTML = '';

    // Integrantes y administradores pueden agregar canciones a aprender
    const addBtn = document.getElementById('btn-add-to-learn');
    if (currentUser.role === 'admin' || currentUser.role === 'integrante') {
        addBtn.classList.remove('hidden');
    } else {
        addBtn.classList.add('hidden');
    }

    if (songs.length === 0) {
        container.innerHTML = '<p class="stl-empty">No hay canciones pendientes por aprender.</p>';
        return;
    }

    // Usuarios que deben aprenderla (solo integrantes, el admin no aparece)
    const members = db.data.users.filter(u => u.role === 'integrante');

    songs.forEach(song => {
        const checks = song.checks || {};
        const checkedCount = members.filter(m => checks[String(m.id)]?.checked).length;
        const totalMembers = members.length;
        const progressPct = totalMembers > 0 ? Math.round((checkedCount / totalMembers) * 100) : 0;

        const myCheck = checks[String(currentUser.id)];
        const iChecked = myCheck?.checked;

        // Fecha tentativa
        let dateLabel = '';
        if (song.tentativeDate) {
            const d = new Date(song.tentativeDate.includes('T') ? song.tentativeDate : song.tentativeDate + 'T12:00:00');
            if (!isNaN(d.getTime())) {
                dateLabel = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        // Avatares de checks
        let checksHTML = '';
        members.forEach(member => {
            const mCheck = checks[String(member.id)];
            const checked = mCheck?.checked;
            const isMe = member.id === currentUser.id;
            const ts = checked && mCheck?.timestamp
                ? new Date(mCheck.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                : null;

            checksHTML += `
                <button
                    class="stl-check-avatar ${checked ? 'checked' : ''} ${isMe ? 'is-me' : ''}"
                    onclick="${isMe ? `toggleStlCheck(${song.id})` : ''}"
                    title="${member.name}${ts ? ' - aprendida el ' + ts : ''}${!isMe ? ' (solo ese usuario puede marcar)' : ''}"
                    ${!isMe ? 'style="cursor:default;"' : ''}
                >
                    <svg class="stl-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${checked
                            ? '<polyline points="20 6 9 17 4 12"></polyline>'
                            : '<circle cx="12" cy="12" r="9"></circle>'}
                    </svg>
                    ${member.name}
                </button>
            `;
        });

        const canDelete = currentUser.role === 'admin' || song.addedBy === currentUser.id;

        const item = document.createElement('div');
        item.className = 'stl-item';
        item.innerHTML = `
            <div class="stl-item-header">
                <div style="flex:1; min-width:0;">
                    <div class="stl-item-name" style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                        ${song.link
                            ? `<a href="${song.link}" target="_blank" style="color: var(--text-main); text-decoration: none;" title="Abrir enlace">${song.name} <span style="font-size:0.75rem; color:var(--primary-light);">↗</span></a>`
                            : song.name
                        }
                        <span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; font-weight:500;">
                            ${song.version || 'Versión General'}
                        </span>
                    </div>
                    ${dateLabel ? `<span class="stl-item-date"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Meta: ${dateLabel}</span>` : ''}
                </div>
                <div class="stl-actions">
                    <span style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap;">${checkedCount}/${totalMembers}</span>
                    ${canDelete ? `<button class="btn btn-outline" style="border:none; color:var(--error); padding:0.35rem;" onclick="removeStlSong(${song.id})" title="Eliminar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg></button>` : ''}
                </div>
            </div>
            <div class="stl-progress-bar">
                <div class="stl-progress-fill" style="width: ${progressPct}%;"></div>
            </div>
            <div class="stl-checks">${checksHTML}</div>
        `;
        container.appendChild(item);
    });
    if (window.lucide) lucide.createIcons();
}

// --- VISTA Y LÓGICA DE EVENTOS PRÓXIMOS ---
function loadEvents() {
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';

    const events = db.getEvents();
    if (events.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 2.5rem 1rem;">
                <i data-lucide="calendar-x" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:1rem; display:block; margin-left:auto; margin-right:auto;"></i>
                <h3 style="margin-bottom:0.5rem;">No hay eventos próximos</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">Crea un nuevo evento especial (vigilias, aniversarios, conciertos) para registrar su link y hacer seguimiento.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Integrantes que pueden marcar (el admin no aparece)
    const members = db.data.users.filter(u => u.role === 'integrante');

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'margin-bottom: 1rem; padding: 1.25rem;';

        const eventDateObj = new Date(event.date + 'T12:00:00');
        const formattedDate = eventDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const canDelete = currentUser.role === 'admin' || event.createdBy === currentUser.id;

        const checks = event.checks || {};
        const checkedCount = members.filter(m => checks[String(m.id)]?.checked).length;
        const totalMembers = members.length;
        const progressPct = totalMembers > 0 ? Math.round((checkedCount / totalMembers) * 100) : 0;

        let checksHTML = '';
        members.forEach(member => {
            const mCheck = checks[String(member.id)];
            const checked = mCheck?.checked;
            const isMe = member.id === currentUser.id;
            const ts = checked && mCheck?.timestamp
                ? new Date(mCheck.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                : null;

            checksHTML += `
                <button
                    class="stl-check-avatar ${checked ? 'checked' : ''} ${isMe ? 'is-me' : ''}"
                    onclick="${isMe ? `toggleEventCheck(${event.id})` : ''}"
                    title="${member.name}${ts ? ' - listo el ' + ts : ''}${!isMe ? ' (solo ese usuario puede marcar)' : ''}"
                    ${!isMe ? 'style="cursor:default;"' : ''}
                >
                    <svg class="stl-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${checked
                            ? '<polyline points="20 6 9 17 4 12"></polyline>'
                            : '<circle cx="12" cy="12" r="9"></circle>'}
                    </svg>
                    ${member.name}
                </button>
            `;
        });

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem;">
                        <h3 style="margin:0; font-size:1.2rem; color:var(--primary);">${event.title}</h3>
                        <span class="badge badge-primary" style="font-size:0.75rem;">📅 ${formattedDate}</span>
                    </div>
                    ${event.description ? `<p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:0.75rem; font-style:italic;">📌 ${event.description}</p>` : '<div style="margin-bottom:0.75rem;"></div>'}
                    ${event.playlistLink
                        ? `<a href="${event.playlistLink}" target="_blank" rel="noopener noreferrer"
                                class="btn btn-primary"
                                style="display:inline-flex; align-items:center; gap:0.5rem; font-size:0.9rem; padding:0.55rem 1.1rem; text-decoration:none;">
                                <i data-lucide="external-link" style="width:16px; height:16px;"></i>
                                Ver Playlist / Repertorio
                            </a>`
                        : `<span style="font-size:0.88rem; color:var(--text-muted); font-style:italic;">Sin link asignado</span>`
                    }
                </div>
                <div style="display:flex; gap:0.5rem; align-items:flex-start; flex-shrink:0;">
                    ${canDelete ? `
                        <button class="btn btn-outline btn-sm" style="color:var(--error); border-color:var(--error);" title="Eliminar Evento" onclick="deleteEvent(${event.id})">
                            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Sección de quién está listo / aprendida para este evento -->
            <div style="margin-top: 1.15rem; padding-top: 0.85rem; border-top: 1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem; flex-wrap:wrap; gap:0.5rem;">
                    <span style="font-size:0.82rem; font-weight:600; color:var(--text-muted); display:inline-flex; align-items:center; gap:5px;">
                        <i data-lucide="check-circle-2" style="width:14px; height:14px; color:var(--success);"></i>
                        ¿Quién ya se la aprendió? (${checkedCount}/${totalMembers} listos)
                    </span>
                    <span style="font-size:0.75rem; font-weight:600; color:var(--primary-light);">${progressPct}% completado</span>
                </div>
                <div class="stl-progress-bar" style="margin-bottom:0.65rem;">
                    <div class="stl-progress-fill" style="width: ${progressPct}%;"></div>
                </div>
                <div class="stl-checks-container">
                    ${checksHTML}
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// Toggle marcar como listo/aprendido para evento
window.toggleEventCheck = (eventId) => {
    try {
        db.toggleEventCheck(eventId, currentUser.id);
        loadEvents();
    } catch(err) {
        alert(err.message);
    }
};

// Abrir modal crear evento
document.getElementById('btn-create-event')?.addEventListener('click', () => {
    if (isSpectator(currentUser)) {
        alert('Tienes permisos de espectador solamente.');
        return;
    }
    document.getElementById('form-create-event').reset();
    document.getElementById('modal-create-event').classList.add('active');
});

// Guardar evento
document.getElementById('form-create-event')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const playlistLink = document.getElementById('event-playlist-link').value.trim();
    const desc = document.getElementById('event-description').value.trim();
    if (!playlistLink) {
        alert('El link de la playlist es obligatorio.');
        return;
    }
    try {
        db.addEvent(title, date, playlistLink, desc, currentUser.id);
        document.getElementById('modal-create-event').classList.remove('active');
        loadEvents();
    } catch(err) {
        alert(err.message);
    }
});

// Eliminar evento
window.deleteEvent = (eventId) => {
    const event = db.getEventById(eventId);
    if (!event) return;
    if (confirm(`¿Estás seguro de eliminar el evento "${event.title}"?`)) {
        db.removeEvent(eventId, currentUser.id);
        loadEvents();
    }
};


