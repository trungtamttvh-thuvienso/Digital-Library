const API_BASE_URL = 'https://backend-lfz9.onrender.com';

// ================================
// LẤY ẢNH (Đã thêm xử lý lỗi tốt hơn)
// ================================
async function getImages() {
    const url = `${API_BASE_URL}/api/images`;
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
// LẤY VIDEO
// ================================
async function getYoutube() {
    const url = `${API_BASE_URL}/api/youtube`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error);
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
        let html = '';
        let totalVideos = 0;

        for (const [playlistName, playlist] of Object.entries(playlists)) {
            if (playlist.videos.length === 0) continue;
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

        if (totalVideos === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; background:#fff3cd; border-radius:10px;">❌ Không tìm thấy video.</div>`;
            return;
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
                ❌ Không thể tải video: ${error.message}
            </div>
        `;
    }
}

function openVideo(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    displayImages();
    displayVideos();
});