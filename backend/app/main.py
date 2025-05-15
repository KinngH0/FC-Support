from app.database.database import get_match_summaries, get_player_stats

@app.get("/api/admin/db/match")
async def get_matches(
    page: int = 0,
    limit: int = 10,
    nickname: str = "",
    ouid: str = ""
):
    try:
        matches = await get_match_summaries(page, limit, nickname, ouid)
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/db/player")
async def get_players(match_id: str):
    try:
        players = await get_player_stats(match_id)
        return players
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 