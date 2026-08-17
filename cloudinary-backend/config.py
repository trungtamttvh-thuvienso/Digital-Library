# config.py
import os

CLOUDINARY_CONFIG = {
    'cloud_name': os.environ.get('CLOUDINARY_CLOUD_NAME', 'f1kk6buw'),
    'api_key': os.environ.get('CLOUDINARY_API_KEY', '398932144169879'),
    'api_secret': os.environ.get('CLOUDINARY_API_SECRET', '0lq_QYcgw8UkqloqCK2HSAvsK7I')
}

YOUTUBE_CONFIG = {
    'channel_id': os.environ.get('YOUTUBE_CHANNEL_ID', 'UC4Bcmi6OajvpIYZ80zVreaQ'),
    'api_key': os.environ.get('YOUTUBE_API_KEY', 'AIzaSyBSt2VN3zT7jokwgkw26Gg8wPVCW_hM9pU')
}