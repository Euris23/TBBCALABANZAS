// Base de Datos simulada con LocalStorage
const DB_KEY = 'tbbc_alabanza_db';

const initialData = {
    users: [
        { id: 1, name: 'Admin', role: 'admin', code: 'admin123', email: 'admin@tbbc.org' },
        { id: 2, name: 'Betty', role: 'integrante', code: '7243', email: 'betty@tbbc.org' },
        { id: 3, name: 'Euris', role: 'integrante', code: '3861', email: 'euris@tbbc.org' },
        { id: 4, name: 'Johan', role: 'integrante', code: '5094', email: 'johan@tbbc.org' },
        { id: 5, name: 'Jelissa', role: 'integrante', code: '2718', email: 'jelissa@tbbc.org' },
        { id: 6, name: 'Yaneyri', role: 'integrante', code: '9436', email: 'yaneyri@tbbc.org' },
        { id: 7, name: 'Gerald', role: 'integrante', code: '1652', email: 'gerald@tbbc.org' },
        { id: 8, name: 'Sonido', role: 'espectador', code: '8375', email: 'sonido@tbbc.org' }
    ],
    songs: [
        { 
            id: 1, 
            name: 'Dios Poderoso', 
            version: 'Miel San Marcos',
            link: 'https://youtube.com/watch?v=demo', 
            lyrics: 'Dios poderoso, reina por siempre...', 
            tones: { gerald: 'G', jelissa: 'A', yaneyri: 'F' },
            evaluations: []
        }
    ],
    repertoires: [],
    favorites: [],
    songsToLearn: [
        {
            id: 1,
            name: 'Cantaré de tu Amor Por Siempre',
            version: 'Delirious / Versión General',
            link: 'https://youtube.com/watch?v=demo',
            tentativeDate: '2026-11-15',
            addedBy: 1,
            createdAt: '2026-10-10T09:00:00.000Z',
            checks: {
                2: { checked: true, timestamp: '2026-10-10T09:05:00.000Z' }
            }
        }
    ],
    emailSettings: {
        serviceId: '',
        templateId: '',
        publicKey: '',
        autoSendOnPublish: true
    },
    userFolders: [],
    logs: []
};

class Database {
    constructor() {
        this.data = this.loadData();
        this.initFirebaseSync();
    }

    initFirebaseSync() {
        if (typeof window !== 'undefined' && window.firestoreDb) {
            const docRef = window.firestoreDb.collection('appData').doc('tbbc_db');
            
            // Suscribirse a cambios en tiempo real
            docRef.onSnapshot(doc => {
                if (doc.exists) {
                    const cloudData = doc.data();
                    if (cloudData && cloudData.users) {
                        this.data = cloudData;
                        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
                        // Re-render app view if app is initialized
                        if (typeof renderApp === 'function') {
                            renderApp();
                        }
                    }
                } else {
                    // Si no existe en Firestore, guardar datos iniciales
                    this.saveData();
                }
            }, err => {
                console.warn("Error en sincronización en tiempo real Firebase:", err);
            });
        }
    }

