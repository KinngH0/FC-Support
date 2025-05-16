# FC Support

FC Support는 FC온라인을 위한 지원 사이트입니다.

## 기술 스택

- Frontend: React, Material-UI, Framer Motion
- Backend: Django
- Database: SQLite (개발) / PostgreSQL (운영)

## 설치 및 실행

### Frontend

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### Backend

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
python manage.py runserver
```

## 주요 기능

- 공지사항
- 업데이트 내역
- 자료실
- 픽률 조회
- 팀컬러 조회
- 효율 조회
- 관리자 대시보드

## 개발 환경 설정

1. `.env` 파일 생성
2. 필요한 환경 변수 설정
3. 데이터베이스 마이그레이션
4. 관리자 계정 생성

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 