import aiosqlite
import logging
from typing import List, Dict
from datetime import datetime
from ..models import RankerMeta

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "data/fc_support.db"):
        self.db_path = db_path
        self.current_table = "rankers_a"  # A/B 테이블 전환용
        
    async def init(self):
        """데이터베이스 초기화"""
        async with aiosqlite.connect(self.db_path) as db:
            # A/B 테이블 생성
            for table in ["rankers_a", "rankers_b"]:
                await db.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table} (
                        rank_no INTEGER,
                        coach_name TEXT,
                        coach_sn TEXT PRIMARY KEY,
                        coach_lv INTEGER,
                        price INTEGER,
                        elo REAL,
                        win_rate REAL,
                        wins INTEGER,
                        draws INTEGER,
                        losses INTEGER,
                        team_color TEXT,
                        formation TEXT,
                        current_grade TEXT,
                        best_grade TEXT,
                        crawled_at TEXT,
                        match_detail TEXT,
                        UNIQUE(coach_sn)
                    )
                """)
            
            # match_summary 테이블 생성
            await db.execute("""
                CREATE TABLE IF NOT EXISTS match_summary (
                    match_id TEXT PRIMARY KEY,
                    match_date TEXT,
                    match_type TEXT,
                    ouid TEXT,
                    nickname TEXT,
                    matchResult TEXT,
                    controller TEXT,
                    possession INTEGER,
                    averageRating REAL,
                    shoot_total INTEGER,
                    shoot_effective INTEGER,
                    goal_total INTEGER,
                    pass_try INTEGER,
                    pass_success INTEGER,
                    tackle_try INTEGER,
                    tackle_success INTEGER,
                    created_at TEXT
                )
            """)
            
            # player_stats 테이블 생성
            await db.execute("""
                CREATE TABLE IF NOT EXISTS player_stats (
                    match_id TEXT,
                    ouid TEXT,
                    spid TEXT,
                    sp_grade INTEGER,
                    sp_level INTEGER,
                    spPosition TEXT,
                    shoot INTEGER,
                    goal INTEGER,
                    assist INTEGER,
                    pass_try INTEGER,
                    pass_success INTEGER,
                    dribble_try INTEGER,
                    dribble_success INTEGER,
                    sp_rating REAL,
                    created_at TEXT,
                    PRIMARY KEY (match_id, spid)
                )
            """)
            
            await db.commit()
            
    async def switch_table(self):
        """A/B 테이블 전환"""
        self.current_table = "rankers_b" if self.current_table == "rankers_a" else "rankers_a"
        logger.info(f"테이블 전환: {self.current_table}")
        
    async def save_rankers(self, rankers: List[Dict]):
        """랭커 정보 저장"""
        if not rankers:
            return
            
        async with aiosqlite.connect(self.db_path) as db:
            # 기존 테이블 비우기
            await db.execute(f"DELETE FROM {self.current_table}")
            
            # 새 데이터 삽입
            current_time = datetime.now().isoformat()
            for ranker in rankers:
                try:
                    # Pydantic 모델로 검증
                    ranker_meta = RankerMeta(**ranker)
                    
                    await db.execute(f"""
                        INSERT INTO {self.current_table} (
                            rank_no, coach_name, coach_sn, coach_lv, price,
                            elo, win_rate, wins, draws, losses,
                            team_color, formation, current_grade, best_grade, crawled_at, match_detail
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        ranker_meta.rank_no,
                        ranker_meta.coach_name,
                        ranker_meta.coach_sn,
                        ranker_meta.coach_lv,
                        ranker_meta.price,
                        ranker_meta.elo,
                        ranker_meta.win_rate,
                        ranker_meta.wins,
                        ranker_meta.draws,
                        ranker_meta.losses,
                        ranker_meta.team_color,
                        ranker_meta.formation,
                        ranker_meta.current_grade,
                        ranker_meta.best_grade,
                        current_time,
                        ranker_meta.match_detail
                    ))
                except Exception as e:
                    logger.error(f"랭커 저장 중 에러: {str(e)}")
                    continue
                    
            await db.commit()
            
    async def get_rankers(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """랭커 정보 조회"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(f"""
                SELECT * FROM {self.current_table}
                ORDER BY rank_no ASC
                LIMIT ? OFFSET ?
            """, (limit, offset)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
                
    async def get_ranker_by_sn(self, coach_sn: str) -> Dict:
        """구단주 고유번호로 랭커 정보 조회"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(f"""
                SELECT * FROM {self.current_table}
                WHERE coach_sn = ?
            """, (coach_sn,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_last_crawled_at(self) -> str:
        """마지막 크롤링 시간 조회"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(f"""
                SELECT crawled_at FROM {self.current_table}
                ORDER BY crawled_at DESC
                LIMIT 1
            """) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else None

    async def save_match_summary(self, match_summary: Dict):
        """매치 요약 정보 저장"""
        if not match_summary:
            return
            
        async with aiosqlite.connect(self.db_path) as db:
            try:
                await db.execute("""
                    INSERT OR REPLACE INTO match_summary (
                        match_id, match_date, match_type, ouid, nickname,
                        matchResult, controller, possession, averageRating,
                        shoot_total, shoot_effective, goal_total,
                        pass_try, pass_success, tackle_try, tackle_success,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    match_summary["match_id"],
                    match_summary["match_date"],
                    match_summary["match_type"],
                    match_summary["ouid"],
                    match_summary["nickname"],
                    match_summary["matchResult"],
                    match_summary["controller"],
                    match_summary["possession"],
                    match_summary["averageRating"],
                    match_summary["shoot_total"],
                    match_summary["shoot_effective"],
                    match_summary["goal_total"],
                    match_summary["pass_try"],
                    match_summary["pass_success"],
                    match_summary["tackle_try"],
                    match_summary["tackle_success"],
                    match_summary["created_at"]
                ))
                await db.commit()
            except Exception as e:
                logger.error(f"매치 요약 정보 저장 중 에러: {str(e)}")
                raise

    async def save_player_stats(self, player_stats: List[Dict]):
        """선수 통계 정보 저장"""
        if not player_stats:
            return
            
        async with aiosqlite.connect(self.db_path) as db:
            try:
                for stats in player_stats:
                    await db.execute("""
                        INSERT OR REPLACE INTO player_stats (
                            match_id, ouid, spid, sp_grade, sp_level,
                            spPosition, shoot, goal, assist,
                            pass_try, pass_success, dribble_try, dribble_success,
                            sp_rating, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        stats["match_id"],
                        stats["ouid"],
                        stats["spid"],
                        stats["sp_grade"],
                        stats["sp_level"],
                        stats["spPosition"],
                        stats["shoot"],
                        stats["goal"],
                        stats["assist"],
                        stats["pass_try"],
                        stats["pass_success"],
                        stats["dribble_try"],
                        stats["dribble_success"],
                        stats["sp_rating"],
                        stats["created_at"]
                    ))
                await db.commit()
            except Exception as e:
                logger.error(f"선수 통계 정보 저장 중 에러: {str(e)}")
                raise

    async def get_match_summaries(self, page: int = 0, limit: int = 10, nickname: str = "", ouid: str = ""):
        try:
            query = """
                SELECT * FROM match_summary
                WHERE 1=1
            """
            params = []
            
            if nickname:
                query += " AND nickname LIKE ?"
                params.append(f"%{nickname}%")
            
            if ouid:
                query += " AND ouid = ?"
                params.append(ouid)
                
            query += " ORDER BY match_date DESC LIMIT ? OFFSET ?"
            params.extend([limit, page * limit])
            
            async with aiosqlite.connect(self.db_path) as db:
                async with db.cursor() as cursor:
                    await cursor.execute(query, params)
                    columns = [col[0] for col in cursor.description]
                    rows = await cursor.fetchall()
                    return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"매치 요약 조회 중 에러 발생: {str(e)}")
            raise

    async def get_player_stats(self, match_id: str):
        try:
            query = """
                SELECT * FROM player_stats
                WHERE match_id = ?
                ORDER BY sp_rating DESC
            """
            
            async with aiosqlite.connect(self.db_path) as db:
                async with db.cursor() as cursor:
                    await cursor.execute(query, (match_id,))
                    columns = [col[0] for col in cursor.description]
                    rows = await cursor.fetchall()
                    return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"선수 통계 조회 중 에러 발생: {str(e)}")
            raise 