    loadData() {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            // Add Sonido if not exists
            if (!parsed.users.find(u => u.name === 'Sonido')) {
                parsed.users.push({ id: 8, name: 'Sonido', role: 'sonido', code: '8375', email: 'sonido@tbbc.org', paused: false });
            }
            if (!parsed.users.find(u => u.name === 'Invitado')) {
                parsed.users.push({ id: 9, name: 'Invitado', role: 'invitado', code: '1010', email: 'invitado@tbbc.org', paused: false });
            }
            // Update role for existing Sonido
            const sonidoUser = parsed.users.find(u => u.name === 'Sonido');
            if (sonidoUser && sonidoUser.role === 'espectador') {
                sonidoUser.role = 'sonido';
            }
            // Ensure email property on all users
            parsed.users.forEach(u => {
                if (!u.email) {
                    u.email = `${u.name.toLowerCase()}@tbbc.org`;
                }
            });
            // Migrate: ensure songsToLearn exists
            if (!parsed.songsToLearn) parsed.songsToLearn = [];
            // Migrate: ensure events exists
            if (!parsed.events) {
                parsed.events = [
                    {
                        id: 1,
                        title: 'Vigilia Especial de Alabanza',
                        date: '2026-10-31',
                        description: 'Vigilia de fin de mes de 8:00 PM a 12:00 AM en el Templo Principal',
                        playlistLink: '',
                        createdBy: 1,
                        createdAt: '2026-10-10T10:00:00.000Z',
                        songs: []
                    }
                ];
            }
            // Migrate: ensure playlistLink and checks exist on all events
            if (parsed.events) {
                parsed.events.forEach(ev => {
                    if (ev.playlistLink === undefined) ev.playlistLink = '';
                    if (!ev.checks) ev.checks = {};
                });
            }
            // Migrate: ensure emailSettings exists
            if (!parsed.emailSettings) {
                parsed.emailSettings = {
                    serviceId: '',
                    templateId: '',
                    publicKey: '',
                    autoSendOnPublish: true
                };
            }
            // Migrate: ensure version exists on all songs
            if (parsed.songs) {
                parsed.songs.forEach(s => {
                    if (!s.version) {
                        s.version = s.name === 'Dios Poderoso' ? 'Miel San Marcos' : 'Versión General';
                    }
                });
            }
            // Migrate: ensure paused property exists on all users
            parsed.users.forEach(u => {
                if (u.paused === undefined) u.paused = false;
            });
            // Migrate: ensure userFolders exists
            if (!parsed.userFolders) {
                parsed.userFolders = [];
            }
            // Migrate: ensure version exists on songsToLearn
            if (parsed.songsToLearn) {
                parsed.songsToLearn.forEach(s => {
                    if (!s.version) s.version = 'Versión General';
                });
            }
            localStorage.setItem(DB_KEY, JSON.stringify(parsed));
            return parsed;
        } else {
            // Modify initial data admin code just in case
            initialData.users.find(u => u.role === 'admin').code = '2323';
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            return initialData;
        }
    }

    saveData() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
        if (typeof window !== 'undefined' && window.firestoreDb) {
            window.firestoreDb.collection('appData').doc('tbbc_db').set(this.data)
                .catch(err => console.error("Error al guardar en Firebase:", err));
        }
    }

    // --- Users ---
    getUserByCode(code) {
        return this.data.users.find(u => u.code === code);
    }
    getUserById(id) {
        return this.data.users.find(u => u.id === id);
    }
    getSingersOrder() {
        // Base static order of singers in rotation
        return ['Jelissa', 'Yaneyri', 'Betty', 'Euris', 'Johan'];
    }
    getActiveSingersOrder() {
        // Active singers = integrante + not paused
        return this.getSingersOrder().filter(name => {
            const u = this.data.users.find(u => u.name === name);
            return u && !u.paused;
        });
    }
    addUser(name, code, role, email, adminId) {
        if (!name || !code) throw new Error('Nombre y PIN son obligatorios.');
        if (this.data.users.find(u => u.name.toLowerCase() === name.toLowerCase())) {
            throw new Error(`Ya existe un usuario con el nombre "${name}".`);
        }
        if (this.data.users.find(u => u.code === code)) {
            throw new Error(`El PIN "${code}" ya está en uso por otro usuario.`);
        }
        const validRoles = ['admin', 'integrante', 'espectador', 'sonido', 'invitado'];
        const userRole = validRoles.includes(role) ? role : 'espectador';
        const newUser = {
            id: Date.now(),
            name: name.trim(),
            role: userRole,
            code: code.trim(),
            email: email ? email.trim() : `${name.trim().toLowerCase()}@tbbc.org`,
            paused: false
        };
        this.data.users.push(newUser);
        this.addLog(adminId, 'Creó usuario', `${name} (${userRole})`);
        this.saveData();
        return newUser;
    }
    removeUser(userId, adminId) {
        const user = this.getUserById(userId);
        if (!user) throw new Error('Usuario no encontrado.');
        if (user.role === 'admin') throw new Error('No se puede eliminar al administrador.');
        this.data.users = this.data.users.filter(u => u.id !== userId);
        this.addLog(adminId, 'Eliminó usuario', user.name);
        this.saveData();
    }
    toggleUserPause(userId, adminId) {
        const user = this.getUserById(userId);
        if (!user) throw new Error('Usuario no encontrado.');
        if (user.role === 'admin') throw new Error('No se puede pausar al administrador.');
        user.paused = !user.paused;
        this.addLog(adminId, user.paused ? 'Pausó integrante' : 'Reactivó integrante', user.name);
        this.saveData();
        return user.paused;
    }
    updateUserPin(targetUserId, newPin, adminId) {
        if (!newPin || newPin.trim().length < 3) {
            throw new Error('El PIN debe tener al menos 3 caracteres.');
        }
        const trimmed = newPin.trim();
        const duplicate = this.data.users.find(u => u.id !== targetUserId && u.code === trimmed);
        if (duplicate) {
            throw new Error(`El PIN ya está siendo usado por ${duplicate.name}.`);
        }
        const user = this.getUserById(targetUserId);
        if (!user) throw new Error('Usuario no encontrado.');
        user.code = trimmed;
        this.addLog(adminId, 'Cambió PIN de usuario', user.name);
        this.saveData();
    }

    // --- Songs ---
    getSongs() {
        return this.data.songs;
    }
    getSongById(id) {
        return this.data.songs.find(s => s.id === id);
    }
    searchSongs(query) {
        if (!query) return this.data.songs;
        const lower = query.toLowerCase();
        return this.data.songs.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            (s.version && s.version.toLowerCase().includes(lower))
        );
    }
    addSong(name, version = '', link = '', lyrics = '', tones = { jelissa: '', yaneyri: '', betty: '', euris: '', johan: '' }, userId = 1) {
        if (!name || !name.trim()) throw new Error('El nombre de la canción es obligatorio.');
        if (!link || !link.trim()) throw new Error('El enlace de la canción (link de YouTube/Spotify) es obligatorio.');
        const v = (version || '').trim() || 'Versión General';
        if (this.data.songs.some(s => s.name.toLowerCase() === name.trim().toLowerCase() && (s.version || '').toLowerCase() === v.toLowerCase())) {
            throw new Error(`La canción "${name}" (${v}) ya existe en la biblioteca.`);
        }
        const newSong = { id: Date.now(), name: name.trim(), version: v, link: link.trim(), lyrics: lyrics ? lyrics.trim() : '', tones, evaluations: [] };
        this.data.songs.push(newSong);
        this.addLog(userId, 'Agregó canción a biblioteca', `${name} (${v})`);
        this.saveData();
        return newSong;
    }
    
    addSongEvaluation(songId, date, rating, comment, userId) {
        const song = this.getSongById(songId);
        if (song) {
            if (!song.evaluations) song.evaluations = [];
            song.evaluations.push({ date, rating, comment, timestamp: Date.now() });
            this.addLog(userId, 'Evaluó canción', song.name);
            this.saveData();
        }
    }
    updateSongTones(songId, tones, userId) {
        const song = this.getSongById(songId);
        if (song) {
            song.tones = { ...song.tones, ...tones };
            this.addLog(userId, 'Actualizó tonos', song.name);
            this.saveData();
        }
    }
    removeSong(songId, userId) {
        if (this.getUserById(userId).role !== 'admin') {
            throw new Error("Solo el administrador puede eliminar canciones de la biblioteca.");
        }
        const index = this.data.songs.findIndex(s => s.id === songId);
        if (index >= 0) {
            const songName = this.data.songs[index].name;
            this.data.songs.splice(index, 1);
            // También eliminar de favoritas
            this.data.favorites = this.data.favorites.filter(f => f.songId !== songId);
            this.addLog(userId, 'Eliminó canción de la biblioteca', songName);
            this.saveData();
        }
    }

    // --- Favorites ---
    toggleFavorite(userId, songId) {
        const exists = this.data.favorites.findIndex(f => f.userId === userId && f.songId === songId);
        if (exists >= 0) {
            this.data.favorites.splice(exists, 1);
        } else {
            this.data.favorites.push({ userId, songId });
        }
        this.saveData();
    }
    getUserFavorites(userId) {
        const favIds = this.data.favorites.filter(f => f.userId === userId).map(f => f.songId);
        return this.data.songs.filter(s => favIds.includes(s.id));
    }

    // --- User Folders (Carpetas personales por usuario/integrante) ---
    getUserFolders(userId) {
        if (!this.data.userFolders) this.data.userFolders = [];
        return this.data.userFolders.filter(f => f.userId === userId);
    }
    getUserFolderById(folderId) {
        if (!this.data.userFolders) this.data.userFolders = [];
        return this.data.userFolders.find(f => f.id === folderId);
    }
    createUserFolder(userId, name) {
        if (!name || !name.trim()) throw new Error('El nombre de la carpeta es obligatorio.');
        const trimmed = name.trim();
        const userFolders = this.getUserFolders(userId);
        if (userFolders.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
            throw new Error(`Ya tienes una carpeta llamada "${trimmed}".`);
        }
        const newFolder = {
            id: Date.now(),
            userId,
            name: trimmed,
            songIds: []
        };
        if (!this.data.userFolders) this.data.userFolders = [];
        this.data.userFolders.push(newFolder);
        this.saveData();
        return newFolder;
    }
    renameUserFolder(userId, folderId, newName) {
        if (!newName || !newName.trim()) throw new Error('El nuevo nombre es obligatorio.');
        const trimmed = newName.trim();
        const folder = this.getUserFolderById(folderId);
        if (!folder || folder.userId !== userId) throw new Error('Carpeta no encontrada o sin permiso.');
        const userFolders = this.getUserFolders(userId);
        if (userFolders.some(f => f.id !== folderId && f.name.toLowerCase() === trimmed.toLowerCase())) {
            throw new Error(`Ya tienes una carpeta llamada "${trimmed}".`);
        }
        folder.name = trimmed;
        this.saveData();
        return folder;
    }
    deleteUserFolder(userId, folderId) {
        if (!this.data.userFolders) return;
        const idx = this.data.userFolders.findIndex(f => f.id === folderId && f.userId === userId);
        if (idx >= 0) {
            this.data.userFolders.splice(idx, 1);
            this.saveData();
        }
    }
    toggleSongInUserFolder(userId, folderId, songId) {
        const folder = this.getUserFolderById(folderId);
        if (!folder || folder.userId !== userId) throw new Error('Carpeta no encontrada o sin permiso.');
        if (!folder.songIds) folder.songIds = [];
        const songIdx = folder.songIds.indexOf(songId);
        if (songIdx >= 0) {
            folder.songIds.splice(songIdx, 1);
        } else {
            folder.songIds.push(songId);
        }
        this.saveData();
        return folder.songIds.includes(songId);
    }
    getSongUserFolders(userId, songId) {
        return this.getUserFolders(userId).filter(f => f.songIds && f.songIds.includes(songId));
    }

    // --- Repertoires ---
    getRepertoires() {
        return this.data.repertoires;
    }
    getRepertoireByDate(date) { // date format: YYYY-MM-DD
        let rep = this.data.repertoires.find(r => r.date === date);
        if (!rep) {
            rep = { id: Date.now(), date, status: 'En preparación', songs: [], choruses: [], hymns: [] };
            this.data.repertoires.push(rep);
            this.saveData();
        }
        return rep;
    }
    updateRepertoireStatus(date, status, userId) {
        const rep = this.getRepertoireByDate(date);
        rep.status = status;
        this.addLog(userId, `Marcó repertorio como ${status}`, date);
        this.saveData();
    }
    addRepertoireItem(date, type, itemData, userId) {
        if ((type === 'choruses' || type === 'hymns') && (!itemData.link || !itemData.link.trim())) {
            throw new Error('El enlace es obligatorio.');
        }
        const rep = this.getRepertoireByDate(date);
        const newItem = { ...itemData, id: Date.now(), timestamp: Date.now(), addedBy: userId };
        
        if (type === 'songs') rep.songs.push(newItem);
        else if (type === 'choruses') rep.choruses.push(newItem);
        else if (type === 'hymns') rep.hymns.push(newItem);
        
        const itemName = itemData.songId ? this.getSongById(itemData.songId).name : itemData.name;
        this.addLog(userId, `Agregó ${type === 'songs' ? 'canción' : type === 'choruses' ? 'coro' : 'himno'} al repertorio`, itemName);
        this.saveData();
        return newItem;
    }
    removeRepertoireItem(date, type, itemId, userId) {
        const rep = this.getRepertoireByDate(date);
        let list = [];
        if (type === 'songs') list = rep.songs;
        else if (type === 'choruses') list = rep.choruses;
        else if (type === 'hymns') list = rep.hymns;
        
        const index = list.findIndex(i => i.id === itemId);
        if (index >= 0) {
            const item = list[index];
            if (this.getUserById(userId).role !== 'admin') {
                if (item.addedBy !== userId) {
                    throw new Error("No tienes permiso para eliminar el elemento que añadió otra persona.");
                }
                const hoursPassed = (Date.now() - (item.timestamp || item.id)) / (1000 * 60 * 60);
                if (hoursPassed > 24) {
                    throw new Error("Han pasado más de 24 horas. Ya no puedes eliminar esta canción/coro.");
                }
            }
            list.splice(index, 1);
            this.addLog(userId, `Eliminó elemento del repertorio`, `${date}`);
            this.saveData();
        }
    }

    // --- Songs To Learn ---
    getSongsToLearn() {
        return this.data.songsToLearn || [];
    }
    addSongToLearn(name, version, link, tentativeDate, userId) {
        if (!name || !name.trim()) throw new Error('El nombre de la canción es obligatorio.');
        if (!version || !version.trim()) throw new Error('La versión o cantante de la canción es obligatoria.');
        if (!link || !link.trim()) throw new Error('El enlace de la canción es obligatorio.');
        if (!tentativeDate) throw new Error('Debes seleccionar la fecha correspondiente a tu turno.');
        if (!this.data.songsToLearn) this.data.songsToLearn = [];
        const v = version.trim();
        const newEntry = {
            id: Date.now(),
            name: name.trim(),
            version: v,
            link: link.trim(),
            tentativeDate: tentativeDate,
            addedBy: userId,
            createdAt: new Date().toISOString(),
            checks: {}
        };
        this.data.songsToLearn.push(newEntry);
        this.addLog(userId, 'Agregó canción a aprender', `${name} (${v})`);

        // Colocar automáticamente en el repertorio para ese día
        const rep = this.getRepertoireByDate(tentativeDate);
        if (!rep.songs) rep.songs = [];
        const alreadyInRep = rep.songs.some(s => 
            s.name?.toLowerCase() === name.trim().toLowerCase() &&
            (s.version || '').toLowerCase() === v.toLowerCase()
        );

        if (!alreadyInRep) {
            const repSongItem = {
                id: Date.now() + 1,
                name: name.trim(),
                version: v,
                link: link.trim(),
                songId: null,
                songToLearnId: newEntry.id,
                addedBy: userId,
                timestamp: Date.now()
            };
            rep.songs.push(repSongItem);
            this.addLog(userId, 'Agregó canción al repertorio (automático)', `${name} (${v}) -> ${tentativeDate}`);
        }

        this.saveData();
        return newEntry;
    }
    removeSongToLearn(id, userId) {
        const user = this.getUserById(userId);
        const song = (this.data.songsToLearn || []).find(s => s.id === id);
        if (!song) return;
        if (user.role !== 'admin' && song.addedBy !== userId) {
            throw new Error('Solo el administrador o quien agregó la canción puede eliminarla.');
        }
        const idx = this.data.songsToLearn.findIndex(s => s.id === id);
        if (idx >= 0) {
            const name = this.data.songsToLearn[idx].name;
            const date = this.data.songsToLearn[idx].tentativeDate;
            this.data.songsToLearn.splice(idx, 1);

            // También quitar del repertorio de esa fecha si aún no fue completado
            if (date) {
                const rep = this.data.repertoires.find(r => r.date === date);
                if (rep && rep.songs && rep.status !== 'Completado') {
                    const repIdx = rep.songs.findIndex(s => s.songToLearnId === id);
                    if (repIdx >= 0) {
                        rep.songs.splice(repIdx, 1);
                    }
                }
            }

            this.addLog(userId, 'Eliminó canción a aprender', name);
            this.saveData();
        }
    }
    toggleSongToLearnCheck(songId, userId) {
        const user = this.getUserById(userId);
        if (user && user.role === 'admin') {
            throw new Error('El administrador no marca canciones como aprendidas.');
        }
        if (!this.data.songsToLearn) this.data.songsToLearn = [];
        const song = this.data.songsToLearn.find(s => s.id === songId);
        if (!song) return null;
        if (!song.checks) song.checks = {};
        const key = String(userId);
        if (song.checks[key] && song.checks[key].checked) {
            // Uncheck
            song.checks[key] = { checked: false, timestamp: null };
        } else {
            // Check with timestamp
            song.checks[key] = { checked: true, timestamp: new Date().toISOString() };
        }

        // Verificar si TODOS los integrantes activos ya se la saben
        const integrantes = this.data.users.filter(u => u.role === 'integrante');
        const allChecked = integrantes.length > 0 && integrantes.every(m => song.checks[String(m.id)]?.checked);

        let graduated = false;
        const songName = song.name;
        const songVersion = song.version || 'Versión General';

        if (allChecked) {
            // Pasar automáticamente a la Biblioteca
            const songLink = song.link;
            const existingInLib = this.data.songs.find(s => 
                s.name.toLowerCase() === songName.toLowerCase() && 
                (s.version || '').toLowerCase() === songVersion.toLowerCase()
            );

            let libSongId = existingInLib ? existingInLib.id : null;
            if (!existingInLib) {
                const newLibSong = {
                    id: Date.now(),
                    name: songName,
                    version: songVersion,
                    link: songLink,
                    lyrics: '',
                    tones: { jelissa: '', yaneyri: '', betty: '', euris: '', johan: '' },
                    evaluations: []
                };
                this.data.songs.push(newLibSong);
                libSongId = newLibSong.id;
            }

            // Enlazar songId en repertorios
            if (this.data.repertoires) {
                this.data.repertoires.forEach(rep => {
                    if (rep.songs) {
                        rep.songs.forEach(s => {
                            if (s.songToLearnId === songId || (s.name?.toLowerCase() === songName.toLowerCase() && (s.version || '').toLowerCase() === songVersion.toLowerCase())) {
                                s.songId = libSongId;
                            }
                        });
                    }
                });
            }

            // Remover de canciones a aprender
            const idx = this.data.songsToLearn.findIndex(s => s.id === songId);
            if (idx >= 0) {
                this.data.songsToLearn.splice(idx, 1);
            }

            this.addLog(userId, 'Canción aprendida por todos -> Pasó a Biblioteca', `${songName} (${songVersion})`);
            graduated = true;
        }

        this.saveData();
        return { check: song.checks ? song.checks[key] : null, graduated, songName, songVersion };
    }
    updateSongToLearnDate(songId, tentativeDate, userId) {
        if (this.getUserById(userId).role !== 'admin') {
            throw new Error('Solo el administrador puede cambiar la fecha tentativa.');
        }
        const song = this.data.songsToLearn.find(s => s.id === songId);
        if (song) {
            song.tentativeDate = tentativeDate;
            this.saveData();
        }
    }

    // --- Eventos Próximos ---
    getEvents() {
        if (!this.data.events) this.data.events = [];
        return this.data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    getEventById(id) {
        if (!this.data.events) return null;
        return this.data.events.find(e => e.id === id);
    }
    addEvent(title, date, playlistLink, description, userId) {
        if (!title || !date) throw new Error('El título y la fecha son obligatorios.');
        if (!playlistLink || !playlistLink.trim()) throw new Error('El link de la playlist es obligatorio.');
        if (!this.data.events) this.data.events = [];
        const newEvent = {
            id: Date.now(),
            title: title.trim(),
            date,
            playlistLink: playlistLink.trim(),
            description: description ? description.trim() : '',
            createdBy: userId,
            createdAt: new Date().toISOString(),
            checks: {}
        };
        this.data.events.push(newEvent);
        this.addLog(userId, 'Creó evento próximo', title);
        this.saveData();
        return newEvent;
    }
    removeEvent(eventId, userId) {
        if (!this.data.events) return;
        const idx = this.data.events.findIndex(e => e.id === eventId);
        if (idx >= 0) {
            const title = this.data.events[idx].title;
            this.data.events.splice(idx, 1);
            this.addLog(userId, 'Eliminó evento próximo', title);
            this.saveData();
        }
    }
    toggleEventCheck(eventId, userId) {
        const user = this.getUserById(userId);
        if (user && user.role === 'admin') {
            throw new Error('El administrador no marca eventos como listos/aprendidos.');
        }
        const event = this.getEventById(eventId);
        if (!event) return;
        if (!event.checks) event.checks = {};
        const key = String(userId);
        if (event.checks[key] && event.checks[key].checked) {
            event.checks[key] = { checked: false, timestamp: null };
        } else {
            event.checks[key] = { checked: true, timestamp: new Date().toISOString() };
        }
        this.saveData();
        return event.checks[key];
    }
    addSongToEvent(eventId, name, version, link, userId, songId = null) {
        const event = this.getEventById(eventId);
        if (!event) throw new Error('Evento no encontrado.');
        if (!name || !name.trim()) throw new Error('El nombre de la canción es obligatorio.');
        if (!link || !link.trim()) throw new Error('El enlace de la canción (link de YouTube/Spotify) es obligatorio.');
        if (!event.songs) event.songs = [];
        const newSong = {
            id: Date.now(),
            songId: songId || null,
            name: name.trim(),
            version: version ? version.trim() : 'Versión General',
            link: link.trim(),
            addedBy: userId,
            checks: {}
        };
        event.songs.push(newSong);
        this.addLog(userId, 'Agregó canción a evento', `${name} -> ${event.title}`);
        this.saveData();
        return newSong;
    }
    removeSongFromEvent(eventId, songInEventId, userId) {
        const event = this.getEventById(eventId);
        if (!event || !event.songs) return;
        const idx = event.songs.findIndex(s => s.id === songInEventId);
        if (idx >= 0) {
            const songName = event.songs[idx].name;
            event.songs.splice(idx, 1);
            this.addLog(userId, 'Eliminó canción de evento', `${songName} -> ${event.title}`);
            this.saveData();
        }
    }
    toggleEventSongCheck(eventId, songInEventId, userId) {
        const event = this.getEventById(eventId);
        if (!event || !event.songs) return;
        const song = event.songs.find(s => s.id === songInEventId);
        if (!song) return;
        if (!song.checks) song.checks = {};
        const key = String(userId);
        if (song.checks[key] && song.checks[key].checked) {
            song.checks[key] = { checked: false, timestamp: null };
        } else {
            song.checks[key] = { checked: true, timestamp: new Date().toISOString() };
        }
        this.saveData();
        return song.checks[key];
    }

    // --- User PIN, Email & Settings ---
    updateUserPin(userId, pin, adminId = 1) {
        const user = this.getUserById(userId);
        if (user) {
            user.code = pin;
            this.addLog(adminId, 'Cambió PIN de usuario', user.name);
            this.saveData();
            return true;
        }
        return false;
    }
    updateUserEmail(userId, email) {
        const user = this.getUserById(userId);
        if (user) {
            user.email = email;
            this.saveData();
        }
    }
    getEmailSettings() {
        return this.data.emailSettings || { serviceId: '', templateId: '', publicKey: '', autoSendOnPublish: true };
    }
    updateEmailSettings(settings) {
        this.data.emailSettings = { ...this.getEmailSettings(), ...settings };
        this.saveData();
    }

    // --- Logs ---
    addLog(userId, action, details) {
        this.data.logs.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            userId,
            action,
            details
        });
    }
    getLogs() {
        return this.data.logs;
    }
}

const db = new Database();
