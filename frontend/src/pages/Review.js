import React, { useState, useEffect, useMemo } from "react";
import { TextField, Autocomplete, Box, Typography, Button, Rating, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { fetchPlayerMeta, fetchSeasonMeta, getSeasonMetaMap } from "../utils/seasonMeta";

const fetchPlayers = async () => {
  return await fetchPlayerMeta();
};

const API_URL = "/api/reviews/";

const Review = () => {
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
  const [reviewGrade, setReviewGrade] = useState(1);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [editScore, setEditScore] = useState(5);
  const [editPassword, setEditPassword] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [dialogError, setDialogError] = useState("");

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
      // DB에 저장된 spid와 동일하게 앞 3자리(시즌) 제거한 값만 사용
      const pid = String(selected.id).slice(3); // 예: '200104'
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

  // 리뷰 등록
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    const pid = String(selected.id);
    const payload = {
      spid: pid,
      season_id: selectedSeason,
      name: reviewName,
      password: reviewPassword,
      review: reviewInput,
      score: reviewScore,
      grade: reviewGrade,
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
      setReviewGrade(1);
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

  // 추천/비추천 핸들러
  const handleRecommend = async (reviewId, type) => {
    if (!['good', 'bad'].includes(type)) return;
    try {
      const res = await fetch(`${API_URL}${reviewId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: true })
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews(reviews => reviews.map(r => r.id === reviewId ? updated : r));
      }
    } catch {}
  };

  // 선수/시즌이 바뀔 때마다 시즌 선택 초기화
  useEffect(() => {
    setSelectedSeason(null);
  }, [selected]);

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 6 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        선수 리뷰
      </Typography>
      <Autocomplete
        freeSolo
        options={filteredOptions}
        getOptionLabel={(option) => option.name || ""}
        inputValue={inputValue}
        onInputChange={(_, value) => setInputValue(value)}
        value={selected || null}
        onChange={(_, value) => setSelected(value || undefined)}
        onKeyDown={(e) => {
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
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="선수 이름을 입력하세요"
          />
        )}
      />
      {selected && selected.id ? (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          {/* 선수 이미지 (pid 기준) */}
          {(() => {
            const pid = String(selected.id).slice(3).replace(/^0+/, "");
            return (
              <img
                src={`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`}
                alt="선수 이미지"
                style={{ width: 80, height: 80, objectFit: 'contain', display: 'block', margin: '0 auto 12px auto', background: '#eee', borderRadius: 8 }}
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
                        border: 'none',
                        background: isSelected ? '#fff' : '#f0f0f0',
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
              <Box component="form" onSubmit={handleReviewSubmit} sx={{ mt: 2, mb: 2, textAlign: 'left', background: '#f7f7fa', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>리뷰 작성</Typography>
                <TextField
                  label="닉네임"
                  size="small"
                  value={reviewName}
                  onChange={e => setReviewName(e.target.value)}
                  required
                  sx={{ mb: 1, width: '100%' }}
                />
                <TextField
                  label="비밀번호"
                  size="small"
                  type="password"
                  value={reviewPassword}
                  onChange={e => setReviewPassword(e.target.value)}
                  required
                  sx={{ mb: 1, width: '100%' }}
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
                <TextField
                  label="강화단계"
                  size="small"
                  type="number"
                  value={reviewGrade}
                  onChange={e => setReviewGrade(Number(e.target.value))}
                  required
                  inputProps={{ min: 1, max: 30 }}
                  sx={{ mb: 1, width: '100%' }}
                />
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
                    <Box key={r.id} sx={{ mb: 1.5, p: 1.2, border: '1px solid #eee', borderRadius: 1, textAlign: 'left', background: '#fafbfc', position: 'relative' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {r.name} <span style={{fontWeight:400, fontSize:13, color:'#888'}}>+{r.grade}</span>
                        {r.ip && (
                          <span style={{fontWeight:400, fontSize:13, color:'#888'}}>({r.ip})</span>
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{r.review}</Typography>
                      <Typography variant="caption" color="text.secondary">별점: {r.score}</Typography>
                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="outlined" color="primary" onClick={() => { setEditId(r.id); setEditInput(r.review); setEditScore(r.score); setEditPassword(""); setDialogError(""); }}>수정</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => { setDeleteId(r.id); setDeletePassword(""); setDialogError(""); }}>삭제</Button>
                        <Button size="small" variant="outlined" color="success" onClick={() => handleRecommend(r.id, 'good')} sx={{ ml: 1 }}>추천({r.good ?? 0})</Button>
                        <Button size="small" variant="outlined" color="secondary" onClick={() => handleRecommend(r.id, 'bad')} sx={{ ml: 1 }}>비추천({r.bad ?? 0})</Button>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
              {/* 삭제 다이얼로그 */}
              <Dialog open={!!deleteId} onClose={() => { setDeleteId(null); setDialogError(""); }}>
                <DialogTitle>리뷰 삭제</DialogTitle>
                <DialogContent>
                  <TextField
                    label="비밀번호"
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                  {dialogError && <Typography color="error" sx={{ mt: 1 }}>{dialogError}</Typography>}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setDeleteId(null); setDialogError(""); }}>취소</Button>
                  <Button color="error" onClick={handleDelete}>삭제</Button>
                </DialogActions>
              </Dialog>
              {/* 수정 다이얼로그 */}
              <Dialog open={!!editId} onClose={() => { setEditId(null); setDialogError(""); }}>
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
