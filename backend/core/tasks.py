import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import random
from django.db import transaction
import datetime
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# API 키 하드코딩
API_KEYS = [
    "live_bed3de42ec2c55504592a7dadf646395530b83f3235fd2f97d894bcfb3627191efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463951337b2fb8f684a99adc719f9ba762262efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463959ae30170ba51a43064904e1509c7fec5efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463953c9e5d3b430a3b0a184a410ddd9ca810efe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf646395f7c8bee0f3facfb566d3efc21dc64e1eefe8d04e6d233bd35cf2fabdeb93fb0d",
    "live_bed3de42ec2c55504592a7dadf6463955a0e57f7e4d5eca6798106a7868efaa0efe8d04e6d233bd35cf2fabdeb93fb0d"
]

META_SPID_URL = 'https://open.api.nexon.com/static/fconline/meta/spid.json'
META_SEASON_URL = 'https://open.api.nexon.com/static/fconline/meta/seasonid.json'
META_POSITION_URL = 'https://open.api.nexon.com/static/fconline/meta/spposition.json'

# 메타데이터 캐싱
META_SPID = None
META_SEASON = None
META_POSITION = None

# 세션 풀 설정
def create_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.1,
        status_forcelist=[429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(
        max_retries=retry_strategy,
        pool_connections=100,
        pool_maxsize=100
    )
    session.mount("https://", adapter)
    return session

# 전역 세션 풀
SESSIONS = [create_session() for _ in range(len(API_KEYS))]

def log_with_time(msg):
    now = datetime.datetime.now().strftime('[%Y년 %m월 %d일 %H시 %M분 %S초]')
    if "[DEBUG]" in msg and ("오류" in msg or "에러" in msg):
        print(f"{now} \033[91m{msg}\033[0m")
    elif "[API]" in msg and "OUID" in msg:
        print(f"{now} \033[95m{msg}\033[0m")
    elif "[API]" in msg and "MATCH ID" in msg:
        print(f"{now} \033[96m{msg}\033[0m")
    elif "[API]" in msg:
        print(f"{now} \033[92m{msg}\033[0m")
    else:
        print(f"{now} {msg}")

def load_meta():
    global META_SPID, META_SEASON, META_POSITION
    max_retries = 3
    retry_delay = 1

    def fetch_with_retry(url, parser_func):
        for attempt in range(max_retries):
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                return parser_func(response.json())
            except Exception as e:
                if attempt == max_retries - 1:
                    raise Exception(f"메타데이터 로드 실패 ({url}): {str(e)}")
                time.sleep(retry_delay)

    try:
        if META_SPID is None:
            META_SPID = fetch_with_retry(META_SPID_URL, lambda data: {str(item['id']): item['name'] for item in data})
        if META_SEASON is None:
            META_SEASON = fetch_with_retry(META_SEASON_URL, lambda data: {int(item['seasonId']): item['className'] for item in data})
        if META_POSITION is None:
            META_POSITION = fetch_with_retry(META_POSITION_URL, lambda data: {int(item['spposition']): item['desc'] for item in data})
    except Exception as e:
        log_with_time(f"[ERROR] 메타데이터 로드 실패: {str(e)}")
        raise

def fetch_and_save_players_for_all_managers():
    from core.models import Manager, Player
    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            # 1. 크롤링 단계
            log_with_time("[API] 1단계: OUID 조회 시작")
            managers = Manager.objects.all().order_by('rank')
            total = len(managers)
            current_key_index = 0
            batch_size = 1000  # 실제 배치 사이즈는 1,000명
            log_interval = 200  # 로그는 200명마다 출력
            processed_count = 0  # 처리된 매니저 수를 추적
            ouid_success_count = 0  # OUID 조회 성공한 누적 인원 수

            # OUID 조회를 위한 병렬 처리 함수
            def fetch_ouid(manager, retry_count=0):
                nonlocal current_key_index
                try:
                    api_key = API_KEYS[current_key_index]
                    session = SESSIONS[current_key_index]
                    current_key_index = (current_key_index + 1) % len(API_KEYS)
                    url = f"https://open.api.nexon.com/fconline/v1/id?nickname={manager.nickname}"
                    headers = {"x-nxopen-api-key": api_key}
                    resp = session.get(url, headers=headers, timeout=15)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and data.get("ouid"):
                            return manager, data.get("ouid")
                        else:
                            log_with_time(f"[DEBUG] {manager.nickname} 응답 데이터 없음: {data}")
                            return manager, None
                    elif resp.status_code == 429:  # Rate limit
                        log_with_time(f"[DEBUG] {manager.nickname} Rate limit 발생")
                        time.sleep(2)
                        return None, None
                    else:
                        log_with_time(f"[DEBUG] {manager.nickname} HTTP {resp.status_code} 에러: {resp.text}")
                        return manager, None
                except requests.exceptions.Timeout:
                    log_with_time(f"[DEBUG] {manager.nickname} Timeout 발생")
                    if retry_count < 2:
                        return None, None
                    return manager, None
                except requests.exceptions.RequestException as e:
                    log_with_time(f"[DEBUG] {manager.nickname} RequestException: {str(e)}")
                    if retry_count < 2:
                        return None, None
                    return manager, None
                except Exception as e:
                    log_with_time(f"[DEBUG] {manager.nickname} 예상치 못한 오류: {str(e)}")
                    return manager, None

            # 매치 ID 조회를 위한 병렬 처리 함수
            def fetch_match_id(manager, ouid, retry_count=0):
                nonlocal current_key_index
                try:
                    time.sleep(random.uniform(0.01, 0.03))
                    api_key = API_KEYS[current_key_index]
                    session = SESSIONS[current_key_index]
                    current_key_index = (current_key_index + 1) % len(API_KEYS)
                    
                    if retry_count == 0:
                        limit = 1
                        target_idx = 0
                    elif retry_count == 1:
                        limit = 2
                        target_idx = -1
                    else:
                        limit = 3
                        target_idx = -1
                    
                    url = f"https://open.api.nexon.com/fconline/v1/user/match?ouid={ouid}&matchtype=52&offset=0&limit={limit}"
                    headers = {"x-nxopen-api-key": api_key}
                    
                    if retry_count > 0:
                        time.sleep(0.1 * retry_count)
                    
                    resp = session.get(url, headers=headers, timeout=5)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and len(data) > abs(target_idx):
                            return manager, data[target_idx]
                        else:
                            return manager, None
                    elif resp.status_code == 429:
                        time.sleep(0.5)
                        return None, None
                    else:
                        log_with_time(f"[DEBUG] {manager.nickname} 매치 ID HTTP {resp.status_code} 에러: {resp.text}")
                        return manager, None
                except requests.exceptions.Timeout:
                    log_with_time(f"[DEBUG] {manager.nickname} 매치 ID Timeout 발생")
                    if retry_count < 2:
                        return None, None
                    return manager, None
                except requests.exceptions.RequestException as e:
                    log_with_time(f"[DEBUG] {manager.nickname} 매치 ID RequestException: {str(e)}")
                    if retry_count < 2:
                        return None, None
                    return manager, None
                except Exception as e:
                    log_with_time(f"[DEBUG] {manager.nickname} 매치 ID 예상치 못한 오류: {str(e)}")
                    return manager, None

            # OUID 조회 병렬 처리
            ouid_results = {}
            failed_managers = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=80) as executor:
                futures = {executor.submit(fetch_ouid, manager): manager for manager in managers}
                for future in concurrent.futures.as_completed(futures):
                    manager, ouid = future.result()
                    if ouid:
                        ouid_results[manager.pk] = ouid
                        ouid_success_count += 1
                    else:
                        failed_managers.append(manager)
                    processed_count += 1
                    if processed_count % log_interval == 0:
                        start_rank = processed_count - log_interval + 1
                        end_rank = processed_count
                        log_with_time(f"[API] {start_rank:,} ~ {end_rank:,}위 OUID 조회 완료({ouid_success_count:,}/{total:,})")

            # 1차 재시도
            if failed_managers:
                log_with_time(f"[API] 1차 재시도 시작 (대상: {len(failed_managers)}명)")
                first_retry_success = 0
                second_retry_managers = []
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=80) as executor:
                    futures = {executor.submit(fetch_ouid, manager, 1): manager for manager in failed_managers}
                    for future in concurrent.futures.as_completed(futures):
                        manager, ouid = future.result()
                        if ouid:
                            ouid_results[manager.pk] = ouid
                            first_retry_success += 1
                        else:
                            second_retry_managers.append(manager)
                
                log_with_time(f"[API] OUID 1차 재시도 완료({first_retry_success}/{len(failed_managers)})")

                # 2차 재시도
                if second_retry_managers:
                    log_with_time(f"[API] 2차 재시도 시작 (대상: {len(second_retry_managers)}명)")
                    second_retry_success = 0
                    
                    with concurrent.futures.ThreadPoolExecutor(max_workers=80) as executor:
                        futures = {executor.submit(fetch_ouid, manager, 2): manager for manager in second_retry_managers}
                        for future in concurrent.futures.as_completed(futures):
                            manager, ouid = future.result()
                            if ouid:
                                ouid_results[manager.pk] = ouid
                                second_retry_success += 1
                
                    log_with_time(f"[API] OUID 2차 재시도 완료({second_retry_success}/{len(second_retry_managers)})")
            
            log_with_time(f"[API] OUID 조회 완료 (성공: {len(ouid_results):,}/{total:,})")

            # 3. MATCH ID 조회 단계
            log_with_time("[API] 2단계: MATCH ID 조회 시작")
            processed_count = 0
            match_id_success_count = 0
            match_id_results = {}
            failed_match_managers = []
            total_ouid_success = len(ouid_results)  # OUID 조회 성공한 총 인원 수

            managers_list = [manager for manager in managers if manager.pk in ouid_results]
            batch_size = 2000  # 배치 사이즈 2배 증가
            for i in range(0, len(managers_list), batch_size):
                batch = managers_list[i:i+batch_size]
                with concurrent.futures.ThreadPoolExecutor(max_workers=300) as executor:  # 워커 수 2배 증가
                    futures = {executor.submit(fetch_match_id, manager, ouid_results[manager.pk]): manager for manager in batch}
                    for future in concurrent.futures.as_completed(futures):
                        manager, match_id = future.result()
                        if match_id:
                            match_id_results[manager.pk] = match_id
                            match_id_success_count += 1
                        else:
                            failed_match_managers.append(manager)
                        processed_count += 1
                        if processed_count % log_interval == 0:
                            start_rank = processed_count - log_interval + 1
                            end_rank = processed_count
                            log_with_time(f"[API] {start_rank:,} ~ {end_rank:,}위 MATCH ID 조회 완료(성공: {match_id_success_count:,}/{total_ouid_success:,})")
                time.sleep(0.5)  # 배치 간 대기 시간 50% 감소

            # 매치 ID 1차 재시도
            if failed_match_managers:
                log_with_time(f"[API] MATCH ID 1차 재시도 시작 (대상: {len(failed_match_managers)}명)")
                time.sleep(0.25)  # 재시도 전 대기 시간 50% 감소
                first_retry_success = 0
                second_retry_managers = []
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=200) as executor:  # 워커 수 2배 증가
                    futures = {executor.submit(fetch_match_id, manager, ouid_results[manager.pk], 1): manager for manager in failed_match_managers if manager.pk in ouid_results}
                    for future in concurrent.futures.as_completed(futures):
                        manager, match_id = future.result()
                        if match_id:
                            match_id_results[manager.pk] = match_id
                            first_retry_success += 1
                        else:
                            second_retry_managers.append(manager)
                
                log_with_time(f"[API] MATCH ID 1차 재시도 완료({first_retry_success}/{len(failed_match_managers)})")

                # 2차 재시도
                if second_retry_managers:
                    log_with_time(f"[API] MATCH ID 2차 재시도 시작 (대상: {len(second_retry_managers)}명)")
                    time.sleep(0.25)  # 재시도 전 대기 시간 50% 감소
                    second_retry_success = 0
                    
                    with concurrent.futures.ThreadPoolExecutor(max_workers=200) as executor:  # 워커 수 2배 증가
                        futures = {executor.submit(fetch_match_id, manager, ouid_results[manager.pk], 2): manager for manager in second_retry_managers if manager.pk in ouid_results}
                        for future in concurrent.futures.as_completed(futures):
                            manager, match_id = future.result()
                            if match_id:
                                match_id_results[manager.pk] = match_id
                                second_retry_success += 1
                
                    log_with_time(f"[API] MATCH ID 2차 재시도 완료({second_retry_success}/{len(second_retry_managers)})")
            
            log_with_time(f"[API] MATCH ID 조회 완료 (성공: {len(match_id_results):,}/{total_ouid_success:,})")

            # 매치 ID 조회 완료 후 유효성 필터링
            valid_match_id_results = {pk: mid for pk, mid in match_id_results.items() if mid and isinstance(mid, str) and len(mid) > 5}

            # robust_match_detail에 넘길 manager 객체 리스트 생성 (pk 기준)
            valid_managers = [m for m in managers if m.pk in valid_match_id_results and m.pk in ouid_results]

            # 4. MATCH DETAIL 조회 단계
            log_with_time("[API] 3단계: 매치 디테일 조회 및 선수 저장 시작")
            processed_count = 0
            match_detail_results = []
            match_detail_success_count = 0
            # 병렬 처리를 위한 조회 대상 리스트 생성
            detail_targets = []
            for manager in managers:
                pk = manager.pk
                if pk in ouid_results and pk in match_id_results:
                    ouid = ouid_results[pk]
                    match_id = match_id_results[pk]
                    detail_targets.append((manager, ouid, match_id))
            total_targets = len(detail_targets)
            def fetch_match_detail_with_retry(args):
                manager, ouid, match_id = args
                nonlocal current_key_index
                api_key = API_KEYS[current_key_index]
                current_key_index = (current_key_index + 1) % len(API_KEYS)
                max_match_detail_retry = 3
                for match_detail_retry in range(max_match_detail_retry):
                    try:
                        url = f"https://open.api.nexon.com/fconline/v1/match-detail?matchid={match_id}"
                        headers = {"x-nxopen-api-key": api_key}
                        resp = requests.get(url, headers=headers, timeout=5)  # 타임아웃 50% 감소
                        if resp.status_code != 200:
                            log_with_time(f"[DEBUG] {manager.nickname} MATCH DETAIL 조회 실패 - {resp.status_code}")
                            # 매치 ID 재조회
                            match_id = fetch_next_match_id(manager, ouid, match_detail_retry+1)
                            if not match_id:
                                return None
                            continue
                        data = resp.json()
                        match_info_list = data.get('matchInfo', [])
                        my_info = None
                        for info in match_info_list:
                            if info.get('ouid') == ouid:
                                my_info = info
                                break
                        if not my_info:
                            log_with_time(f"[DEBUG] {manager.nickname} MATCH DETAIL 조회 실패 - NO_MY_INFO")
                            match_id = fetch_next_match_id(manager, ouid, match_detail_retry+1)
                            if not match_id:
                                return None
                            continue
                        player_list = my_info.get('player', [])
                        if not isinstance(player_list, list) or len(player_list) < 11:
                            match_id = fetch_next_match_id(manager, ouid, match_detail_retry+1)
                            if not match_id:
                                return None
                            continue
                        squad = player_list[:11]
                        return (manager, squad)
                    except Exception as e:
                        log_with_time(f"[DEBUG] {manager.nickname} MATCH DETAIL 조회 실패 - EXCEPTION: {str(e)}")
                        match_id = fetch_next_match_id(manager, ouid, match_detail_retry+1)
                        if not match_id:
                            return None
                        continue
            def fetch_next_match_id(manager, ouid, retry_count):
                # retry_count: 1(두 번째 경기), 2(세 번째 경기), 3(네 번째 경기)
                api_key = API_KEYS[current_key_index]
                url = f"https://open.api.nexon.com/fconline/v1/user/match?ouid={ouid}&matchtype=52&offset=0&limit={retry_count+1}"
                headers = {"x-nxopen-api-key": api_key}
                try:
                    resp = requests.get(url, headers=headers, timeout=5)  # 타임아웃 50% 감소
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and len(data) > retry_count:
                            return data[retry_count]
                except Exception:
                    pass
                return None
            log_interval = 200
            batch_size = 4000  # 배치 사이즈 2배 증가
            for i in range(0, len(detail_targets), batch_size):
                batch = detail_targets[i:i+batch_size]
                with ThreadPoolExecutor(max_workers=80) as executor:  # 워커 수 2배 증가
                    futures = [executor.submit(fetch_match_detail_with_retry, args) for args in batch]
                    for future in as_completed(futures):
                        result = future.result()
                        if result:
                            match_detail_results.append(result)
                            match_detail_success_count += 1
                            processed_count += 1
                            if processed_count % log_interval == 0:
                                log_with_time(f"[API] {processed_count:,}명 MATCH DETAIL 조회 완료 ({match_detail_success_count:,}/{total_targets:,})")
                time.sleep(0.25)  # 배치 간 대기 시간 50% 감소
            log_with_time(f"[API] 매치 디테일 조회 완료 (성공: {match_detail_success_count:,}/{total_targets:,})")

            # 4. DB 저장 단계
            success_count, error_count = save_players_to_db(match_detail_results)
            
            # 성공 기준 검증
            if success_count > 0 and error_count == 0:
                log_with_time(f"[API] 데이터 저장 완료 (성공: {success_count:,}, 실패: {error_count:,})")
                return True
            else:
                raise Exception(f"데이터 저장 실패 (성공: {success_count:,}, 실패: {error_count:,})")

        except Exception as e:
            if attempt < max_retries - 1:
                log_with_time(f"[ERROR] 시도 {attempt + 1}/{max_retries} 실패: {str(e)}")
                time.sleep(retry_delay)
            else:
                log_with_time(f"[ERROR] 최종 실패: {str(e)}")
                return False

    return False

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
            if attempt == 2:  # 마지막 시도였다면
                raise e
            time.sleep(1)  # 1초 대기 후 재시도 

