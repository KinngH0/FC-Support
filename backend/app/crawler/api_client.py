import aiohttp
import asyncio
from typing import List, Dict, Set, Tuple
import os
from dotenv import load_dotenv
from ..logger import logger
from tenacity import retry, stop_after_attempt, wait_exponential
import json
from sqlalchemy import text
from datetime import datetime

load_dotenv()

class APIClient:
    def __init__(self):
        self.base_url = "https://open.api.nexon.com/fconline/v1"
        self.api_keys = [
            os.getenv("API_KEY_1"),
            os.getenv("API_KEY_2"),
            os.getenv("API_KEY_3"),
            os.getenv("API_KEY_4")
        ]
        self.current_key_index = 0
        self.semaphore = asyncio.Semaphore(50)
        self.success_nicknames = set()  # 성공한 닉네임 집합
        self.total_count = 0
        self.failed_users = []  # (nickname, 단계)
        
    def get_next_api_key(self) -> str:
        """다음 API 키 반환"""
        key = self.api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def get_ouid(self, session: aiohttp.ClientSession, nickname: str) -> str:
        """닉네임으로 OUID 조회"""
        async with self.semaphore:
            try:
                url = f"{self.base_url}/id"
                headers = {"x-nxopen-api-key": self.get_next_api_key()}
                params = {"nickname": nickname}
                async with session.get(url, headers=headers, params=params, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("ouid", "")
                    else:
                        raise Exception(f"HTTP {response.status}")
            except Exception as e:
                raise Exception(f"OUID: {str(e)}")
                
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def get_match_id(self, session: aiohttp.ClientSession, ouid: str, nickname: str) -> str:
        """OUID로 최근 매치 ID 조회"""
        async with self.semaphore:
            try:
                url = f"{self.base_url}/match"
                headers = {"x-nxopen-api-key": self.get_next_api_key()}
                params = {
                    "ouid": ouid,
                    "matchtype": 52,
                    "offset": 0,
                    "limit": 1,
                    "orderby": "desc"
                }
                async with session.get(url, headers=headers, params=params, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data[0] if data else ""
                    else:
                        raise Exception(f"HTTP {response.status}")
            except Exception as e:
                raise Exception(f"MATCH ID: {str(e)}")
                
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def get_match_detail(self, session: aiohttp.ClientSession, match_id: str, nickname: str) -> Dict:
        """매치 ID로 매치 상세 정보 조회"""
        async with self.semaphore:
            try:
                url = f"{self.base_url}/match-detail"
                headers = {"x-nxopen-api-key": self.get_next_api_key()}
                params = {"matchid": match_id}
                async with session.get(url, headers=headers, params=params, timeout=5) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        raise Exception(f"HTTP {response.status}")
            except Exception as e:
                raise Exception(f"MATCH DETAIL: {str(e)}")
                
    def parse_match_detail(self, match_detail: Dict) -> Tuple[Dict, List[Dict]]:
        """매치 상세 정보 파싱
        
        Returns:
            Tuple[Dict, List[Dict]]: (match_summary, player_stats)
        """
        try:
            # match_summary 파싱
            match_summary = {
                "match_id": match_detail.get("matchId", ""),
                "match_date": match_detail.get("matchDate", ""),
                "match_type": match_detail.get("matchType", ""),
                "ouid": match_detail.get("ouid", ""),
                "nickname": match_detail.get("nickname", ""),
                "matchResult": match_detail.get("matchResult", ""),
                "controller": match_detail.get("controller", ""),
                "possession": match_detail.get("possession", 0),
                "averageRating": match_detail.get("averageRating", 0.0),
                "shoot_total": match_detail.get("shoot", {}).get("shootTotal", 0),
                "shoot_effective": match_detail.get("shoot", {}).get("effectiveShootTotal", 0),
                "goal_total": match_detail.get("shoot", {}).get("goalTotal", 0),
                "pass_try": match_detail.get("pass", {}).get("passTry", 0),
                "pass_success": match_detail.get("pass", {}).get("passSuccess", 0),
                "tackle_try": match_detail.get("tackle", {}).get("tackleTry", 0),
                "tackle_success": match_detail.get("tackle", {}).get("tackleSuccess", 0),
                "created_at": datetime.now().isoformat()
            }
            
            # player_stats 파싱
            player_stats = []
            for player in match_detail.get("player", []):
                stats = {
                    "match_id": match_detail.get("matchId", ""),
                    "ouid": match_detail.get("ouid", ""),
                    "spid": player.get("spId", ""),
                    "sp_grade": player.get("spGrade", 0),
                    "sp_level": player.get("spLevel", 0),
                    "spPosition": player.get("spPosition", ""),
                    "shoot": player.get("shoot", 0),
                    "goal": player.get("goal", 0),
                    "assist": player.get("assist", 0),
                    "pass_try": player.get("passTry", 0),
                    "pass_success": player.get("passSuccess", 0),
                    "dribble_try": player.get("dribbleTry", 0),
                    "dribble_success": player.get("dribbleSuccess", 0),
                    "sp_rating": player.get("spRating", 0.0),
                    "created_at": datetime.now().isoformat()
                }
                player_stats.append(stats)
                
            return match_summary, player_stats
            
        except Exception as e:
            logger.error(f"매치 상세 정보 파싱 중 에러: {str(e)}")
            raise

    async def process_ranker(self, session: aiohttp.ClientSession, ranker: Dict, fail_list=None) -> Dict:
        """랭커 정보 처리"""
        nickname = ranker["coach_name"]
        try:
            ouid = await self.get_ouid(session, nickname)
            if not ouid:
                raise Exception("OUID: empty")
            match_id = await self.get_match_id(session, ouid, nickname)
            if not match_id:
                raise Exception("MATCH ID: empty")
            match_detail = await self.get_match_detail(session, match_id, nickname)
            if not match_detail:
                raise Exception("MATCH DETAIL: empty")
            ranker["match_detail"] = json.dumps(match_detail, ensure_ascii=False)
            # 성공한 닉네임만 set에 추가, 200명 단위로만 로그
            if nickname not in self.success_nicknames:
                self.success_nicknames.add(nickname)
                if len(self.success_nicknames) % 200 == 0:
                    logger.info(f"API 호출 완료 ({len(self.success_nicknames)}/{self.total_count})")
            # 실패 리스트에서 성공한 닉네임 제거 (재시도 성공 시)
            if fail_list is not None and (nickname, "OUID") in fail_list:
                fail_list.remove((nickname, "OUID"))
            if fail_list is not None and (nickname, "MATCH ID") in fail_list:
                fail_list.remove((nickname, "MATCH ID"))
            if fail_list is not None and (nickname, "MATCH DETAIL") in fail_list:
                fail_list.remove((nickname, "MATCH DETAIL"))
            return ranker
        except Exception as e:
            fail_reason = str(e)
            fail_stage = "OUID" if "OUID" in fail_reason else ("MATCH ID" if "MATCH ID" in fail_reason else "MATCH DETAIL")
            if fail_list is not None:
                fail_list.append((nickname, fail_stage))
            else:
                self.failed_users.append((nickname, fail_stage))
            logger.debug(f"API 호출 실패 - {nickname}({fail_stage})")
            return ranker
            
    async def process_all_rankers(self, rankers: List[Dict]) -> List[Dict]:
        """모든 랭커 처리"""
        self.success_nicknames = set()
        self.failed_users = []
        self.total_count = len(rankers)
        processed_rankers = []
        batch_size = 200
        
        async with aiohttp.ClientSession() as session:
            for i in range(0, len(rankers), batch_size):
                batch = rankers[i:i + batch_size]
                tasks = [self.process_ranker(session, ranker) for ranker in batch]
                
                try:
                    batch_results = await asyncio.gather(*tasks)
                    processed_rankers.extend(batch_results)
                except Exception as e:
                    logger.error(f"배치 처리 중 에러: {str(e)}")
        # 전체 통계 요약
        logger.info(f"API 호출 완료 ({len(self.success_nicknames)}/{self.total_count})")
        if self.failed_users:
            logger.info(f"API 호출 1차 실패 ({len(self.failed_users)}/{self.total_count}) - {', '.join([f'{n}({s})' for n,s in self.failed_users])}")
        # 1차 실패 유저 2회 재시도
        retry_success = 0
        retry_fail = []
        if self.failed_users:
            retry_list = []
            for nickname, _ in self.failed_users:
                ranker = next((r for r in rankers if r["coach_name"] == nickname), None)
                if ranker:
                    retry_list.append(ranker)
            async with aiohttp.ClientSession() as session:
                for ranker in retry_list:
                    retry_fail_list = []
                    result = await self.process_ranker(session, ranker, fail_list=retry_fail_list)
                    if not retry_fail_list and ranker["coach_name"] in self.success_nicknames:
                        retry_success += 1
                    else:
                        retry_fail.extend(retry_fail_list)
            logger.info(f"API 호출 1차 재시도 완료 ({retry_success}/{len(retry_list)})")
            if retry_fail:
                logger.info(f"API 호출 1차 재시도 실패 ({len(retry_fail)}/{len(retry_list)}) - {', '.join([f'{n}({s})' for n,s in retry_fail])}")
        return processed_rankers
        
    async def retry_failed_rankers(self, rankers: List[Dict]) -> List[Dict]:
        """실패한 랭커 재시도"""
        if not self.failed_users:
            return rankers
            
        retry_rankers = []
        failed_names = sorted(list(set(nickname for nickname, _ in self.failed_users)))
        logger.info(f"API 호출 실패 랭커 {failed_names}")
        
        for retry_count in range(2):  # 2회 재시도
            async with aiohttp.ClientSession() as session:
                tasks = []
                for ranker in rankers:
                    if ranker["coach_name"] in failed_names:
                        tasks.append(self.process_ranker(session, ranker))
                    else:
                        retry_rankers.append(ranker)
                        
                try:
                    retry_results = await asyncio.gather(*tasks)
                    retry_rankers.extend(retry_results)
                    logger.info(f"API 호출 재시도 완료({retry_count + 1}/2)")
                    
                except Exception as e:
                    logger.error(f"재시도 중 에러: {str(e)}")
                    
        return retry_rankers 

    async def save_rankers(self, rankers: List[Dict]):
        try:
            async with self.engine.begin() as conn:
                for ranker in rankers:
                    try:
                        await conn.execute(
                            text("""
                                INSERT INTO rankers_a (
                                    nickname,
                                    ouid,
                                    match_id,
                                    rank,
                                    created_at
                                ) VALUES (
                                    :nickname,
                                    :ouid,
                                    :match_id,
                                    :rank,
                                    CURRENT_TIMESTAMP
                                )
                            """),
                            {
                                "nickname": ranker["nickname"],
                                "ouid": ranker["ouid"],
                                "match_id": ranker["match_id"],
                                "rank": ranker["rank"]
                            }
                        )
                    except Exception as e:
                        logger.error(f"랭커 저장 중 에러: {str(e)}")
                        continue
        except Exception as e:
            logger.error(f"랭커 저장 중 에러: {str(e)}") 