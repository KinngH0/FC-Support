import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Autocomplete,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import { teamColors } from "../constants/teamColors";
import axios from "axios";
import { useTheme } from "../contexts/ThemeContext";

const PickRate = () => {
  const { isDarkMode } = useTheme();

  const [form, setForm] = useState({
    rankRange: "",
    teamColor: "",
    topN: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  // 포지션별 정렬 상태 관리
  const [sortConfigs, setSortConfigs] = useState({});

  const [inputTeamColor, setInputTeamColor] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTeamColorChange = (event, newValue) => {
    setForm((prev) => ({
      ...prev,
      teamColor: newValue ? newValue.name : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await axios.get("/api/pick-rate/", {
        params: {
          rank_range: form.rankRange,
          team_color: form.teamColor,
          top_n: form.topN,
        },
      });
      setResults(response.data);
    } catch (error) {
      setError(
        error.response?.data?.error ||
          (error.response?.data ? JSON.stringify(error.response.data) : null) ||
          "데이터를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 정렬 핸들러
  const handleSort = (position, key) => {
    setSortConfigs((prev) => {
      const prevConfig = prev[position] || {
        key: "usage_rate",
        direction: "desc",
      };
      return {
        ...prev,
        [position]: {
          key,
          direction:
            prevConfig.key === key && prevConfig.direction === "asc"
              ? "desc"
              : "asc",
        },
      };
    });
  };

  // 구단가치 변환 함수 수정
  const formatClubValue = (value) => {
    if (!value) return "0";

    const 조 = Math.floor(value / 1000000000000);
    const 억 = Math.floor((value % 1000000000000) / 100000000);
    const 만 = Math.floor((value % 100000000) / 10000);

    let result = "";
    if (조 > 0) result += `${조.toLocaleString()}조 `;
    if (억 > 0) result += `${억.toLocaleString()}억 `;
    if (만 > 0) result += `${만.toLocaleString()}만 `;

    return result.trim();
  };

  const renderResults = () => {
    if (!results) return null;

    const positionOrder = [
      "ST",
      "CF",
      "LW",
      "RW",
      "CAM",
      "RAM",
      "LAM",
      "RM",
      "LM",
      "CM",
      "CDM",
      "CB",
      "LB",
      "RB",
      "GK",
    ];

    const tableHeaderSx = {
      backgroundColor: isDarkMode ? "#23272f" : "#d5d5d5",
      color: isDarkMode ? "#fff" : "#222",
      borderBottom: `1px solid ${isDarkMode ? '#444' : '#999'}`,
      borderRight: `1px solid ${isDarkMode ? '#444' : '#999'}`,
      textAlign: "center",
    };
    const tableCellSx = {
      borderBottom: `1px solid ${isDarkMode ? '#444' : '#999'}`,
      borderRight: `1px solid ${isDarkMode ? '#444' : '#999'}`,
      textAlign: "center",
      color: isDarkMode ? "#fff" : undefined,
      backgroundColor: isDarkMode ? "#181a1b" : undefined,
    };

    return (
      <>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1">
            기준 데이터 : {results.base_date}
          </Typography>
          <Typography variant="body1">
            조회 인원 : {results.manager_count}명
          </Typography>
        </Box>
        {/* 포메이션 순위 테이블 추가 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            포메이션 순위
          </Typography>
          <TableContainer component={Paper} sx={{ background: isDarkMode ? '#181a1b' : undefined }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeaderSx, width: "10%" }}>순위</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "30%" }}>포메이션</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "30%" }}>사용률</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "30%", borderRight: 0 }}>사용자</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.formation_rank.map((formation, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ ...tableCellSx, width: "10%" }}>{formation.rank}</TableCell>
                    <TableCell sx={{ ...tableCellSx, width: "30%" }}>{formation.formation}</TableCell>
                    <TableCell sx={{ ...tableCellSx, width: "30%" }}>{formation.percentage}%({formation.count}명)</TableCell>
                    <TableCell sx={{ ...tableCellSx, width: "30%", borderRight: 0 }}>
                      {formation.top_users ? formation.top_users.join(", ") : ""}
                      {formation.count > 3 && ` 외 ${formation.count - 3}명`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {/* 통계 정보 테이블 추가 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            통계 정보
          </Typography>
          <TableContainer component={Paper} sx={{ background: isDarkMode ? '#181a1b' : undefined }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeaderSx, width: "25%" }}>구분</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "25%" }}>평균</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "25%" }}>최고</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, width: "25%", borderRight: 0 }}>최저</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ ...tableCellSx, width: "25%", fontWeight: "bold" }}>등수</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{results.rank_stats.avg !== null && results.rank_stats.avg !== undefined ? `${Number(results.rank_stats.avg).toLocaleString()}위` : "-"}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{results.rank_stats.max !== null && results.rank_stats.max !== undefined ? `${Number(results.rank_stats.max).toLocaleString()}위 - ${results.rank_stats.max_nickname || ""}` : "-"}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%", borderRight: 0 }}>{results.rank_stats.min !== null && results.rank_stats.min !== undefined ? `${Number(results.rank_stats.min).toLocaleString()}위 - ${results.rank_stats.min_nickname || ""}` : "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ ...tableCellSx, width: "25%", fontWeight: "bold" }}>점수</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{results.score_stats.avg !== null && results.score_stats.avg !== undefined ? `${Number(results.score_stats.avg).toLocaleString()}점` : "-"}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{results.score_stats.max !== null && results.score_stats.max !== undefined ? `${Number(results.score_stats.max).toLocaleString()}점 - ${results.score_stats.max_nickname || ""}` : "-"}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%", borderRight: 0 }}>{results.score_stats.min !== null && results.score_stats.min !== undefined ? `${Number(results.score_stats.min).toLocaleString()}점 - ${results.score_stats.min_nickname || ""}` : "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ ...tableCellSx, width: "25%", fontWeight: "bold" }}>구단가치</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{formatClubValue(results.club_value_stats.avg)}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%" }}>{formatClubValue(results.club_value_stats.max)} - {results.club_value_stats.max_nickname}</TableCell>
                  <TableCell sx={{ ...tableCellSx, width: "25%", borderRight: 0 }}>{formatClubValue(results.club_value_stats.min)} - {results.club_value_stats.min_nickname}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {/* 포지션별 테이블 */}
        {positionOrder.map((position) => {
          const positionData = results[position];
          if (!positionData) return null;
          const sortConfig = sortConfigs[position] || {
            key: "usage_rate",
            direction: "desc",
          };
          const sortedData = [...positionData].sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue = a[key];
            let bValue = b[key];
            if (key === "usage_rate" || key === "grade" || key === "rank") {
              aValue = Number(aValue);
              bValue = Number(bValue);
            }
            if (aValue < bValue) return direction === "asc" ? -1 : 1;
            if (aValue > bValue) return direction === "asc" ? 1 : -1;
            return 0;
          });
          const getSortArrow = (colKey) => {
            if (sortConfig.key !== colKey) return "";
            return sortConfig.direction === "asc" ? " ▲" : " ▼";
          };
          return (
            <Box key={position} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                {position}
              </Typography>
              <TableContainer component={Paper} sx={{ background: isDarkMode ? '#181a1b' : undefined }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...tableHeaderSx, width: "6%" }} onClick={() => handleSort(position, "rank")}>순위{getSortArrow("rank")}</TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "30%" }} onClick={() => handleSort(position, "player_name")}>선수명{getSortArrow("player_name")}</TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "10%" }} onClick={() => handleSort(position, "season")}>시즌{getSortArrow("season")}</TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "10%" }} onClick={() => handleSort(position, "grade")}>강화단계{getSortArrow("grade")}</TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "10%" }} onClick={() => handleSort(position, "usage_rate")}>사용률{getSortArrow("usage_rate")}</TableCell>
                      <TableCell sx={{ ...tableHeaderSx, width: "34%", borderRight: 0 }}>사용자</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedData.map((player, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ ...tableCellSx, width: "6%" }}>{index + 1}</TableCell>
                        <TableCell sx={{ ...tableCellSx, width: "30%" }}>{player.player_name}</TableCell>
                        <TableCell sx={{ ...tableCellSx, width: "10%" }}>{player.season}</TableCell>
                        <TableCell sx={{ ...tableCellSx, width: "10%" }}>{player.grade}</TableCell>
                        <TableCell sx={{ ...tableCellSx, width: "10%" }}>{player.usage_rate}%({player.user_count}명)</TableCell>
                        <TableCell sx={{ ...tableCellSx, width: "34%", borderRight: 0 }}>
                          {player.top_users.join(", ")}
                          {player.remaining_users > 0 && ` 외 ${player.remaining_users}명`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}
      </>
    );
  };

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          픽률조회
        </Typography>
      </motion.div>

      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              name="rankRange"
              label="랭킹 범위"
              type="number"
              value={form.rankRange}
              onChange={handleChange}
              inputProps={{ max: 10000, min: 1 }}
              placeholder="조회하실 랭킹 범위"
              fullWidth
              required
            />

            <Autocomplete
              freeSolo
              options={teamColors}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              value={teamColors.find(tc => tc.name === form.teamColor) || null}
              inputValue={inputTeamColor}
              onInputChange={(event, newInputValue) => {
                setInputTeamColor(newInputValue);
                setForm(prev => ({
                  ...prev,
                  teamColor: newInputValue,
                }));
              }}
              onChange={(event, newValue) => {
                setForm(prev => ({
                  ...prev,
                  teamColor: newValue ? newValue.name : "",
                }));
                setInputTeamColor(newValue ? newValue.name : "");
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="팀컬러"
                  placeholder="팀컬러를 선택하거나 입력하세요"
                  required
                />
              )}
            />

            <TextField
              name="topN"
              label="TOP N"
              type="number"
              value={form.topN}
              onChange={handleChange}
              inputProps={{ max: 10, min: 1 }}
              placeholder="집계하실 포지션별 선수 수"
              fullWidth
              required
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "조회"}
            </Button>
          </Stack>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results && renderResults()}
    </Box>
  );
};

export default PickRate;
