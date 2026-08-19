// ============================================================
// CẤU HÌNH API URL - MẶC ĐỊNH LÀ RENDER
// ============================================================

// 1. URL Backend Render (KHÔNG có dấu / ở cuối)
const RENDER_API_URL = 'https://digital-library-967p.onrender.com';
const LOCAL_API_URL = 'http://localhost:5000';

// 2. Hàm lấy URL - Mặc định là Render, trừ khi bấm nút Local
function getApiBaseUrl() {
    const mode = localStorage.getItem('api_mode') || 'render'; // 👈 Đã đổi default thành 'render'
    const url = mode === 'render' ? RENDER_API_URL : LOCAL_API_URL;
    return url.replace(/\/+$/, ''); 
}

function switchApiMode(mode) {
    localStorage.setItem('api_mode', mode);
    location.reload();
}

// ============================================================
// HỘP LOG HIỂN THỊ LỖI TRÊN MÀN HÌNH (Dành cho điện thoại)
// ============================================================
function showErrorOnScreen(message) {
    // Tìm hoặc tạo thẻ div để hiện lỗi
    let errorBox = document.getElementById('mobile-error-box');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'mobile-error-box';
        errorBox.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            z-index: 99999;
            background: #ffebee;
            border: 2px solid #d32f2f;
            color: #b71c1c;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-height: 80vh;
            overflow-y: auto;
            display: none; /* Mặc định ẩn, khi có lỗi thì hiện */
        `;
        document.body.appendChild(errorBox);
    }

    // Hiện hộp lỗi và in nội dung
    errorBox.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    errorBox.innerHTML += `<div style="border-bottom:1px solid #ef9a9a; padding: 5px 0;">[${time}] ⚠️ ${message}</div>`;
    
    // Tự động cuộn xuống dưới cùng
    errorBox.scrollTop = errorBox.scrollHeight;

    // Console log để cậu vẫn xem được nếu đang dùng máy tính
    console.error(`[${time}] ⚠️ ${message}`);
}

// Hàm xóa hộp log (nếu muốn xóa khi đã sửa xong lỗi)
function clearErrorBox() {
    const box = document.getElementById('mobile-error-box');
    if (box) box.remove();
}

// ================================================================
// HÀM GỌI API (CÓ BẮT LỖI VÀ IN RA MÀN HÌNH)
// ================================================================
async function fetchApi(endpoint) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    console.log("🔄 Gọi API:", url);
    showErrorOnScreen(`🔄 Đang gọi: ${url}`); // In ra màn hình luôn

    try {
        const response = await fetch(url, {
            mode: 'cors',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Lỗi ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(`Server báo lỗi: ${result.error || 'Lỗi không xác định'}`);
        }
        return result.data;

    } catch (error) {
        // In lỗi chi tiết ra màn hình
        showErrorOnScreen(`❌ THẤT BẠI: ${error.message}`);
        throw error; // Vẫn ném lỗi để hàm display bắt được
    }
}

// ================================
// LẤY ẢNH & VIDEO (Dùng hàm fetchApi chung)
// ================================
async function getImages() {
    return await fetchApi('/api/images');
}

async function getYoutube() {
    return await fetchApi('/api/youtube');
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
        // Xóa hộp lỗi nếu thành công
        clearErrorBox(); 

        let html = '';
        let totalImages = 0;
        let totalAlbums = 0;

        for (const [categoryName, categoryData] of Object.entries(allImages)) {
            if (!categoryData || typeof categoryData !== 'object' || Array.isArray(categoryData)) continue;

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
        container.innerHTML = `
            <div style="text-align:center; padding:40px; background:#f8d7da; border-radius:10px;">
                ❌ Không thể tải ảnh.<br>
                <span style="font-size:14px; color:#666;">Lỗi: ${error.message}</span>
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
        clearErrorBox();
        
        if (Object.keys(playlists).length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; background:#fff3cd; border-radius:10px;">
                    ⚠️ Không tìm thấy video nào.
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
        container.innerHTML = `
            <div style="text-align:center; padding:40px; background:#f8d7da; border-radius:10px;">
                ❌ Không thể tải video: ${error.message}
            </div>
        `;
    }
}

function openVideo(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ================================
// NÚT CHUYỂN CHẾ ĐỘ (Chỉ hiện ở Localhost)
// ================================
function addModeSwitcher() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return; 

    const currentMode = localStorage.getItem('api_mode') || 'render';
    const modeText = currentMode === 'render' ? '🔴 Render' : '🟢 Local';

    const switcher = document.createElement('div');
    switcher.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: white; padding: 12px 20px; border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif; display: flex; align-items: center; gap: 10px; font-size: 14px;
    `;

    const label = document.createElement('span');
    label.textContent = `API: `;

    const btn = document.createElement('button');
    btn.textContent = modeText;
    btn.style.cssText = `
        border: none; padding: 6px 14px; border-radius: 8px;
        cursor: pointer; font-weight: bold;
        background: ${currentMode === 'render' ? '#ff4444' : '#28a745'};
        color: white; transition: 0.3s;
    `;
    
    btn.onclick = function() {
        const newMode = currentMode === 'render' ? 'local' : 'render';
        switchApiMode(newMode);
    };

    switcher.appendChild(label);
    switcher.appendChild(btn);
    document.body.appendChild(switcher);
}

document.addEventListener('DOMContentLoaded', () => {
    addModeSwitcher();
    displayImages();
    displayVideos();
});