import requests
import time
import random
from django.db import transaction
from core.models import Manager, Player
import datetime

# API 키 하드코딩
API_KEYS = [
    "live_bed3de42ec2c55504592a7dadf646395530b83f3235fd2f97d894bcfb3627191efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463951337b2fb8f684a99adc719f9ba762262efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463959ae30170ba51a43064904e1509c7fec5efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463953c9e5d3b430a3b0a184a410ddd9ca810efe8d04e6d233bd35cf2fabdeb93fb0d"
]

META_SPID_URL = 'https://open.api.nexon.com/static/fconline/meta/spid.json'
META_SEASON_URL = 'https://open.api.nexon.com/static/fconline/meta/seasonid.json'
META_POSITION_URL = 'https://open.api.nexon.com/static/fconline/meta/spposition.json'

# 메타데이터 캐싱
META_SPID = None
META_SEASON = None
META_POSITION = None

def log_with_time(msg):
    now = datetime.datetime.now().strftime('[%Y년 %m월 %d일 %H시 %M분 %S초]')
    print(f"{now} {msg}")

def load_meta():
    global META_SPID, META_SEASON, META_POSITION
    if META_SPID is None:
        META_SPID = requests.get(META_SPID_URL).json()
    if META_SEASON is None:
        META_SEASON = requests.get(META_SEASON_URL).json()
    if META_POSITION is None:
        META_POSITION = requests.get(META_POSITION_URL).json()

def fetch_and_save_players_for_all_managers():
    log_with_time("[API] 서버 시작시 최초 데이터 수집 실행")
    managers = Manager.objects.all().order_by('rank')
    total = len(managers)
    current_key_index = 0
    batch_size = 1000  # 실제 배치 사이즈는 1,000명
    log_interval = 200  # 로그는 200명마다 출력
    processed_count = 0  # 처리된 매니저 수를 추적
    api_success_count = 0  # API 호출 성공한 누적 인원 수
    for i in range(0, total, batch_size):
        batch = managers[i:i + batch_size]
        for manager in batch:
            try:
                # API 키 순환
                api_key = API_KEYS[current_key_index]
                current_key_index = (current_key_index + 1) % len(API_KEYS)
                
                # 1. OUID 조회
                url = f"https://open.api.nexon.com/fconline/v1/id?nickname={manager.nickname}"
                headers = {"x-nxopen-api-key": api_key}
                print(f"[DEBUG] {manager.nickname} API 호출 시도")
                resp = requests.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if data:
                        ouid = data.get("ouid")
                        if ouid:
                            print(f"[DEBUG] {manager.nickname} ouid 획득: {ouid}")
                            
                            # 2. 최근 매치 ID 조회
                            match_url = f"https://open.api.nexon.com/fconline/v1/user/match?ouid={ouid}&matchtype=52&offset=0&limit=1"
                            match_resp = requests.get(match_url, headers=headers)
                            if match_resp.status_code == 200:
                                match_data = match_resp.json()
                                if match_data:
                                    match_id = match_data[0]
                                    print(f"[DEBUG] {manager.nickname} 매치 ID 획득: {match_id}")
                                    
                                    # 3. 매치 상세 정보 조회
                                    detail_url = f"https://open.api.nexon.com/fconline/v1/match-detail?matchid={match_id}"
                                    detail_resp = requests.get(detail_url, headers=headers)
                                    if detail_resp.status_code == 200:
                                        detail_data = detail_resp.json()
                                        print(f"[DEBUG] {manager.nickname} 매치 상세 정보 획득")
                                        
                                        # 본인 스쿼드의 선발 11명 추출
                                        players = []
                                        for info in detail_data['matchInfo']:
                                            if info['ouid'] == ouid:  # 본인 팀 찾기
                                                for p in info.get('player', []):
                                                    if p['spPosition'] != 28:  # SUB(28) 제외
                                                        players.append({
                                                            'match_id': match_id,
                                                            'position_id': p['spPosition'],
                                                            'spid': p['spId'],
                                                            'season_id': int(str(p['spId'])[:3]),  # spId의 앞 3자리가 시즌 ID
                                                            'grade': p['spGrade']
                                                        })
                                        
                                        print(f"[DEBUG] {manager.nickname} 선발 11명 추출: {len(players)}명")
                                        with transaction.atomic():
                                            for player in players:
                                                Player.objects.create(
                                                    manager=manager,
                                                    match_id=player['match_id'],
                                                    position_id=player['position_id'],
                                                    spid=player['spid'],
                                                    season_id=player['season_id'],
                                                    grade=player['grade']
                                                )
                                        api_success_count += 1
                                        print(f"[DEBUG] {manager.nickname} DB 저장 완료")
                                    else:
                                        print(f"[DEBUG] {manager.nickname} 매치 상세 정보 API 호출 실패: {detail_resp.status_code}")
                                        print(f"[DEBUG] 응답 내용: {detail_resp.text}")
                                else:
                                    print(f"[DEBUG] {manager.nickname} 매치 데이터 없음")
                            else:
                                print(f"[DEBUG] {manager.nickname} 매치 ID API 호출 실패: {match_resp.status_code}")
                                print(f"[DEBUG] 응답 내용: {match_resp.text}")
                        else:
                            print(f"[DEBUG] {manager.nickname} ouid 없음")
                    else:
                        print(f"[DEBUG] {manager.nickname} 데이터 없음")
                else:
                    print(f"[DEBUG] {manager.nickname} API 호출 실패: {resp.status_code}")
                    print(f"[DEBUG] 응답 내용: {resp.text}")
                    print(f"[DEBUG] 요청 URL: {url}")
                    print(f"[DEBUG] 요청 헤더: {headers}")
                time.sleep(0.002)  # API 호출 간격 조절
            except Exception as e:
                print(f"[API] {manager.nickname} 처리 중 오류: {e}")
                continue
            
            processed_count += 1
            # 200명마다 로그 출력
            if processed_count % log_interval == 0:
                start_rank = processed_count - log_interval + 1
                end_rank = processed_count
                log_with_time(f"[API] {start_rank:,} ~ {end_rank:,}위 API 호출 완료({api_success_count:,}/{total:,})")
    log_with_time(f"[API] API 호출 완료 ({api_success_count:,}/{total:,})")

