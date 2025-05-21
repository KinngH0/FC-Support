import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Stack
} from '@mui/material';

const Database = () => {
  const [matchSummaries, setMatchSummaries] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchNickname, setSearchNickname] = useState("");
  const [searchOuid, setSearchOuid] = useState("");

  useEffect(() => {
    fetchMatchSummaries();
  }, [page, rowsPerPage, searchNickname, searchOuid]);

  useEffect(() => {
    if (selectedMatchId) {
      fetchPlayerStats(selectedMatchId);
    }
  }, [selectedMatchId]);

  const fetchMatchSummaries = async () => {
    try {
      const response = await fetch(`/api/admin/db/match?page=${page}&limit=${rowsPerPage}&nickname=${searchNickname}&ouid=${searchOuid}`);
      const data = await response.json();
      setMatchSummaries(data);
    } catch (error) {
      console.error("매치 요약 정보 조회 중 에러:", error);
    }
  };

  const fetchPlayerStats = async (matchId) => {
    try {
      const response = await fetch(`/api/admin/db/player?match_id=${matchId}`);
      const data = await response.json();
      setPlayerStats(data);
    } catch (error) {
      console.error("선수 통계 정보 조회 중 에러:", error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          데이터베이스
        </Typography>
      </Box>

      <Typography variant="h6">매치 요약 정보</Typography>
      <Divider sx={{ my: 1 }} />
      
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="닉네임 검색"
          value={searchNickname}
          onChange={(e) => setSearchNickname(e.target.value)}
        />
        <TextField
          size="small"
          label="OUID 검색"
          value={searchOuid}
          onChange={(e) => setSearchOuid(e.target.value)}
        />
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>매치 ID</TableCell>
              <TableCell>날짜</TableCell>
              <TableCell>닉네임</TableCell>
              <TableCell>결과</TableCell>
              <TableCell>점유율</TableCell>
              <TableCell>평균 평점</TableCell>
              <TableCell>슈팅</TableCell>
              <TableCell>골</TableCell>
              <TableCell>패스</TableCell>
              <TableCell>태클</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matchSummaries.map((match) => (
              <TableRow
                key={match.match_id}
                hover
                onClick={() => setSelectedMatchId(match.match_id)}
                selected={selectedMatchId === match.match_id}
              >
                <TableCell>{match.match_id}</TableCell>
                <TableCell>{match.match_date}</TableCell>
                <TableCell>{match.nickname}</TableCell>
                <TableCell>{match.matchResult}</TableCell>
                <TableCell>{match.possession}%</TableCell>
                <TableCell>{match.averageRating.toFixed(2)}</TableCell>
                <TableCell>{match.shoot_total}/{match.shoot_effective}</TableCell>
                <TableCell>{match.goal_total}</TableCell>
                <TableCell>{match.pass_success}/{match.pass_try}</TableCell>
                <TableCell>{match.tackle_success}/{match.tackle_try}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={-1}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {selectedMatchId && (
        <>
          <Typography variant="h6" sx={{ mt: 4 }}>선수 통계 정보</Typography>
          <Divider sx={{ my: 1 }} />
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>선수 ID</TableCell>
                  <TableCell>등급</TableCell>
                  <TableCell>레벨</TableCell>
                  <TableCell>포지션</TableCell>
                  <TableCell>슈팅</TableCell>
                  <TableCell>골</TableCell>
                  <TableCell>도움</TableCell>
                  <TableCell>패스</TableCell>
                  <TableCell>드리블</TableCell>
                  <TableCell>평점</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {playerStats.map((player) => (
                  <TableRow key={`${player.match_id}-${player.spid}`}>
                    <TableCell>{player.spid}</TableCell>
                    <TableCell>{player.sp_grade}</TableCell>
                    <TableCell>{player.sp_level}</TableCell>
                    <TableCell>{player.spPosition}</TableCell>
                    <TableCell>{player.shoot}</TableCell>
                    <TableCell>{player.goal}</TableCell>
                    <TableCell>{player.assist}</TableCell>
                    <TableCell>{player.pass_success}/{player.pass_try}</TableCell>
                    <TableCell>{player.dribble_success}/{player.dribble_try}</TableCell>
                    <TableCell>{player.sp_rating.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default Database;