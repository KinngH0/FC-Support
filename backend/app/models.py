from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RankerMeta(BaseModel):
    rank_no: int = Field(..., description="순위")
    coach_name: str = Field(..., description="구단주명")
    coach_sn: str = Field(..., description="구단주 고유번호")
    coach_lv: int = Field(..., description="구단주 레벨")
    price: int = Field(..., description="구단 가치")
    elo: float = Field(..., description="랭킹 점수")
    win_rate: float = Field(..., description="승률")
    wins: int = Field(..., description="승리 수")
    draws: int = Field(..., description="무승부 수")
    losses: int = Field(..., description="패배 수")
    team_color: str = Field(..., description="팀컬러")
    formation: str = Field(..., description="포메이션")
    current_grade: str = Field(..., description="현재 등급")
    best_grade: str = Field(..., description="최고 등급")
    crawled_at: datetime = Field(..., description="크롤링 시점")
    match_detail: Optional[str] = Field(None, description="매치 상세 정보(JSON)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "rank_no": 1,
                "coach_name": "Gucci인섹",
                "coach_sn": "937649334",
                "coach_lv": 5846,
                "price": 213695815130540,
                "elo": 4555.46,
                "win_rate": 45.2,
                "wins": 485,
                "draws": 176,
                "losses": 412,
                "team_color": "유벤투스",
                "formation": "5-1-2-2",
                "current_grade": "ico_rank0",
                "best_grade": "ico_rank0",
                "crawled_at": "2024-05-14T20:00:00"
            }
        }
    } 