def get_and_save_match_players(manager, ouid, match_id, api_key):
    from core.models import Player
    """
    매치 디테일 API를 호출해서 본인 ouid의 선발 11명 선수 정보를 Player 모델에 저장
    - manager: Manager 객체
    - ouid: 해당 매니저의 ouid
    - match_id: 매치 고유 식별자
    - api_key: 사용할 API KEY
    """
    # 메타데이터 체크
    if META_POSITION is None or META_SPID is None or META_SEASON is None:
        log_with_time(f"[ERROR] {manager.nickname} 메타데이터가 로드되지 않음: META_POSITION={META_POSITION}, META_SPID={META_SPID}, META_SEASON={META_SEASON}")
        load_meta()  # 재시도
        if META_POSITION is None or META_SPID is None or META_SEASON is None:
            log_with_time(f"[ERROR] {manager.nickname} 메타데이터 재로드 실패")
            return False

    url = f"https://open.api.nexon.com/fconline/v1/match-detail?matchid={match_id}"
    headers = {"x-nxopen-api-key": api_key}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            log_with_time(f"[DEBUG] {manager.nickname} 매치 디테일 조회 실패: HTTP {resp.status_code}, {resp.text}")
            return False
        data = resp.json()
        match_info_list = data.get('matchInfo', [])
        # 본인 ouid에 해당하는 info만 추출
        my_info = None
        for info in match_info_list:
            if info.get('ouid') == ouid:
                my_info = info
                break
        if not my_info:
            log_with_time(f"[DEBUG] {manager.nickname} 매치 디테일에 본인 ouid 정보 없음, ouid={ouid}, match_id={match_id}")
            return False
        player_list = my_info.get('player', [])
        if not isinstance(player_list, list) or not player_list:
            log_with_time(f"[DEBUG] {manager.nickname} 매치 디테일 player 리스트 없음, ouid={ouid}, match_id={match_id}, player_list={player_list}, my_info={my_info}")
            return False
        # 선발 11명만 추출
        squad = player_list[:11]
        with transaction.atomic():
            for idx, p in enumerate(squad):
                if not isinstance(p, dict):
                    log_with_time(f"[DEBUG] {manager.nickname} 선수 p가 dict 아님, idx={idx}, p={p}")
                    continue
                spid = p.get('spId')
                sp_position = p.get('spPosition')
                sp_grade = p.get('spGrade')
                if spid is None or sp_position is None or sp_grade is None:
                    log_with_time(f"[DEBUG] {manager.nickname} 선수 필수 정보 누락: idx={idx}, p={p}")
                    continue
                try:
                    season_id = int(str(spid)[:3])
                except Exception as e:
                    log_with_time(f"[DEBUG] {manager.nickname} season_id 파싱 오류: {str(e)}, spid={spid}, p={p}")
                    season_id = ""
                try:
                    season_raw = META_SEASON.get(season_id, str(season_id))
                    season = clean_season_name(season_raw)
                    Player.objects.create(
                        manager=manager,
                        rank=manager.rank,
                        nickname=manager.nickname,
                        team_color=manager.team_color,
                        position=META_POSITION.get(sp_position, str(sp_position)),
                        player_name=META_SPID.get(str(spid), str(spid)),
                        season=season,
                        grade=sp_grade
                    )
                except Exception as e:
                    log_with_time(f"[ERROR] {manager.nickname} Player 저장 중 예외: {str(e)}, idx={idx}, p={p}, player_list={player_list}, my_info={my_info}, match_id={match_id}, ouid={ouid}")
                    continue
        log_with_time(f"[API] {manager.nickname} 매치 디테일 선발 11명 선수 저장 완료 (match_id={match_id})")
        return True
    except Exception as e:
        log_with_time(f"[ERROR] {manager.nickname} 매치 디테일 선수 저장 중 예외: {str(e)}, match_id={match_id}, ouid={ouid}")
        return False 

