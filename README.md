# FC Support - FIFA Online 4 랭킹/팀컬러 데이터 분석 서비스

## 프로젝트 소개

FC Support는 FIFA Online 4의 랭킹 데이터를 수집·분석하여 팀 컬러별, 랭킹별 통계 정보를 제공하는 서비스입니다. 실시간 랭킹 데이터를 기반으로 메타 분석, 팀 컬러/랭킹 통계, 공지사항, 자료실 등 다양한 기능을 제공합니다.

## 주요 기능

- 실시간 랭킹 데이터 수집 및 분석
- 팀 컬러별/랭킹별 통계 분석
- 공지사항, 업데이트, 자료실 게시판
- 무정지 데이터 갱신(임시 테이블 활용)
- 반응형 웹 UI, 다크/라이트 모드 지원

## 기술 스택

- **백엔드**: Python, Django, SQLite, BeautifulSoup4, requests
- **프론트엔드**: React, TypeScript, Material-UI(MUI)

## 설치 및 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/KinngH0/FC-Support.git
cd FC-Support
```

### 2. 백엔드 설정

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 3. 데이터베이스 마이그레이션

```bash
python manage.py migrate
```

### 4. 서버 실행

```bash
python manage.py runserver
```

### 5. 프론트엔드 실행

```bash
cd ../frontend
npm install
npm start
```

## 데이터 수집/갱신 방식

- 랭킹 데이터: 1시간마다 정각+10분 내 자동 갱신
- 무정지 갱신: 임시 테이블(temp)에서 수집 후 본 테이블로 전환

## 라이선스

MIT License

## 문의

- 이메일: support@fc-info.com
- 프로젝트: [https://github.com/KinngH0/FC-Support](https://github.com/KinngH0/FC-Support)
