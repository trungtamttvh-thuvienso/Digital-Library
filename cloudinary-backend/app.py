# app.py - Đã thêm CORS cho localhost

from flask import Flask, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.api
import requests
import os

from config import CLOUDINARY_CONFIG, YOUTUBE_CONFIG

app = Flask(__name__)

# =========================================================
# CẤU HÌNH CORS (Cho phép mọi nơi truy cập)
# =========================================================
# Đã bật CORS cho tất cả domain
CORS(app, origins=["*"])

# =========================================================
# CẤU HÌNH CLOUDINARY
# =========================================================
cloudinary.config(
    cloud_name=CLOUDINARY_CONFIG['cloud_name'],
    api_key=CLOUDINARY_CONFIG['api_key'],
    api_secret=CLOUDINARY_CONFIG['api_secret']
)

# =========================================================
# TRANG CHỦ
# =========================================================
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "API Backend đang hoạt động!",
        "endpoints": {
            "images": "/api/images",
            "youtube": "/api/youtube"
        }
    })

# =========================================================
# CLOUDINARY - LẤY TOÀN BỘ ẢNH
# =========================================================
def get_all_images():
    all_images = []
    next_cursor = None

    while True:
        params = {
            'type': 'upload',
            'resource_type': 'image',
            'max_results': 100
        }

        if next_cursor:
            params['next_cursor'] = next_cursor

        result = cloudinary.api.resources(**params)

        for resource in result.get('resources', []):
            asset_folder = resource.get('asset_folder', '')

            if not asset_folder:
                public_id = resource.get('public_id', '')
                if '/' in public_id:
                    asset_folder = public_id.rsplit('/', 1)[0]
                else:
                    asset_folder = 'Khác'

            all_images.append({
                'url': resource['secure_url'],
                'public_id': resource['public_id'],
                'format': resource.get('format', ''),
                'folder': asset_folder
            })

        next_cursor = result.get('next_cursor')
        if not next_cursor:
            break

    return all_images

# =========================================================
# CLOUDINARY - TẠO CẤU TRÚC ALBUM
# =========================================================
def build_album_structure(images):
    result = {}

    for image in images:
        folder = image['folder']
        parts = folder.split('/')

        if len(parts) == 1:
            category = parts[0]
            album = 'Ảnh khác'
        else:
            category = parts[0]
            album = '/'.join(parts[1:])

        if category not in result:
            result[category] = {}

        if album not in result[category]:
            result[category][album] = []

        result[category][album].append({
            'url': image['url'],
            'public_id': image['public_id'],
            'format': image['format']
        })

    return result

# =========================================================
# API CLOUDINARY
# =========================================================
@app.route('/api/images', methods=['GET'])
def get_images():
    try:
        print("🖼️ Bắt đầu quét Cloudinary...")
        print(f"Cloud Name: {CLOUDINARY_CONFIG.get('cloud_name')}")

        images = get_all_images()
        data = build_album_structure(images)

        print(f"✅ Quét thành công: {len(images)} ảnh")
        
        return jsonify({
            'success': True,
            'data': data,
            'total_images': len(images),
        })

    except Exception as e:
        print(f"❌ LỖI NGHIÊM TRỌNG CLOUDINARY: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =========================================================
# YOUTUBE - TỰ ĐỘNG QUÉT TOÀN BỘ CHANNEL
# =========================================================

# Hàm lấy danh sách tất cả Playlist từ Channel ID
def get_youtube_playlists(channel_id):
    playlists = []
    next_page_token = None

    while True:
        params = {
            'part': 'snippet,contentDetails',
            'channelId': channel_id,
            'maxResults': 50,
            'key': YOUTUBE_CONFIG['api_key']
        }
        if next_page_token:
            params['pageToken'] = next_page_token

        response = requests.get(
            'https://www.googleapis.com/youtube/v3/playlists',
            params=params,
            timeout=15
        )

        if response.status_code != 200:
            response.raise_for_status()

        data = response.json()

        for item in data.get('items', []):
            playlists.append({
                'id': item['id'],
                'title': item['snippet']['title'],
                'description': item['snippet'].get('description', '')
            })

        next_page_token = data.get('nextPageToken')
        if not next_page_token:
            break

    return playlists

# Hàm lấy video trong một Playlist (Giữ nguyên của cậu)
def get_youtube_playlist_videos(playlist_id):
    videos = []
    next_page_token = None

    while True:
        params = {
            'part': 'snippet,contentDetails',
            'playlistId': playlist_id,
            'maxResults': 50,
            'key': YOUTUBE_CONFIG['api_key']
        }
        if next_page_token:
            params['pageToken'] = next_page_token

        response = requests.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            params=params,
            timeout=15
        )

        if response.status_code != 200:
            response.raise_for_status()

        data = response.json()

        for item in data.get('items', []):
            snippet = item.get('snippet', {})
            resource_id = snippet.get('resourceId', {})
            video_id = resource_id.get('videoId')
            if not video_id:
                continue

            thumbnails = snippet.get('thumbnails', {})
            thumbnail = (
                thumbnails.get('maxres')
                or thumbnails.get('high')
                or thumbnails.get('medium')
                or thumbnails.get('default')
                or {}
            )

            videos.append({
                'video_id': video_id,
                'title': snippet.get('title', ''),
                'thumbnail': thumbnail.get('url'),
                'published_at': snippet.get('publishedAt')
            })

        next_page_token = data.get('nextPageToken')
        if not next_page_token:
            break

    return videos

# Hàm tổng hợp: Tự động quét Channel -> Lấy Playlist -> Lấy Video
def get_all_youtube_data():
    result = {}
    channel_id = YOUTUBE_CONFIG.get('channel_id')
    
    if not channel_id:
        return result

    print(f"🎬 Bắt đầu quét Channel YouTube: {channel_id}")
    
    # Bước 1: Lấy danh sách Playlist
    try:
        playlists = get_youtube_playlists(channel_id)
        print(f"✅ Tìm thấy {len(playlists)} playlist")
    except Exception as e:
        print(f"❌ Lỗi lấy playlist: {e}")
        return result

    # Bước 2: Với mỗi Playlist, lấy video bên trong
    for playlist in playlists:
        playlist_id = playlist['id']
        playlist_title = playlist['title']
        
        print(f"  📂 Đang lấy video từ: {playlist_title}")
        
        try:
            videos = get_youtube_playlist_videos(playlist_id)
            result[playlist_title] = {
                'videos': videos
            }
            print(f"    ✅ Lấy được {len(videos)} video")
        except Exception as e:
            print(f"    ❌ Lỗi lấy video từ playlist {playlist_title}: {e}")
            result[playlist_title] = {
                'videos': []
            }

    return result

# =========================================================
# API YOUTUBE
# =========================================================
@app.route('/api/youtube', methods=['GET'])
def get_youtube():
    try:
        data = get_all_youtube_data()
        total_videos = sum(len(p['videos']) for p in data.values())

        return jsonify({
            'success': True,
            'data': data,
            'total_videos': total_videos
        })

    except Exception as e:
        print(f"❌ Lỗi YouTube: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =========================================================
# CHẠY SERVER
# =========================================================

# Bắt buộc Flask chạy bằng HTTPS (Để điện thoại và Live Server không chặn)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # Thêm host='0.0.0.0' để cho phép truy cập từ mạng local
    app.run(host='0.0.0.0', port=port, debug=True)