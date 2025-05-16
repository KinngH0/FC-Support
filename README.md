# FC Support - FIFA Online 4 랭킹 분석 서비스

## 프로젝트 소개
FC Support는 FIFA Online 4의 랭킹 데이터를 수집하고 분석하여 팀컬러별, 랭킹별 통계 정보를 제공하는 서비스입니다. 넥슨의 실시간 랭킹 데이터를 기반으로 메타 분석을 제공하며, 향후 선수 추천 및 전술 분석 기능을 추가할 예정입니다.

## 주요 기능
### 현재 구현된 기능
- 실시간 랭킹 데이터 수집 및 분석 (1시간 주기)
- 팀컬러별 통계 분석
- 랭킹별 통계 분석
- 공지사항 및 자료실

### 향후 구현 예정 기능
- 선수 추천 시스템
- 전술 분석 및 추천
- 실시간 매치 분석
- 개인별 통계 분석

## 기술 스택
### 백엔드
- Python
- Django
- SQLite
- BeautifulSoup4
- requests

### 프론트엔드
- React
- TypeScript
- Material-UI
- Ant Design
- Recharts
- Styled Components

## 시스템 아키텍처
1. **데이터 수집 시스템**
   - 크롤러를 통한 실시간 데이터 수집 (1시간 주기)
   - Django ORM을 통한 데이터 관리
   - 배치 처리로 효율적인 데이터 수집

2. **데이터 분석 시스템**
   - 팀컬러별 메타 분석
   - 랭킹별 통계 분석
   - 실시간 데이터 시각화

3. **API 서버**
   - Django REST Framework
   - 실시간 데이터 업데이트
   - 캐싱 시스템

4. **웹 클라이언트**
   - 반응형 웹 디자인
   - 실시간 데이터 시각화
   - 사용자 친화적 인터페이스

## 설치 및 실행 방법
1. 저장소 클론
```bash
git clone https://github.com/your-username/fc-support.git
cd fc-support
```

2. 백엔드 설정
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

3. 데이터베이스 초기화
```bash
python manage.py migrate
```

4. 서버 실행
```bash
# 백엔드 서버
python manage.py runserver

# 프론트엔드 개발 서버 (새 터미널에서)
cd ../frontend
npm install
npm start
```

## 데이터 수집 주기
- 랭킹 데이터: 1시간마다
- 메타 분석: 1시간마다

## 공지사항 및 자료실
- 공지사항: 서비스 업데이트 및 중요 알림
- 자료실: 게임 관련 유용한 정보 및 가이드

## 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 연락처
- 이메일: your-email@example.com
- 프로젝트 링크: https://github.com/your-username/fc-support 