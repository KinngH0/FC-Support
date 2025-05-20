#!/bin/bash

# 가상환경 활성화
source venv/bin/activate

# 필요한 패키지 설치
pip install -r requirements.txt

# 정적 파일 수집
python manage.py collectstatic --noinput

# 데이터베이스 마이그레이션
python manage.py migrate

# Gunicorn으로 서버 실행
gunicorn fc_support.wsgi:application --bind 0.0.0.0:8000 --workers 4 --threads 2 