def clean_season_name(season_name):
    return re.split(r'\s*\(', season_name)[0].strip()

class WebDriverManager:
    def __init__(self):
        self.driver = None
        self.options = webdriver.ChromeOptions()
        self._setup_options()

    def _setup_options(self):
        self.options.add_argument('--headless=new')
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-gpu')
        self.options.add_argument('--window-size=1920,1080')
        self.options.add_argument('--disable-blink-features=AutomationControlled')
        self.options.add_argument('--disable-extensions')
        self.options.add_argument('--disable-infobars')
        self.options.add_argument('--disable-notifications')
        self.options.add_argument('--disable-popup-blocking')
        self.options.add_argument('--disable-logging')
        self.options.add_argument('--log-level=3')
        self.options.add_argument('--silent')
        self.options.add_argument('--disable-web-security')
        self.options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        self.options.add_argument('--disable-site-isolation-trials')
        self.options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    def create_driver(self):
        if self.driver is None:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=self.options)
            self.driver.set_page_load_timeout(5)
        return self.driver

    def quit(self):
        if self.driver is not None:
            try:
                self.driver.quit()
            except:
                pass
            finally:
                self.driver = None

def fetch_rankings_parallel(manager, retry_count=0):
    if manager is None:
        log_with_time("[크롤링] 매니저 객체가 None입니다.")
        return None, None
        
    driver_manager = WebDriverManager()
    try:
        time.sleep(random.uniform(0.05, 0.1))
        driver = driver_manager.create_driver()
        
        try:
            driver.get("https://fconline.nexon.com/datacenter/rank")
            time.sleep(random.uniform(0.05, 0.1))
            WebDriverWait(driver, 3).until(
                EC.presence_of_element_located((By.CLASS_NAME, "rank_list"))
            )
            rank_list = driver.find_elements(By.CLASS_NAME, "rank_list")
            rankings = []
            for rank in rank_list:
                try:
                    rank_num = rank.find_element(By.CLASS_NAME, "rank_num").text.strip()
                    nickname = rank.find_element(By.CLASS_NAME, "nickname").text.strip()
                    level = rank.find_element(By.CLASS_NAME, "level").text.strip()
                    if all([rank_num, nickname, level]):
                        rankings.append({
                            'rank': rank_num,
                            'nickname': nickname,
                            'level': level
                        })
                except:
                    continue
            if rankings:
                return manager, rankings
            else:
                raise Exception("유효한 랭킹 데이터가 없습니다")
        except Exception as e:
            if retry_count < 3:
                log_with_time(f"[크롤링] {manager.nickname} 재시도 {retry_count + 1}/3: {str(e)}")
                time.sleep(0.3)
                return fetch_rankings_parallel(manager, retry_count + 1)
            else:
                log_with_time(f"[크롤링] {manager.nickname} 최종 실패: {str(e)}")
                return manager, None
    except Exception as e:
        log_with_time(f"[크롤링] 예상치 못한 오류 발생: {str(e)}")
        return manager, None
    finally:
        driver_manager.quit()

