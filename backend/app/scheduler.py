import asyncio
from datetime import datetime, timedelta
import pytz
from .crawler.rank_crawler import RankCrawler
from .crawler.api_client import APIClient
from .database.database import Database
from .logger import logger

class Scheduler:
    def __init__(self):
        self.seoul_tz = pytz.timezone('Asia/Seoul')
        self.crawler = RankCrawler()
        self.api_client = APIClient()
        self.db = Database()
        
    def get_next_run_time(self) -> datetime:
        """다음 실행 시간 계산"""
        now = datetime.now(self.seoul_tz)
        next_hour = now.replace(minute=10, second=0, microsecond=0)
        if now >= next_hour:
            next_hour = (now + timedelta(hours=1)).replace(minute=10, second=0, microsecond=0)
        return next_hour
        
    async def run_crawling(self):
        """크롤링 및 API 호출 실행"""
        try:
            # 크롤링
            logger.info("FC Support 백엔드 서버 시작")
            rankers = await self.crawler.crawl_all_pages()
            
            # 실패한 페이지 재시도
            if self.crawler.failed_pages:
                retry_rankers = await self.crawler.retry_failed_pages()
                rankers.extend(retry_rankers)
                
            # API 호출
            processed_rankers = await self.api_client.process_all_rankers(rankers)
            
            # 실패한 API 호출 재시도
            if hasattr(self.api_client, 'failed_users') and self.api_client.failed_users:
                processed_rankers = await self.api_client.retry_failed_rankers(processed_rankers)
                
            # DB 저장
            await self.db.save_rankers(processed_rankers)
            logger.info(f"10,000명 크롤링 결과 DB-{self.db.current_table}에 저장 완료")
            
        except Exception as e:
            logger.error(f"크롤링 실행 중 에러: {str(e)}")
            
    async def start(self):
        """스케줄러 시작"""
        await self.db.init()
        
        while True:
            try:
                # 즉시 첫 실행
                await self.run_crawling()
                
                # 다음 실행 시간까지 대기
                next_run = self.get_next_run_time()
                wait_seconds = (next_run - datetime.now(self.seoul_tz)).total_seconds()
                logger.info(f"다음 실행 예정: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
                await asyncio.sleep(wait_seconds)
                
            except Exception as e:
                logger.error(f"스케줄러 실행 중 에러: {str(e)}")
                await asyncio.sleep(60)  # 에러 발생 시 1분 대기 