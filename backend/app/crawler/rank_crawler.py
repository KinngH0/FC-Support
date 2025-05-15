import aiohttp
import asyncio
from bs4 import BeautifulSoup
import re
from datetime import datetime
import pytz
from typing import List, Dict, Set
from ..logger import logger
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class RankCrawler:
    def __init__(self):
        self.base_url = "https://fconline.nexon.com/datacenter/rank_inner"
        self.seoul_tz = pytz.timezone('Asia/Seoul')
        self.semaphore = asyncio.Semaphore(150)  # 동시 요청 제한을 150개로 증가
        self.failed_pages: Set[int] = set()
        
    def get_current_time(self) -> datetime:
        """서울 시간 기준 현재 시간 반환"""
        return datetime.now(self.seoul_tz)
        
    @retry(
        stop=stop_after_attempt(3),  # 재시도 횟수 감소
        wait=wait_exponential(multiplier=1, min=1, max=5),  # 대기 시간 감소
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def fetch_page(self, session: aiohttp.ClientSession, page: int) -> str:
        """페이지 크롤링"""
        async with self.semaphore:
            try:
                url = f"{self.base_url}?rt=manager&n4pageno={page}"
                async with session.get(url, timeout=20) as response:  # 타임아웃 20초로 증가
                    if response.status == 200:
                        return await response.text()
                    else:
                        logger.error(f"페이지 {page} 크롤링 실패: HTTP {response.status}")
                        raise Exception(f"HTTP {response.status}")
            except Exception as e:
                logger.error(f"페이지 {page} 크롤링 중 에러: {str(e)}")
                raise
                
    def parse_rankers(self, html: str) -> List[Dict]:
        """HTML에서 랭커 정보 파싱"""
        soup = BeautifulSoup(html, "html.parser")
        rankers = []
        
        try:
            ranker_list = soup.select("div.tbody div.tr")
            if not ranker_list:
                logger.warning("랭커 목록을 찾을 수 없습니다")
                return rankers

            for tr in ranker_list:
                try:
                    # 순위
                    rank_elem = tr.select_one("span.td.rank_no")
                    if not rank_elem:
                        continue
                    rank_no = int(rank_elem.text.strip())
                    
                    # 닉네임과 coach_sn
                    name_elem = tr.select_one("span.td.rank_coach span.name.profile_pointer")
                    if not name_elem:
                        continue
                    coach_name = name_elem.text.strip()
                    coach_sn = name_elem.get("data-sn", "")
                    
                    # 레벨
                    lv_elem = tr.select_one("span.td.rank_coach span.lv span.txt")
                    coach_lv = int(lv_elem.text.strip()) if lv_elem else 1
                    
                    # 랭킹 점수
                    point_elem = tr.select_one("span.td.rank_r_win_point")
                    if not point_elem:
                        continue
                    elo = float(point_elem.text.strip())
                    
                    # 구단 가치
                    value_elem = tr.select_one("span.td.rank_coach span.price")
                    if not value_elem or "alt" not in value_elem.attrs:
                        continue
                    value_alt = value_elem["alt"]
                    price = int(re.sub(r'[^\d]', '', value_alt))
                    
                    # 승률 정보
                    win_rate_elem = tr.select_one("span.td.rank_before span.top")
                    match_info_elem = tr.select_one("span.td.rank_before span.bottom")
                    if not win_rate_elem or not match_info_elem:
                        continue
                        
                    win_rate = float(win_rate_elem.text.strip().replace("%", ""))
                    match_info = match_info_elem.text.strip()
                    match_numbers = re.findall(r'\d+', match_info)
                    if len(match_numbers) != 3:
                        continue
                    wins, draws, losses = map(int, match_numbers)
                    
                    # 팀 컬러
                    team_color_elem = tr.select_one("span.td.team_color span.name span.inner")
                    team_color = team_color_elem.text.strip() if team_color_elem else "-"
                    
                    # 포메이션
                    formation_elem = tr.select_one("span.td.formation")
                    if not formation_elem:
                        continue
                    formation = formation_elem.text.strip()
                    
                    # 등급 정보
                    current_grade_elem = tr.select_one("span.td.rank_best span.ico_rank:first-child img")
                    best_grade_elem = tr.select_one("span.td.rank_best span.ico_rank:last-child img")
                    current_grade = current_grade_elem.get("src", "").split("/")[-1].replace(".png", "") if current_grade_elem else "ico_rank0"
                    best_grade = best_grade_elem.get("src", "").split("/")[-1].replace(".png", "") if best_grade_elem else "ico_rank0"

                    ranker = {
                        "rank_no": rank_no,
                        "coach_name": coach_name,
                        "coach_sn": coach_sn,
                        "coach_lv": coach_lv,
                        "price": price,
                        "elo": elo,
                        "win_rate": win_rate,
                        "wins": wins,
                        "draws": draws,
                        "losses": losses,
                        "team_color": team_color,
                        "formation": formation,
                        "current_grade": current_grade,
                        "best_grade": best_grade,
                        "crawled_at": self.get_current_time().isoformat()
                    }
                    rankers.append(ranker)
                    
                except Exception as e:
                    logger.error(f"랭커 정보 파싱 중 에러: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"HTML 파싱 중 에러: {str(e)}")
            
        return rankers
        
    async def crawl_all_pages(self) -> List[Dict]:
        """모든 페이지 크롤링"""
        all_rankers = []
        total_pages = 500
        batch_size = 100  # 배치 크기를 100개로 증가
        
        async with aiohttp.ClientSession() as session:
            for start_page in range(1, total_pages + 1, batch_size):
                end_page = min(start_page + batch_size - 1, total_pages)
                tasks = []
                
                for page in range(start_page, end_page + 1):
                    tasks.append(self.fetch_page(session, page))
                    
                try:
                    pages_html = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for page, html in zip(range(start_page, end_page + 1), pages_html):
                        if isinstance(html, Exception):
                            logger.error(f"페이지 {page} 크롤링 실패: {str(html)}")
                            self.failed_pages.add(page)
                            continue
                            
                        rankers = self.parse_rankers(html)
                        if len(rankers) < 20:  # 페이지당 20명이 아닌 경우 실패로 처리
                            logger.error(f"페이지 {page} 크롤링 불완전: {len(rankers)}/20")
                            self.failed_pages.add(page)
                            continue
                            
                        all_rankers.extend(rankers)
                        
                    logger.info(f"{start_page} ~ {end_page} 페이지 크롤링 완료({len(all_rankers):,}/10,000)")
                    
                except Exception as e:
                    logger.error(f"배치 크롤링 중 에러: {str(e)}")
                    
        return all_rankers
        
    async def retry_failed_pages(self) -> List[Dict]:
        """실패한 페이지 재시도"""
        if not self.failed_pages:
            return []
            
        retry_rankers = []
        logger.info(f"크롤링 실패 페이지 {sorted(list(self.failed_pages))}")
        
        for retry_count in range(4):  # 재시도 횟수 4회로 증가
            async with aiohttp.ClientSession() as session:
                tasks = []
                for page in self.failed_pages:
                    tasks.append(self.fetch_page(session, page))
                    
                try:
                    pages_html = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for page, html in zip(self.failed_pages, pages_html):
                        if isinstance(html, Exception):
                            continue
                            
                        rankers = self.parse_rankers(html)
                        if len(rankers) < 20:  # 페이지당 20명이 아닌 경우 실패로 처리
                            continue
                            
                        retry_rankers.extend(rankers)
                        
                    logger.info(f"크롤링 재시도 완료({retry_count + 1}/4)")
                    
                except Exception as e:
                    logger.error(f"재시도 중 에러: {str(e)}")
                    
        return retry_rankers 