def fetch_rankings_for_all_managers():
    from core.models import Manager
    start_time = time.time()
    managers = Manager.objects.all().order_by('rank')
    total = len(managers)
    processed_count = 0
    success_count = 0
    log_interval = 100
    batch_size = 1000  # 배치 크기 유지
    for i in range(0, total, batch_size):
        batch = managers[i:i+batch_size]
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
            futures = {executor.submit(fetch_rankings_parallel, manager): manager for manager in batch}
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    if result is None:
                        processed_count += 1
                        continue
                    
                    manager, rankings = result
                    if manager is None or rankings is None:
                        processed_count += 1
                        continue
                    
                    processed_count += 1
                    if rankings:
                        success_count += 1
                        for rank_data in rankings:
                            try:
                                rank_num = int(rank_data['rank'].replace(',', ''))
                                manager.rank = rank_num
                                manager.level = int(rank_data['level'])
                                manager.save()
                                break
                            except:
                                continue
                    if processed_count % log_interval == 0:
                        log_with_time(f"[크롤링] {processed_count:,}/{total:,} 처리 완료 (성공: {success_count:,})")
                except Exception as e:
                    processed_count += 1
                    continue
        time.sleep(0.5)
    end_time = time.time()
    log_with_time(f"[크롤링] 전체 처리 완료 (성공: {success_count:,}/{total:,}), 소요 시간: {end_time - start_time:.2f}초") 

