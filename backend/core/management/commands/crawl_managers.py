import requests
from bs4 import BeautifulSoup
import re
import time
import datetime
from django.db import transaction
from django.core.management.base import BaseCommand
from core.models import Manager, ManagerTemp
import concurrent.futures
import random
import logging

def parse_club_value(text):
    text = text.replace(",", "").strip()
    total = 0
    units = {'만': 10**4, '억': 10**8, '조': 10**12, '경': 10**16}
    # ex: '2경 3조 4억 5000만', '1380 2351만', '5400만', '2경 2197'
    # 숫자+단위 조합 추출
    matches = re.findall(r'(\d+)([만억조경])', text)
    for num, unit in matches:
        total += int(num) * units[unit]
    # 단위 없는 숫자(예: '2197')가 있으면 만 단위로 간주
    remain = re.sub(r'(\d+[만억조경])', '', text).strip()
    if remain.isdigit():
        total += int(remain) * 10000
    return total

def clean_team_color(text):
    # '유벤투스 (11명)' -> '유벤투스'
    return re.sub(r"\s*\(.*\)$", "", text.strip())

def log_with_time(msg):
    now = datetime.datetime.now().strftime('[%Y년 %m월 %d일 %H시 %M분 %S초]')
    if "[크롤링]" in msg:
        print(f"{now} \033[92m{msg}\033[0m")
    elif "OUID" in msg:
        print(f"{now} \033[95m{msg}\033[0m")
    else:
        print(f"{now} {msg}")

def robust_request(url, params=None, headers=None, max_retries=3, sleep_sec=1):
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            return resp
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(sleep_sec)
            else:
                raise e

def crawl_page(page):
    url = f"https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4pageno={page}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for attempt in range(3):  # 최대 3번 재시도
        try:
            resp = robust_request(url, headers=headers)
            soup = BeautifulSoup(resp.text, "html.parser")
            rows = soup.select(".tbody .tr")
            managers = []
            
            for row in rows:
                try:
                    # rank 파싱
                    rank_elem = row.select_one(".rank_no")
                    if not rank_elem:
                        continue
                    rank = int(rank_elem.text.strip())
                    
                    # nickname 파싱
                    nickname = row.select_one(".name.profile_pointer").text.strip()
                    
                    # club_value 파싱
                    club_value_text = row.select_one(".price").get("alt") or row.select_one(".price").text
                    club_value = int(club_value_text.replace(",", "")) if club_value_text.isdigit() else parse_club_value(row.select_one(".price").text)
                    
                    # team_color 파싱
                    team_color_elem = row.select_one(".td.team_color")
                    team_color = clean_team_color(team_color_elem.text.strip()) if team_color_elem else "알 수 없음"
                    
                    # formation 파싱
                    formation = row.select_one(".td.formation").text.strip()
                    
                    # score 파싱
                    score = int(float(row.select_one(".td.rank_r_win_point").text.strip()))
                    
                    managers.append({
                        "rank": rank,
                        "nickname": nickname,
                        "club_value": club_value,
                        "team_color": team_color,
                        "formation": formation,
                        "score": score,
                    })
                except Exception as e:
                    print(f"[DEBUG] 행 파싱 실패: {e}")
                    continue
            
            return managers
            
        except Exception as e:
            if attempt == 2:  # 마지막 시도였다면
                raise e
            time.sleep(1)  # 1초 대기 후 재시도

def crawl_page_safe(page):
    try:
        # 0.5초 딜레이로 안정성 확보
        time.sleep(0.5)
        return crawl_page(page), None
    except Exception as e:
        return [], page

class Command(BaseCommand):
    help = "FC온라인 랭커 데이터 최초 수집 및 저장"

    def handle(self, *args, **options):
        total = 0
        failed = []
        all_data = []
        page_range = list(range(1, 501))
        batch_size = 100  # 100페이지 단위로 (최대 병렬성)
        max_workers = 50  # 스레드 수 50으로 조정 (안정성 확보)

        # 1차 전체 병렬 크롤링
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            page_to_count = {}
            for batch_start in range(1, 501, batch_size):
                batch_end = min(batch_start + batch_size - 1, 500)
                pages = list(range(batch_start, batch_end + 1))
                futures = {executor.submit(crawl_page_safe, page): page for page in pages}
                batch_data = []
                batch_failed = []
                for future in concurrent.futures.as_completed(futures):
                    data, fail_page = future.result()
                    page = futures[future]
                    batch_data.extend(data)
                    page_to_count[page] = len(data)
                    if fail_page:
                        batch_failed.append(page)
                all_data.extend(batch_data)
                failed.extend(batch_failed)
                total += len(batch_data)
                log_with_time(f"[크롤링] {batch_start} ~ {batch_end} 페이지 크롤링 완료({total:,}/10,000)")

        # 1차 전체 크롤링 후, 누락된 페이지 탐색 (20명 미만 데이터 수집된 페이지)
        missing_pages = [page for page, count in page_to_count.items() if count < 20]
        failed_ranks = []
        for page in missing_pages:
            # 해당 페이지에서 실제로 수집된 등수만 추출
            page_ranks = [(page - 1) * 20 + i + 1 for i in range(page_to_count.get(page, 0), 20)]
            failed_ranks.extend(page_ranks)
            # 상세 누락 현황 로그 추가
            log_with_time(f"[크롤링] {page}페이지: {page_to_count.get(page, 0)}명 수집, 누락 등수: {page_ranks}")
        # 실패 페이지는 출력하지 않음
        if failed_ranks:
            log_with_time(f"[크롤링] 크롤링 실패 등수 - {sorted(failed_ranks)}")

        log_with_time(f"[크롤링] 크롤링 완료 ({len(all_data):,}/10,000)")
        # DB 저장
        with transaction.atomic():
            # 1. ManagerTemp 비우기
            ManagerTemp.objects.all().delete()
            # 2. 크롤링 데이터 임시 저장
            temp_objs = [ManagerTemp(**m) for m in all_data]
            ManagerTemp.objects.bulk_create(temp_objs)
            # 3. Manager 테이블 초기화
            Manager.objects.all().delete()
            # 4. ManagerTemp → Manager로 복사
            for temp in ManagerTemp.objects.all():
                Manager.objects.create(
                    rank=temp.rank,
                    nickname=temp.nickname,
                    club_value=temp.club_value,
                    team_color=temp.team_color,
                    formation=temp.formation,
                    score=temp.score,
                    created_at=temp.created_at,
                )
            # 5. ManagerTemp 비우기
            ManagerTemp.objects.all().delete()
        # 크롤링 후 자동으로 API 호출 및 Player 저장
        from core.tasks import fetch_and_save_players_for_all_managers
        fetch_and_save_players_for_all_managers()
