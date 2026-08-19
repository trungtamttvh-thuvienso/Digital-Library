// ============================================================
// CẤU HÌNH API URL LINH HOẠT (Có thể chuyển đổi bằng UI)
// ============================================================

// 1. URL của Backend trên Render (thay bằng URL thật của cậu)
const RENDER_API_URL = 'https://digital-library-967p.onrender.com';

// 2. URL của Backend chạy Local Python
const LOCAL_API_URL = 'http://localhost:5000';

// 3. Hàm lấy API URL hiện tại (dựa vào Local Storage)
function getApiBaseUrl() {
    const mode = localStorage.getItem('api_mode') || 'local'; // Mặc định là local
    console.log(`🔧 Chế độ hiện tại: ${mode}`);
    return mode === 'render' ? RENDER_API_URL : LOCAL_API_URL;
}

// 4. Hàm chuyển đổi chế độ (Gọi từ nút bấm trên giao diện)
function switchApiMode(mode) {
    localStorage.setItem('api_mode', mode);
    console.log(`🔄 Đã chuyển sang chế độ: ${mode}`);
    location.reload(); // Tự động tải lại trang để áp dụng
}

// ================================
// LẤY ẢNH (Dùng API động)
// ================================
async function getImages() {
    const url = `${getApiBaseUrl()}/api/images`;
    console.log("🔄 Đang gọi API:", url);

    const response = await fetch(url);
    console.log('📡 Status:', response.status);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("📦 DATA BACKEND:", result);

    if (!result.success) {
        throw new Error(result.error || "Lỗi không xác định từ server");
    }

    return result.data;
}

// ================================
// LẤY VIDEO (Dùng API động)
// ================================
async function getYoutube() {
    const url = `${getApiBaseUrl()}/api/youtube`;
    console.log("🔄 Đang gọi API YouTube:", url);

    const response = await fetch(url);
    console.log('📡 Status YouTube:', response.status);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("📦 DATA YOUTUBE:", result);

    if (!result.success) {
        throw new Error(result.error || "Lỗi không xác định từ server YouTube");
    }
    return result.data;
}

// ================================
// HIỂN THỊ ẢNH
// ================================
async function displayImages() {
    const container = document.getElementById('gallery');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Đang tải ảnh...</p>';

    try {
        const allImages = await getImages();

        let html = '';
        let totalImages = 0;
        let totalAlbums = 0;

        for (const [categoryName, categoryData] of Object.entries(allImages)) {
            if (!categoryData || typeof categoryData !== 'object' || Array.isArray(categoryData)) {
                continue;
            }

            html += `<section class="category-section"><h1 class="category-title">📁 ${categoryName}</h1>`;

            for (const [albumName, images] of Object.entries(categoryData)) {
                if (!Array.isArray(images) || images.length === 0) continue;

                totalImages += images.length;
                totalAlbums++;

                html += `
                    <div class="album-wrapper">
                        <h2 class="album-title">📂 ${albumName} (${images.length} ảnh)</h2>
                        <div class="grid">
                `;

                images.forEach(img => {
                    html += `
                        <div class="image-item">
                            <img src="${img.url}" alt="${img.public_id || ''}" loading="lazy">
                        </div>
                    `;
                });

                html += `</div></div>`;
            }
            html += `</section>`;
        }

        if (totalImages === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; background:#fff3cd; border-radius:10px;">❌ Không tìm thấy ảnh.</div>`;
            return;
        }

        container.innerHTML = `
            <p style="text-align:center; color:#28a745; font-size:18px; margin-bottom:20px;">
                ✅ Tìm thấy ${totalImages} ảnh trong ${totalAlbums} album
            </p>
            ${html}
        `;

    } catch (error) {
        console.error('❌ Lỗi tải ảnh:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; background:#f8d7da; border-radius:10px;">
                ❌ Không thể tải ảnh.<br>
                <span style="font-size:14px; color:#666;">Lỗi chi tiết: ${error.message}</span>
            </div>
        `;
    }
}

// ================================
// HIỂN THỊ VIDEO
// ================================
async function displayVideos() {
    const container = document.getElementById('videos');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Đang tải video...</p>';

    try {
        const playlists = await getYoutube();
        
        if (Object.keys(playlists).length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; background:#fff3cd; border-radius:10px;">
                    ⚠️ Không tìm thấy video nào.<br>
                    <span style="font-size:14px; color:#666;">Vui lòng kiểm tra xem backend đã có Playlist ID chưa.</span>
                </div>
            `;
            return;
        }

        let html = '';
        let totalVideos = 0;

        for (const [playlistName, playlist] of Object.entries(playlists)) {
            if (!playlist.videos || playlist.videos.length === 0) continue;
            totalVideos += playlist.videos.length;

            html += `
                <section class="category-section">
                    <h1 class="category-title">🎬 ${playlistName}</h1>
                    <div class="video-grid">
            `;

            playlist.videos.forEach(video => {
                html += `
                    <div class="video-card" onclick="openVideo('${video.video_id}')">
                        <div class="video-thumbnail">
                            <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                            <div class="play-button">▶</div>
                        </div>
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-date">📅 ${new Date(video.published_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                `;
            });

            html += `</div></section>`;
        }

        container.innerHTML = `
            <p style="text-align:center; color:#28a745; font-size:18px; margin-bottom:20px;">
                ✅ Tìm thấy ${totalVideos} video
            </p>
            ${html}
        `;

    } catch (error) {
        console.error('❌ Lỗi tải video:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; background:#f8d7da; border-radius:10px;">
                ❌ Không thể tải video.<br>
                <span style="font-size:14px; color:#666;">Lỗi chi tiết: ${error.message}</span>
            </div>
        `;
    }
}

function openVideo(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ================================
// TẠO NÚT CHUYỂN CHẾ ĐỘ (Chỉ hiện khi chạy Live Server)
// ================================
function addModeSwitcher() {
    // Kiểm tra xem có đang chạy ở localhost không
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Nếu KHÔNG phải localhost (tức là đang chạy trên Render / web thật) => KHÔNG hiện nút
    if (!isLocal) {
        return; 
    }

    // ---- Chỉ những dòng dưới đây mới chạy khi ở Localhost ----
    const currentMode = localStorage.getItem('api_mode') || 'local';
    const modeText = currentMode === 'render' ? '🔴 Render' : '🟢 Local';

    // Tạo thẻ div chứa nút chuyển đổi
    const switcher = document.createElement('div');
    switcher.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        background: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
    `;

    const label = document.createElement('span');
    label.textContent = `API: `;

    const btn = document.createElement('button');
    btn.textContent = modeText;
    btn.style.cssText = `
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        background: ${currentMode === 'render' ? '#ff4444' : '#28a745'};
        color: white;
        transition: 0.3s;
    `;
    
    // Khi bấm nút: Chuyển đổi chế độ
    btn.onclick = function() {
        const newMode = currentMode === 'render' ? 'local' : 'render';
        localStorage.setItem('api_mode', newMode);
        location.reload();
    };

    switcher.appendChild(label);
    switcher.appendChild(btn);
    document.body.appendChild(switcher);
}

// Chạy khi trang load xong
document.addEventListener('DOMContentLoaded', () => {
    addModeSwitcher(); // Thêm nút chuyển chế độ
    displayImages();
    displayVideos();
});