def validate_player_data(player_data):
    required_fields = ['spId', 'spPosition', 'spGrade']
    for field in required_fields:
        if field not in player_data:
            return False, f"필수 필드 누락: {field}"
    return True, None

def process_player_data(player_data, manager):
    try:
        is_valid, error_msg = validate_player_data(player_data)
        if not is_valid:
            return None, error_msg

        spid = str(player_data['spId'])
        season_id = int(spid[:3])
        season_raw = META_SEASON.get(season_id, str(season_id))
        season = clean_season_name(season_raw)

        return {
            'manager': manager,
            'rank': manager.rank,
            'nickname': manager.nickname,
            'team_color': manager.team_color,
            'position': META_POSITION.get(player_data['spPosition'], str(player_data['spPosition'])),
            'player_name': META_SPID.get(spid, spid),
            'season': season,
            'grade': player_data['spGrade']
        }, None
    except Exception as e:
        return None, str(e)

def save_players_to_db(match_detail_results):
    from core.models import PlayerTemp, Player
    success_count = 0
    error_count = 0
    
    with transaction.atomic():
        # 기존 임시 테이블 비우기
        PlayerTemp.objects.all().delete()
        
        # PlayerTemp에 데이터 저장
        temp_objects = []
        for manager, squad in match_detail_results:
            for player_data in squad:
                processed_data, error = process_player_data(player_data, manager)
                if processed_data:
                    temp_objects.append(PlayerTemp(**processed_data))
                    success_count += 1
                else:
                    error_count += 1
                    log_with_time(f"[ERROR] 선수 데이터 처리 실패: {error}")
        
        # 벌크 생성
        PlayerTemp.objects.bulk_create(temp_objects)
        
        # Player 테이블 업데이트
        Player.objects.all().delete()
        Player.objects.bulk_create([
            Player(
                manager=temp.manager,
                rank=temp.rank,
                nickname=temp.nickname,
                team_color=temp.team_color,
                position=temp.position,
                player_name=temp.player_name,
                season=temp.season,
                grade=temp.grade
            ) for temp in PlayerTemp.objects.all()
        ])
    
    return success_count, error_count 