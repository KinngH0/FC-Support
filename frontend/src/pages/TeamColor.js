import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";

const TeamColor = () => {
  const [form, setForm] = useState({ rankRange: "", topN: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await axios.get("/api/team-color-stats/", {
        params: {
          rank_range: form.rankRange,
          top_n: form.topN,
        },
      });
      setResults(res.data.results || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (err.response?.data ? JSON.stringify(err.response.data) : null) ||
          "데이터를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 구단가치 변환 함수 (픽률조회와 동일)
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        팀컬러 리스트
      </Typography>
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
            <TextField
              name="topN"
              label="TOP N"
              type="number"
              value={form.topN}
              onChange={handleChange}
              inputProps={{ max: 100, min: 1 }}
              placeholder="집계하실 팀컬러 수"
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
      {results.length > 0 && (
        <Box>
          {results.map((item) => (
            <Accordion key={item.rank} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography
                  sx={{ width: 60, flexShrink: 0, fontWeight: "bold" }}
                >
                  {item.rank}위
                </Typography>
                <Typography sx={{ width: 180, flexShrink: 0, ml: 2 }}>
                  {item.team_color}
                </Typography>
                <Typography sx={{ ml: 2 }}>
                  {item.percentage}%({item.count}명)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
                    상세 통계
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      구단가치
                    </Typography>
                    <Typography variant="body2" component="div">
                      평균: {formatClubValue(item.details.club_value.avg)}
                      <br />
                      {item.details.club_value.avg !== null && (
                        <>
                          최고: {formatClubValue(item.details.club_value.max)} -{" "}
                          {item.details.club_value.max_nickname}
                          <br />
                          최저: {formatClubValue(
                            item.details.club_value.min
                          )} - {item.details.club_value.min_nickname}
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      랭킹
                    </Typography>
                    <Typography variant="body2" component="div">
                      평균: {item.details.rank.avg}위<br />
                      {item.details.rank.avg !== null && (
                        <>
                          최고: {item.details.rank.min}위 -{" "}
                          {item.details.rank.min_nickname}
                          <br />
                          최저: {item.details.rank.max}위 -{" "}
                          {item.details.rank.max_nickname}
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      점수
                    </Typography>
                    <Typography variant="body2" component="div">
                      평균: {item.details.score.avg}점<br />
                      {item.details.score.avg !== null && (
                        <>
                          최고: {item.details.score.max}점 -{" "}
                          {item.details.score.max_nickname}
                          <br />
                          최저: {item.details.score.min}점 -{" "}
                          {item.details.score.min_nickname}
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "bold", mt: 2 }}
                    >
                      포메이션 순위
                    </Typography>
                    {item.details.formation_rank.length === 0 ? (
                      <Typography variant="body2">-</Typography>
                    ) : (
                      item.details.formation_rank.map((f) => (
                        <Typography variant="body2" key={f.rank}>
                          {f.rank}위: {f.formation} ({f.count}명)
                        </Typography>
                      ))
                    )}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TeamColor;