def get_ouid(nickname, api_key):
    url = 'https://open.api.nexon.com/fconline/v1/id'
    headers = {'x-nxopen-api-key': api_key}
    params = {'nickname': nickname}
    for attempt in range(3):  # 최대 3번 재시도
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            return resp.json()['ouid']
        except Exception as e:
            print(f"[DEBUG] OUID 조회 실패 (nickname: {nickname}): {e}")
            if attempt == 2:  # 마지막 시도였다면
                raise e
            time.sleep(1)  # 1초 대기 후 재시도

def get_last_match_id(ouid, api_key):
    url = 'https://open.api.nexon.com/fconline/v1/user/match'
    headers = {'x-nxopen-api-key': api_key}
    params = {'ouid': ouid, 'matchtype': 52, 'offset': 0, 'limit': 1}
    for attempt in range(3):  # 최대 3번 재시도
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            return resp.json()[0]
        except Exception as e:
            print(f"[DEBUG] Match ID 조회 실패 (ouid: {ouid}): {e}")
            if attempt == 2:  # 마지막 시도였다면
                raise e
            time.sleep(1)  # 1초 대기 후 재시도

def get_match_players(match_id, api_key):
    url = 'https://open.api.nexon.com/fconline/v1/match-detail'
    headers = {'x-nxopen-api-key': api_key}
    params = {'matchid': match_id}
    for attempt in range(3):  # 최대 3번 재시도
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            # 선발 11명만 추출
            players = []
            for info in data['matchInfo']:
                for p in info.get('player', []):
                    players.append({
                        'position_id': p['spPosition'],
                        'spid': p['spId'],
                        'season_id': int(str(p['spId'])[:3]),
                        'grade': p['spGrade'],
                    })
            return players
        except Exception as e:
            print(f"[DEBUG] Match Detail 조회 실패 (match_id: {match_id}): {e}")
            if attempt == 2:  # 마지막 시도였다면
                raise e
            time.sleep(1)  # 1초 대기 후 재시도 