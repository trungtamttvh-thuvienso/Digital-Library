const API_BASE_URL = 'https://backend-lfz9.onrender.com';


// ================================
// LẤY ẢNH
// ================================

async function getImages() {

    const response = await fetch(
        `${API_BASE_URL}/api/images`   // ← DÙNG BIẾN
    );

    console.log('Status:', response.status);
    console.log('URL:', response.url);

    const result = await response.json();
    console.log("📦 DATA BACKEND:", result.data);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result.data;
}


// ================================
// LẤY VIDEO
// ================================

async function getYoutube() {

    const response = await fetch(
        `${API_BASE_URL}/api/youtube`
    );

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

    container.innerHTML = '<p>⏳ Đang tải ảnh...</p>';

    try {

        const allImages = await getImages();

        let html = '';

        let totalImages = 0;
        let totalAlbums = 0;

        // Duyệt Category
        for (const [categoryName, categoryData] of Object.entries(allImages)) {

            // Bỏ qua dữ liệu không phải object
            if (
                !categoryData ||
                typeof categoryData !== 'object' ||
                Array.isArray(categoryData)
            ) {
                continue;
            }

            // Tiêu đề CATEGORY
            html += `
                <section class="category-section">

                    <h1 class="category-title">
                        📁 ${categoryName}
                    </h1>
            `;

            // Duyệt các folder con
            for (
                const [albumName, images]
                of Object.entries(categoryData)
            ) {

                // Chỉ xử lý những folder có danh sách ảnh
                if (!Array.isArray(images)) {
                    continue;
                }

                if (images.length === 0) {
                    continue;
                }

                totalImages += images.length;
                totalAlbums++;

                html += `
                    <div class="album-wrapper">

                        <h2 class="album-title">
                            📂 ${albumName}
                            (${images.length} ảnh)
                        </h2>

                        <div class="grid">
                `;

                // Duyệt ảnh
                images.forEach(img => {

                    html += `
                        <div class="image-item">

                            <img
                                src="${img.url}"
                                alt="${img.public_id || ''}"
                                loading="lazy"
                            >

                        </div>
                    `;

                });

                html += `
                        </div>

                    </div>
                `;
            }

            html += `
                </section>
            `;
        }

        if (totalImages === 0) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    padding:40px;
                    background:#fff3cd;
                    border-radius:10px;
                ">
                    ❌ Không tìm thấy ảnh.
                </div>
            `;

            return;
        }

        // Thông báo tổng số
        container.innerHTML = `
            <p style="
                text-align:center;
                color:#28a745;
                font-size:18px;
                margin-bottom:20px;
            ">
                ✅ Tìm thấy ${totalImages} ảnh
                trong ${totalAlbums} album
            </p>

            ${html}
        `;

        console.log(
            `✅ Đã hiển thị ${totalImages} ảnh trong ${totalAlbums} album`
        );

    } catch (error) {

        console.error(
            '❌ Lỗi tải ảnh:',
            error
        );

        container.innerHTML = `
            <p>❌ Không thể tải ảnh.</p>
        `;
    }
}


// ================================
// HIỂN THỊ VIDEO
// ================================

// ================================
// HIỂN THỊ VIDEO (CẢI TIẾN)
// ================================

async function displayVideos() {
    const container = document.getElementById('videos');

    if (!container) return;

    container.innerHTML = '<p>⏳ Đang tải video...</p>';

    try {
        const playlists = await getYoutube();

        let html = '';
        let totalVideos = 0;
        let totalPlaylists = 0;

        for (const [playlistName, playlist] of Object.entries(playlists)) {
            if (playlist.videos.length === 0) continue;

            totalPlaylists++;
            totalVideos += playlist.videos.length;

            // Tiêu đề PLAYLIST (giống category của ảnh)
            html += `
                <section class="category-section">
                    <h1 class="category-title">
                        🎬 ${playlistName}
                    </h1>
            `;

            // Grid video
            html += `
                <div class="video-grid">
            `;

            playlist.videos.forEach(video => {
                html += `
                    <div class="video-card" onclick="openVideo('${video.video_id}')">
                        <div class="video-thumbnail">
                            <img 
                                src="${video.thumbnail}" 
                                alt="${video.title}" 
                                loading="lazy"
                            >
                            <div class="play-button">▶</div>
                        </div>
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-date">
                            📅 ${new Date(video.published_at).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                `;
            });

            html += `
                </div> <!-- end video-grid -->
                </section> <!-- end category-section -->
            `;
        }

        if (totalVideos === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; background:#fff3cd; border-radius:10px;">
                    ❌ Không tìm thấy video nào.
                </div>
            `;
            return;
        }

        // Thông báo tổng số (giống như ảnh)
        container.innerHTML = `
            <p style="text-align:center; color:#28a745; font-size:18px; margin-bottom:20px;">
                ✅ Tìm thấy ${totalVideos} video trong ${totalPlaylists} danh sách phát
            </p>
            ${html}
        `;

        console.log(`✅ Đã hiển thị ${totalVideos} video trong ${totalPlaylists} playlist`);

    } catch (error) {
        console.error('❌ Lỗi tải video:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:40px; background:#f8d7da; border-radius:10px;">
                ❌ Không thể tải video: ${error.message}
            </div>
        `;
    }
}

// ====== MỞ VIDEO KHI BẤM VÀO ======
function openVideo(videoId) {
    // Mở video trên YouTube (tab mới)
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}


// ================================
// KHỞI ĐỘNG
// ================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        displayImages();
        displayVideos();

    }
);