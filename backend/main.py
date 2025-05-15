import asyncio
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from app.database.database import Database
from app.crawler.rank_crawler import RankCrawler
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache
from app.scheduler import Scheduler
from app.logger import logger

load_dotenv()

app = FastAPI(
    title="FC Support API",
    description="FC 온라인 랭커 정보 수집 및 조회 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 인스턴스
db = Database()

# 캐시 설정
CACHE_TTL = 300  # 5분

# 스케줄러 인스턴스
scheduler = Scheduler()

@lru_cache(maxsize=100)
def get_cached_rankers(limit: int, offset: int) -> Dict:
    """랭커 목록 캐싱"""
    return asyncio.run(db.get_rankers(limit, offset))

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 데이터베이스 초기화 및 스케줄러 시작"""
    try:
        await db.init()
        logger.info("데이터베이스 초기화 완료")
        
        # 스케줄러 시작
        asyncio.create_task(scheduler.start())
        logger.info("크롤링 스케줄러 시작")
        
    except Exception as e:
        logger.error(f"서버 시작 실패: {str(e)}")
        raise e

@app.get("/")
async def root():
    return {"message": "FC Support API"}

@app.get("/api/rankers", response_model=Dict)
async def get_rankers(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """랭커 목록 조회"""
    try:
        # 캐시된 데이터 사용
        rankers = get_cached_rankers(limit, offset)
        last_crawled_at = await db.get_last_crawled_at()
        
        return {
            "status": "success",
            "data": {
                "rankers": rankers,
                "last_crawled_at": last_crawled_at
            }
        }
    except Exception as e:
        logger.error(f"랭커 목록 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="랭커 목록을 가져오는 중 오류가 발생했습니다"
        )

@app.get("/api/rankers/{coach_sn}", response_model=Dict)
async def get_ranker(coach_sn: str):
    """특정 랭커 정보 조회"""
    try:
        ranker = await db.get_ranker_by_sn(coach_sn)
        if not ranker:
            raise HTTPException(
                status_code=404,
                detail=f"랭커를 찾을 수 없습니다: {coach_sn}"
            )
        return {
            "status": "success",
            "data": ranker
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"랭커 정보 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="랭커 정보를 가져오는 중 오류가 발생했습니다"
        )

@app.post("/api/crawl/start")
async def start_crawling():
    """크롤링 시작"""
    try:
        async with RankCrawler(db) as crawler:
            await crawler.crawl_all()
        # 캐시 초기화
        get_cached_rankers.cache_clear()
        return {
            "status": "success",
            "message": "크롤링이 시작되었습니다"
        }
    except Exception as e:
        logger.error(f"크롤링 시작 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="크롤링을 시작하는 중 오류가 발생했습니다"
        )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 처리"""
    logger.error(f"예상치 못한 오류 발생: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "서버 내부 오류가 발생했습니다"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 