import React, { useState, useEffect, useMemo } from "react";
import { TextField, Autocomplete, Box, Typography, Button, Rating, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { fetchPlayerMeta, fetchSeasonMeta, getSeasonMetaMap } from "../utils/seasonMeta";
import { teamColors } from "../constants/teamColors";
import { useTheme } from "../contexts/ThemeContext";

const fetchPlayers = async () => {
  return await fetchPlayerMeta();
};

const API_URL = "/api/reviews/";
const REVIEW_NAME_KEY = 'fc_support_review_name';
const REVIEW_PASSWORD_KEY = 'fc_support_review_password';

const Review = () => {
  const { isDarkMode } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState(undefined);
  const [allPlayers, setAllPlayers] = useState([]);
  const [seasonMeta, setSeasonMeta] = useState([]);
  const [seasonMap, setSeasonMap] = useState({});
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [reviews, setReviews] = useState([]); // 실제 리뷰 데이터
  const [loading, setLoading] = useState(false);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewPassword, setReviewPassword] = useState("");
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewGrade, setReviewGrade] = useState(""); // 기본값을 빈 문자열로
  const [reviewTeamColor, setReviewTeamColor] = useState("");
  const [reviewPosition, setReviewPosition] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [editScore, setEditScore] = useState(5);
  const [editPassword, setEditPassword] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [recentReviews, setRecentReviews] = useState([]);

  // 카드/리스트 스타일 공통화
  const cardStyle = {
    mb: 1.5,
    p: 1.2,
    border: isDarkMode ? '1px solid #333' : '1px solid #eee',
    borderRadius: 1,
    textAlign: 'left',
    background: isDarkMode ? '#181a1b' : '#fafbfc',
    color: isDarkMode ? '#fff' : undefined,
    position: 'relative',
  };

  // 선수 데이터 최초 1회만 fetch
  useEffect(() => {
    fetchPlayers().then((data) => setAllPlayers(data));
  }, []);

  // 시즌 메타데이터 fetch
  useEffect(() => {
    fetchSeasonMeta().then((data) => {
      setSeasonMeta(data);
      setSeasonMap(getSeasonMetaMap(data));
    });
  }, []);

  // 실시간 검색 옵션 (2글자 이상, pid별 1개)
  const filteredOptions = useMemo(() => {
    if (inputValue.length < 2 || allPlayers.length === 0) return [];
    const filtered = allPlayers.filter((item) => item.name.includes(inputValue));
    const pidMap = {};
    filtered.forEach((item) => {
      const pid = String(item.id).slice(3);
      if (!pidMap[pid]) pidMap[pid] = item;
    });
    return Object.values(pidMap);
  }, [inputValue, allPlayers]);

  // 엔터 입력 시 항상 allPlayers에서 inputValue 기준으로 후보 추출
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inputValue.length > 1) {
      setTimeout(() => {
        const filtered = allPlayers.filter((item) => item.name.includes(inputValue));
        const pidMap = {};
        filtered.forEach((item) => {
          const pid = String(item.id).slice(3);
          if (!pidMap[pid]) pidMap[pid] = item;
        });
        const candidates = Object.values(pidMap);
        const exactMatches = candidates.filter((item) => item.name === inputValue);
        if (exactMatches.length === 1) {
          setSelected(exactMatches[0]);
          setInputValue(exactMatches[0].name);
          return;
        }
        if (candidates.length === 1) {
          setSelected(candidates[0]);
          setInputValue(candidates[0].name);
          return;
        }
      }, 0);
    }
  };

  // 시즌 선택 시 해당 선수+시즌 리뷰 fetch
  useEffect(() => {
    if (selected && selected.id && selectedSeason) {
      const pid = String(selected.id).slice(3);
      setLoading(true);
      fetch(`${API_URL}?spid=${pid}&season_id=${selectedSeason}`)
        .then(res => res.json())
        .then(data => {
          setReviews(Array.isArray(data) ? data : data.results || []);
          setLoading(false);
        })
        .catch(() => {
          setReviews([]);
          setLoading(false);
        });
    } else {
      setReviews([]);
    }
  }, [selected, selectedSeason]);

  // --- IP 차단 기능: localStorage에서 차단된 IP 확인 ---
  function isBlockedIp() {
    try {
      const myIp = localStorage.getItem('fc_support_my_ip') || '';
      const blocked = JSON.parse(localStorage.getItem('fc_support_blocked_ips') || '[]');
      return myIp && blocked.includes(myIp);
    } catch {
      return false;
    }
  }

  // 리뷰 등록 시 차단된 IP면 차단 메시지
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (isBlockedIp()) {
      setError('해당 IP는 리뷰 작성이 차단되었습니다. 관리자에게 문의하세요.');
      return;
    }
    if (!reviewName) {
      setError('닉네임을 입력하세요.');
      return;
    }
    if (!reviewPassword) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    if (!reviewInput) {
      setError('리뷰 내용을 입력하세요.');
      return;
    }
    if (!reviewTeamColor) {
      setError('팀컬러를 선택하세요.');
      return;
    }
    if (!reviewPosition) {
      setError('포지션을 선택하세요.');
      return;
    }
    if (!reviewGrade) {
      setError('강화단계를 선택하세요.');
      return;
    }
    setSubmitLoading(true);
    setError("");
    const pid = String(selected.id).slice(3);
    // 시즌명에서 괄호 및 괄호 안의 내용 제거
    const rawSeasonName = seasonMap[selectedSeason]?.className || '';
    const seasonName = rawSeasonName.replace(/\s*\([^)]*\)/g, '').trim();
    const payload = {
      spid: pid,
      season_id: selectedSeason,
      name: reviewName,
      password: reviewPassword,
      review: reviewInput,
      score: reviewScore,
      upgrade_level: Number(reviewGrade), // 숫자로 변환해서 전달
      teamcolor: reviewTeamColor,
      position: reviewPosition,
      player_name: selected.name,
      season_name: seasonName,
    };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("리뷰 등록 실패");
      setReviewInput("");
      setReviewName("");
      setReviewPassword("");
      setReviewScore(5);
      setReviewGrade("");
      setReviewTeamColor("");
      setReviewPosition("");
      // 등록 후 새로고침
      const data = await res.json();
      setReviews((prev) => [data, ...prev]);
    } catch (err) {
      setError("리뷰 등록에 실패했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!deleteId) return;
    setDialogError("");
    try {
      const res = await fetch(`${API_URL}${deleteId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword })
      });
      if (res.status === 204) {
        setReviews(reviews.filter(r => r.id !== deleteId));
        setDeleteId(null);
        setDeletePassword("");
      } else {
        setDialogError("비밀번호가 일치하지 않습니다.");
      }
    } catch {
      setDialogError("삭제에 실패했습니다.");
    }
  };

  // 수정
  const handleEdit = async () => {
    if (!editId) return;
    setDialogError("");
    try {
      const res = await fetch(`${API_URL}${editId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: editInput, score: editScore, password: editPassword })
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews(reviews.map(r => r.id === editId ? updated : r));
        setEditId(null);
        setEditInput("");
        setEditScore(5);
        setEditPassword("");
      } else {
        setDialogError("비밀번호가 일치하지 않습니다.");
      }
    } catch {
      setDialogError("수정에 실패했습니다.");
    }
  };

  // 선수/시즌이 바뀔 때마다 시즌 선택 초기화
  useEffect(() => {
    setSelectedSeason(null);
  }, [selected]);

  // 페이지 진입 시 localStorage에서 닉네임/비밀번호 불러오기
  useEffect(() => {
    setReviewName(localStorage.getItem(REVIEW_NAME_KEY) || "");
    setReviewPassword(localStorage.getItem(REVIEW_PASSWORD_KEY) || "");
  }, []);

  // IP 마스킹 함수: 222.238.123.45 → 222.238.*
  function maskIp(ip) {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length < 2) return ip;
    return parts[0] + '.' + parts[1] + '.*';
  }

  // 포지션 드롭다운에 공식 메타데이터의 모든 포지션(GK, SW, RWB 등 29개)을 하드코딩 배열로 추가
  const positionOptions = [
    "ST", "CF", "LW", "RW", "CAM", "RAM", "LAM", "RM", "LM", "CM", "CDM", "CB", "LB", "RB", "GK"
  ];
  // 항상 전체 포지션이 드롭다운에 나오도록 수정
  const availablePositions = positionOptions;

  // 최근 리뷰 5개 fetch (페이지 진입 시)
  useEffect(() => {
    fetch(`${API_URL}?ordering=-created_at&page_size=5`)
      .then(res => res.json())
      .then(data => {
        setRecentReviews(Array.isArray(data) ? data.slice(0, 5) : (data.results || []).slice(0, 5));
      })
      .catch(() => setRecentReviews([]));
  }, []);

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 6 }}>
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          선수 리뷰
        </Typography>
      </Box>
      <Autocomplete
        freeSolo
        options={filteredOptions}
        getOptionLabel={(option) => option.name || ""}
        inputValue={inputValue}
        onInputChange={(_, value) => setInputValue(value)}
        value={selected || null}
        onChange={(_, value) => setSelected(value || undefined)}
        onKeyDown={handleKeyDown}
        renderInput={(params) => (
          <TextField
            {...params}
            label="선수 이름을 입력하세요"
            InputLabelProps={{
              style: { color: isDarkMode ? '#aaa' : undefined }
            }}
            InputProps={{
              ...params.InputProps,
              style: { color: isDarkMode ? '#fff' : undefined }
            }}
          />
        )}
        sx={{
          '& .MuiAutocomplete-option': {
            backgroundColor: isDarkMode ? '#333' : undefined,
            color: isDarkMode ? '#fff' : undefined,
          }
        }}
      />
      {/* 최근 리뷰 리스트: 선수 선택 전만 노출 */}
      {!selected && recentReviews.length > 0 && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            최근 등록된 리뷰
          </Typography>
          {recentReviews.map(r => (
            <Box key={r.id} sx={cardStyle}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {r.name}
                {r.grade ? ` (${r.grade}강)` : ''}
                {r.ip ? ` [${maskIp(r.ip)}]` : ''}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, mt: 0.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < r.score ? '#FFD700' : '#ddd', fontSize: 18, marginRight: 1 }}>
                    ★
                  </span>
                ))}
              </Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: isDarkMode ? '#bbb' : '#666' }}>
                {r.teamcolor ? r.teamcolor : '팀컬러 미입력'}
                {' - '}
                {r.position ? r.position : '포지션 미입력'}
                {' - '}
                {(r.upgrade_level || r.grade) ? `${r.upgrade_level || r.grade}강` : '강화단계 미입력'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>{r.review}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {selected && selected.id ? (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          {/* 선수 이미지 (pid 기준) */}
          {(() => {
            const pid = String(selected.id).slice(3).replace(/^0+/, "");
            return (
              <img
                src={`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`}
                alt="선수 이미지"
                style={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: 'contain', 
                  display: 'block', 
                  margin: '0 auto 12px auto', 
                  background: isDarkMode ? '#333' : '#eee', 
                  borderRadius: 8 
                }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            );
          })()}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>
            {selected.name}
          </Typography>
          {/* 시즌 버튼들만 */}
          {(() => {
            const pid = String(selected.id).slice(3);
            const allSeasons = allPlayers.filter(
              (p) => String(p.id).slice(3) === pid
            );
            const seasonIds = Array.from(
              new Set(allSeasons.map((p) => String(p.id).slice(0, 3)))
            );
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, justifyContent: 'center', mt: 0.5 }}>
                {seasonIds.map((sid) => {
                  const meta = seasonMap[sid];
                  const isSelected = selectedSeason === sid || selectedSeason === null;
                  return meta ? (
                    <button
                      key={sid}
                      onClick={() => setSelectedSeason(selectedSeason === sid ? null : sid)}
                      style={{
                        border: isDarkMode ? '1px solid #444' : 'none',
                        background: isSelected 
                          ? isDarkMode ? '#333' : '#fff' 
                          : isDarkMode ? '#222' : '#f0f0f0',
                        opacity: selectedSeason && selectedSeason !== sid ? 0.3 : 1,
                        borderRadius: 0,
                        padding: 0,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'opacity 0.2s',
                        width: 38.5,
                        height: 30,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={meta.seasonImg}
                        alt={meta.className}
                        style={{ width: 38.5, height: 30, objectFit: 'contain', background: 'transparent', borderRadius: 0, display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </button>
                  ) : null;
                })}
              </Box>
            );
          })()}
          {/* 시즌이 선택된 경우에만 리뷰 입력/출력 */}
          {selectedSeason && (
            <>
              {/* 리뷰 입력 폼 */}
              <Box component="form" onSubmit={handleReviewSubmit} sx={{ 
                mt: 2, 
                mb: 2, 
                textAlign: 'left', 
                background: isDarkMode ? '#1a1a1a' : '#f7f7fa', 
                p: 2, 
                borderRadius: 2,
                color: isDarkMode ? '#fff' : 'inherit',
                border: isDarkMode ? '1px solid #333' : 'none'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>리뷰 작성</Typography>
                <TextField
                  label="닉네임"
                  size="small"
                  value={reviewName}
                  onChange={e => {
                    setReviewName(e.target.value);
                    localStorage.setItem(REVIEW_NAME_KEY, e.target.value);
                  }}
                  required
                  sx={{ mb: 1, width: '100%' }}
                  InputLabelProps={{
                    style: { color: isDarkMode ? '#aaa' : undefined }
                  }}
                  InputProps={{
                    style: { color: isDarkMode ? '#fff' : undefined }
                  }}
                />
                <TextField
                  label="비밀번호"
                  size="small"
                  type="password"
                  value={reviewPassword}
                  onChange={e => {
                    setReviewPassword(e.target.value);
                    localStorage.setItem(REVIEW_PASSWORD_KEY, e.target.value);
                  }}
                  required
                  sx={{ mb: 1, width: '100%' }}
                  InputLabelProps={{
                    style: { color: isDarkMode ? '#aaa' : undefined }
                  }}
                  InputProps={{
                    style: { color: isDarkMode ? '#fff' : undefined }
                  }}
                />
                <TextField
                  label="리뷰 내용"
                  size="small"
                  value={reviewInput}
                  onChange={e => setReviewInput(e.target.value)}
                  required
                  multiline
                  minRows={2}
                  sx={{ mb: 1, width: '100%' }}
                  InputLabelProps={{
                    style: { color: isDarkMode ? '#aaa' : undefined }
                  }}
                  InputProps={{
                    style: { color: isDarkMode ? '#fff' : undefined }
                  }}
                />
                <TextField
                  select
                  label="강화단계 (1~13)"
                  size="small"
                  value={reviewGrade}
                  onChange={e => setReviewGrade(e.target.value)}
                  required
                  sx={{ mb: 1, width: '100%' }}
                  SelectProps={{ 
                    native: true,
                    style: { color: isDarkMode ? '#fff' : undefined } 
                  }}
                  InputLabelProps={{
                    style: { color: isDarkMode ? '#aaa' : undefined }
                  }}
                  InputProps={{
                    style: { color: isDarkMode ? '#fff' : undefined }
                  }}
                  placeholder="강화단계"
                >
                  <option value="" style={{ color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#333' : '#fff' }}>-</option>
                  {[...Array(13)].map((_, i) => (
                    <option 
                      key={i + 1} 
                      value={String(i + 1)}
                      style={{ color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#333' : '#fff' }}
                    >{i + 1}강</option>
                  ))}
                </TextField>
                <Autocomplete
                  freeSolo
                  options={teamColors.map(c => c.name)}
                  value={reviewTeamColor}
                  onChange={(_, value) => setReviewTeamColor(value || '')}
                  inputValue={reviewTeamColor}
                  onInputChange={(_, value) => setReviewTeamColor(value)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="팀컬러" 
                      required 
                      sx={{ mb: 1, width: '100%' }}
                      InputLabelProps={{
                        style: { color: isDarkMode ? '#aaa' : undefined }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        style: { color: isDarkMode ? '#fff' : undefined }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-option': {
                      backgroundColor: isDarkMode ? '#333' : undefined,
                      color: isDarkMode ? '#fff' : undefined,
                    }
                  }}
                />
                <Autocomplete
                  freeSolo
                  options={availablePositions}
                  value={reviewPosition}
                  onChange={(_, value) => setReviewPosition(value || '')}
                  inputValue={reviewPosition}
                  onInputChange={(_, value) => setReviewPosition(value)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="포지션" 
                      required 
                      sx={{ mb: 1, width: '100%' }}
                      InputLabelProps={{
                        style: { color: isDarkMode ? '#aaa' : undefined }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        style: { color: isDarkMode ? '#fff' : undefined }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-option': {
                      backgroundColor: isDarkMode ? '#333' : undefined,
                      color: isDarkMode ? '#fff' : undefined,
                    }
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>별점</Typography>
                  <Rating
                    name="score"
                    value={reviewScore}
                    onChange={(_, v) => setReviewScore(v || 5)}
                    max={5}
                  />
                </Box>
                {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
                <Button type="submit" variant="contained" size="small" disabled={submitLoading} fullWidth>
                  {submitLoading ? "등록 중..." : "리뷰 등록"}
                </Button>
              </Box>
              {/* 리뷰 리스트 */}
              <Box sx={{ mt: 2 }}>
                {loading ? (
                  <Typography variant="body2" color="text.secondary">리뷰 불러오는 중...</Typography>
                ) : reviews.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">등록된 리뷰가 없습니다.</Typography>
                ) : (
                  reviews.map(r => (
                    <Box key={r.id} sx={cardStyle}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {r.name}
                        {r.grade ? ` (${r.grade}강)` : ''}
                        {r.ip ? ` [${maskIp(r.ip)}]` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, mt: 0.5 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ color: i < r.score ? '#FFD700' : '#ddd', fontSize: 18, marginRight: 1 }}>
                            ★
                          </span>
                        ))}
                      </Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: isDarkMode ? '#bbb' : '#666' }}>
                        {r.teamcolor ? r.teamcolor : '팀컬러 미입력'}
                        {' - '}
                        {r.position ? r.position : '포지션 미입력'}
                        {' - '}
                        {(r.upgrade_level || r.grade) ? `${r.upgrade_level || r.grade}강` : '강화단계 미입력'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>{r.review}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 2 }}>
                        <Button size="small" variant="outlined" color="primary" onClick={() => { setEditId(r.id); setEditInput(r.review); setEditScore(r.score); setEditPassword(""); setDialogError(""); }}>수정</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => { setDeleteId(r.id); setDeletePassword(""); setDialogError(""); }}>삭제</Button>
                        <Button size="small" variant="outlined" onClick={() => {/* TODO: 좋아요 API 연동 */}}>좋아요</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => {/* TODO: 싫어요 API 연동 */}}>싫어요</Button>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
              {/* 삭제 다이얼로그 */}
              <Dialog 
                open={!!deleteId} 
                onClose={() => { setDeleteId(null); setDialogError(""); }}
                PaperProps={{
                  style: {
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
                    color: isDarkMode ? '#fff' : 'inherit',
                  }
                }}
              >
                <DialogTitle>리뷰 삭제</DialogTitle>
                <DialogContent>
                  <TextField
                    label="비밀번호"
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    fullWidth
                    sx={{ mt: 1 }}
                    InputLabelProps={{
                      style: { color: isDarkMode ? '#aaa' : undefined }
                    }}
                    InputProps={{
                      style: { color: isDarkMode ? '#fff' : undefined }
                    }}
                  />
                  {dialogError && <Typography color="error" sx={{ mt: 1 }}>{dialogError}</Typography>}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setDeleteId(null); setDialogError(""); }}>취소</Button>
                  <Button color="error" onClick={handleDelete}>삭제</Button>
                </DialogActions>
              </Dialog>
              {/* 수정 다이얼로그 */}
              <Dialog 
                open={!!editId} 
                onClose={() => { setEditId(null); setDialogError(""); }}
                PaperProps={{
                  style: {
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
                    color: isDarkMode ? '#fff' : 'inherit',
                  }
                }}
              >
                <DialogTitle>리뷰 수정</DialogTitle>
                <DialogContent>
                  <TextField
                    label="리뷰 내용"
                    value={editInput}
                    onChange={e => setEditInput(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={{ mt: 1 }}
                    InputLabelProps={{
                      style: { color: isDarkMode ? '#aaa' : undefined }
                    }}
                    InputProps={{
                      style: { color: isDarkMode ? '#fff' : undefined }
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>별점</Typography>
                    <Rating
                      name="edit-score"
                      value={editScore}
                      onChange={(_, v) => setEditScore(v || 5)}
                      max={5}
                    />
                  </Box>
                  <TextField
                    label="비밀번호"
                    type="password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    fullWidth
                    sx={{ mt: 1 }}
                    InputLabelProps={{
                      style: { color: isDarkMode ? '#aaa' : undefined }
                    }}
                    InputProps={{
                      style: { color: isDarkMode ? '#fff' : undefined }
                    }}
                  />
                  {dialogError && <Typography color="error" sx={{ mt: 1 }}>{dialogError}</Typography>}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setEditId(null); setDialogError(""); }}>취소</Button>
                  <Button onClick={handleEdit} variant="contained">수정</Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default Review;
