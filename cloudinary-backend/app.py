from flask import Flask, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.api
import requests
import os

from config import CLOUDINARY_CONFIG, YOUTUBE_CONFIG

app = Flask(__name__)

CORS(app)

# =========================================================
# TRANG CHỦ (Gốc '/') - ĐỂ KHÔNG BỊ LỖI 404
# =========================================================
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "API đang hoạt động!",
        "endpoints": {
            "images": "/api/images",
            "youtube": "/api/youtube",
            "test_playlist": "/api/test-playlist"
        }
    })
    
    
# =========================================================
# CẤU HÌNH CLOUDINARY
# =========================================================

cloudinary.config(
    cloud_name=CLOUDINARY_CONFIG['cloud_name'],
    api_key=CLOUDINARY_CONFIG['api_key'],
    api_secret=CLOUDINARY_CONFIG['api_secret']
)

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
        print("\n🖼️ Đang quét Cloudinary...")

        images = get_all_images()
        data = build_album_structure(images)

        category_count = len(data)
        album_count = sum(len(category) for category in data.values())

        print(f"📊 Ảnh: {len(images)}")
        print(f"📁 Chuyên mục: {category_count}")
        print(f"📂 Album: {album_count}")

        return jsonify({
            'success': True,
            'data': data,
            'total_images': len(images),
            'total_categories': category_count,
            'total_albums': album_count
        })

    except Exception as e:
        print(f"❌ Lỗi Cloudinary: {e}")

        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =========================================================
# YOUTUBE - TEST MỘT PLAYLIST
# =========================================================

def test_youtube_playlist(playlist_id):
    params = {
        'part': 'snippet,contentDetails',
        'id': playlist_id,
        'key': YOUTUBE_CONFIG['api_key']
    }

    response = requests.get(
        'https://www.googleapis.com/youtube/v3/playlists',
        params=params,
        timeout=15
    )

    return response

@app.route('/api/test-playlist', methods=['GET'])
def test_playlist_api():
    try:
        playlist_id = 'PLOAB5DslhY5U'

        print("\n🧪 TEST PLAYLIST")
        print(f"📋 Playlist ID: {playlist_id}")

        response = test_youtube_playlist(playlist_id)

        print(f"📡 Status: {response.status_code}")
        print(f"📦 Response: {response.text}")

        return jsonify(response.json()), response.status_code

    except Exception as e:
        print(f"❌ Lỗi test playlist: {e}")

        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =========================================================
# YOUTUBE - LẤY DANH SÁCH PLAYLIST
# =========================================================

def get_youtube_playlists():
    playlists = []
    next_page_token = None

    print("\n🎥 Đang lấy danh sách playlist YouTube...")
    print(f"🔑 Channel ID: {YOUTUBE_CONFIG['channel_id']}")

    while True:
        params = {
            'part': 'snippet,contentDetails',
            'channelId': YOUTUBE_CONFIG['channel_id'],
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

        print(f"📡 Playlist API status: {response.status_code}")

        if response.status_code != 200:
            print(response.text)
            response.raise_for_status()

        data = response.json()

        print(
            f"📋 YouTube trả về "
            f"{data.get('pageInfo', {}).get('totalResults', 0)} playlist"
        )

        for item in data.get('items', []):
            snippet = item.get('snippet', {})
            content_details = item.get('contentDetails', {})
            thumbnails = snippet.get('thumbnails', {})

            thumbnail = (
                thumbnails.get('high')
                or thumbnails.get('medium')
                or thumbnails.get('default')
                or {}
            )

            playlists.append({
                'id': item['id'],
                'title': snippet.get('title', ''),
                'description': snippet.get('description', ''),
                'thumbnail': thumbnail.get('url'),
                'video_count': content_details.get('itemCount', 0)
            })

            print(f"   📁 {snippet.get('title', '')} | {item['id']}")

        next_page_token = data.get('nextPageToken')

        if not next_page_token:
            break

    print(f"✅ Tổng playlist: {len(playlists)}")

    return playlists

# =========================================================
# YOUTUBE - LẤY VIDEO TRONG PLAYLIST
# =========================================================

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
            print(
                f"❌ Lỗi lấy video playlist {playlist_id}:"
            )
            print(response.text)
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
                'description': snippet.get('description', ''),
                'thumbnail': thumbnail.get('url'),
                'published_at': snippet.get('publishedAt'),
                'channel_title': snippet.get('channelTitle', ''),
                'embed_url': f'https://www.youtube.com/embed/{video_id}',
                'watch_url': f'https://www.youtube.com/watch?v={video_id}'
            })

        next_page_token = data.get('nextPageToken')

        if not next_page_token:
            break

    return videos

# =========================================================
# YOUTUBE - LẤY TOÀN BỘ DỮ LIỆU
# =========================================================

def get_all_youtube_data():
    playlists = get_youtube_playlists()
    result = {}

    for playlist in playlists:
        playlist_id = playlist['id']
        playlist_title = playlist['title']

        print(f"🔍 Đang lấy video: {playlist_title}")

        videos = get_youtube_playlist_videos(playlist_id)

        result[playlist_title] = {
            'playlist_id': playlist_id,
            'ten': playlist_title,
            'description': playlist['description'],
            'thumbnail': playlist['thumbnail'],
            'video_count': len(videos),
            'videos': videos
        }

        print(f"   ✅ {len(videos)} video")

    return result

# =========================================================
# API YOUTUBE
# =========================================================

@app.route('/api/youtube', methods=['GET'])
def get_youtube():
    try:
        data = get_all_youtube_data()

        total_videos = sum(
            playlist['video_count']
            for playlist in data.values()
        )

        return jsonify({
            'success': True,
            'data': data,
            'total_playlists': len(data),
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

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    