// =============================================
//  PLAYLIST YOUTUBE — playlist.js
// =============================================

/** Extrae el ID de video de cualquier URL de YouTube */
function extractYouTubeId(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        const match = u.pathname.match(/\/(embed|v|shorts)\/([\w-]{11})/);
        if (match) return match[2];
    } catch (_) {}
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
}

/** Construye la URL de la lista de reproducción continua en YouTube para una fecha dada */
function buildYouTubePlaylistUrl(date) {
    const rep = db.getRepertoireByDate(date);
    if (!rep) return null;

    const videoIds = [];

    // Canciones
    if (rep.songs) {
        rep.songs.forEach(function(item) {
            const song = item.songId ? db.getSongById(item.songId) : item;
            if (song && song.link) {
                const id = extractYouTubeId(song.link);
                if (id) videoIds.push(id);
            }
        });
    }

    // Coros
    if (rep.choruses) {
        rep.choruses.forEach(function(item) {
            if (item.link) {
                const id = extractYouTubeId(item.link);
                if (id) videoIds.push(id);
            }
        });
    }

    // Himnos
    if (rep.hymns) {
        rep.hymns.forEach(function(item) {
            if (item.link) {
                const id = extractYouTubeId(item.link);
                if (id) videoIds.push(id);
            }
        });
    }

    if (videoIds.length === 0) return null;
    return 'https://www.youtube.com/watch_videos?video_ids=' + videoIds.join(',');
}

/** Maneja el clic en los botones de Playlist en YouTube */
function handleYouTubePlaylistClick(e) {
    const url = buildYouTubePlaylistUrl(currentRepertoireDate);
    if (url) {
        this.href = url;
    } else {
        e.preventDefault();
        alert('No hay canciones con enlaces válidos de YouTube en este repertorio.');
    }
}

// Inicialización de eventos para botones de Playlist
document.addEventListener('DOMContentLoaded', function() {
    const directYtBtn = document.getElementById('btn-open-yt-direct');
    if (directYtBtn) {
        directYtBtn.addEventListener('click', handleYouTubePlaylistClick);
    }

    const homeYtBtn = document.getElementById('btn-home-playlist');
    if (homeYtBtn) {
        homeYtBtn.addEventListener('click', handleYouTubePlaylistClick);
    }
});
