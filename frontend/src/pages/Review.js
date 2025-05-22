import React, { useState, useEffect, useMemo } from "react";
import { 
  TextField, 
  Autocomplete, 
  Box, 
  Typography, 
  Button, 
  Rating, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { motion } from "framer-motion";
import { fetchPlayerMeta, fetchSeasonMeta, getSeasonMetaMap } from "../utils/seasonMeta";
import { teamColors } from "../constants/teamColors";
import { useTheme } from "../contexts/ThemeContext";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useNavigate, useLocation } from 'react-router-dom';

const fetchPlayers = async () => {
  return await fetchPlayerMeta();
};

const API_URL = "/api/reviews/";

// 사용자별 고유 ID 생성 함수
const generateUserIdentifier = () => {
  // localStorage에 저장된 userId가 있으면 사용, 없으면 새로 생성
  let userId = localStorage.getItem('fc_support_user_id');
  if (!userId) {
    // 간단한 랜덤 ID 생성 (실제 프로덕션에서는 더 견고한 방법 사용 권장)
    userId = 'user_' + Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    localStorage.setItem('fc_support_user_id', userId);
  }
  return userId;
};

// 사용자별 localStorage 키 생성
const getUserSpecificKey = (baseKey) => {
  const userId = generateUserIdentifier();
  return `${baseKey}_${userId}`;
}

const REVIEW_NAME_KEY_BASE = 'fc_support_review_name';
const REVIEW_PASSWORD_KEY_BASE = 'fc_support_review_password';

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
  const [userReactions, setUserReactions] = useState({}); // 사용자의 좋아요/싫어요 상태 저장
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerImage, setPlayerImage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  // 카드/리스트 스타일 공통화
  const cardStyle = {
    mb: 1.5,
    p: 1.2,
    borderRadius: 1,
    textAlign: 'left',
    background: isDarkMode ? '#181a1b' : '#fafbfc',
    color: isDarkMode ? '#fff' : undefined,
    position: 'relative',
  };
  
  // 테이블 스타일 (PickRate.js에서 가져온 스타일)
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

  // URL 파라미터 상태 저장
  const [pendingPlayerId, setPendingPlayerId] = useState(null);
  const [pendingSeasonId, setPendingSeasonId] = useState(null);

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
    if (selected && selected.id && selectedSeason) {      const pid = String(selected.id).slice(3);
      setLoading(true);
      fetch(`${API_URL}?pid=${pid}&season_id=${selectedSeason}`)
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
    const seasonName = rawSeasonName.replace(/\s*\([^)]*\)/g, '').trim();    const payload = {
      pid: pid,
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
    // 사용자별 고유 키로 값을 불러옴
    const nameKey = getUserSpecificKey(REVIEW_NAME_KEY_BASE);
    const passwordKey = getUserSpecificKey(REVIEW_PASSWORD_KEY_BASE);
    
    setReviewName(localStorage.getItem(nameKey) || "");
    setReviewPassword(localStorage.getItem(passwordKey) || "");
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

  // 좋아요/싫어요 처리 함수
  const handleReaction = async (reviewId, type) => {
    const userId = generateUserIdentifier();
    const reactionKey = `review_${reviewId}_${userId}`;
    const currentReaction = userReactions[reactionKey];

    try {
      const res = await fetch(`${API_URL}${reviewId}/reaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userId })
      });

      if (res.ok) {
        const updatedReview = await res.json();
        // 리뷰 목록 업데이트
        setReviews(prevReviews => 
          prevReviews.map(r => r.id === reviewId ? updatedReview : r)
        );
        
        // 사용자의 반응 상태 업데이트
        setUserReactions(prev => ({
          ...prev,
          [reactionKey]: currentReaction === type ? null : type
        }));
      } else {
        const errorText = await res.text();
        console.error('반응 처리 실패:', errorText);
        alert('반응 처리에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('반응 처리 중 오류 발생:', error);
      alert('반응 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    setSelectedSeason(null);
    setPlayerImage(null);
  };

  const handleSeasonSelect = (season) => {
    setSelectedSeason(season);
    if (selectedPlayer && season) {
      const spid = selectedPlayer.spid;
      const paddedSpid = spid.toString().padStart(4, '0');
      setPlayerImage(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${paddedSpid}.png`);
    }
  };

  // 선수 선택 시 이미지 URL 설정
  useEffect(() => {
    if (selected) {
      const spid = String(selected.id);
      const pid = String(selected.id).slice(3);
      
      // 초기 이미지는 players 경로 사용
      setPlayerImage(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`);
      
      // 그 다음 playersAction 경로로 시도
      fetch(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`)
        .then(response => {
          if (response.ok) {
            setPlayerImage(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`);
          } else {
            // spid 실패시 pid로 시도
            setPlayerImage(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${pid}.png`);
          }
        })
        .catch(() => {
          // 에러 발생시 pid로 시도
          setPlayerImage(`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${pid}.png`);
        });
    } else {
      setPlayerImage(null);
    }
  }, [selected]);

  // 리뷰 렌더링 부분 수정
  const renderReview = (r, isRecent = false) => {
    const userId = generateUserIdentifier();
    const reactionKey = `review_${r.id}_${userId}`;
    const currentReaction = userReactions[reactionKey];

    return (
      <Box key={r.id} sx={{ ...cardStyle, mb: 2, p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
        {/* 작성자 정보와 수정/삭제 버튼 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {r.name ? r.name : 'FC-SUPPORT'}{r.ip ? ` [${maskIp(r.ip)}]` : ''}
          </Typography>
          
          {!isRecent && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" color="primary" onClick={() => { setEditId(r.id); setEditInput(r.review); setEditScore(r.score); setEditPassword(""); setDialogError(""); }}>수정</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => { setDeleteId(r.id); setDeletePassword(""); setDialogError(""); }}>삭제</Button>
            </Box>
          )}
        </Box>
        
        {/* 이미지(왼쪽)와 정보(오른쪽) 수직 배열 */}
        <Box sx={{ display: 'flex' }}>
          {/* 왼쪽: 선수 이미지 */}
          <Box sx={{ mr: 2, minWidth: '120px', width: '120px' }}>
            <img
              src={r.season_id ? `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${r.season_id}${r.pid}.png` : `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${r.pid}.png`}
              alt="선수 이미지"
              style={{ 
                width: 120, 
                height: 120, 
                objectFit: 'contain',
                background: isDarkMode ? '#333' : '#eee', 
                borderRadius: 4
              }}
              onError={e => { 
                e.target.onerror = null; 
                e.target.src = 'https://fconline.nexon.com/assets/images/common/profile_default.png';
              }}
            />
          </Box>
          
          {/* 오른쪽: 선수 정보 수직 배열 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
            {/* 첫 번째 줄: 별점 */}
            <Box sx={{ mb: 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ color: i < r.score ? '#FFD700' : '#ddd', fontSize: 18, marginRight: 1 }}>
                  ★
                </span>
              ))}
            </Box>
            
            {/* 두 번째 줄: 선수 이름과 시즌 아이콘 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {r.player_name ? r.player_name.replace(',', '') : '선수 미입력'}
              </Typography>
              {r.season_id && seasonMap[r.season_id] && (
                <img 
                  src={seasonMap[r.season_id].seasonImg}
                  alt={seasonMap[r.season_id].className}
                  style={{ height: 16, marginLeft: 4, marginRight: 4 }}
                  onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              )}
            </Box>
            
            {/* 세 번째 줄: 팀컬러 - 포지션 - 강화단계 */}
            <Typography variant="body2" sx={{ color: isDarkMode ? '#bbb' : '#666', mb: 1 }}>
              {r.teamcolor ? r.teamcolor : '팀컬러 미입력'} - {r.position ? r.position : '포지션 미입력'} - {(r.upgrade_level || r.grade) ? `${r.upgrade_level || r.grade}강` : '강화단계 미입력'}
            </Typography>
            
            {/* 네 번째 줄: 리뷰 내용 */}
            <Typography variant="body2">{r.review}</Typography>

            {/* 좋아요/싫어요 버튼 추가 */}
            {!isRecent && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant={currentReaction === 'good' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => handleReaction(r.id, 'good')}
                  startIcon={<ThumbUpIcon />}
                >
                  좋아요 {r.good || 0}
                </Button>
                <Button
                  size="small"
                  variant={currentReaction === 'bad' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => handleReaction(r.id, 'bad')}
                  startIcon={<ThumbDownIcon />}
                >
                  싫어요 {r.bad || 0}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // 최근 리뷰 클릭 시 이동 함수
  const handleRecentReviewClick = (review) => {
    window.location.href = `/review?playerId=${review.spid || review.id}&seasonId=${review.season_id}`;
  };

  // URL 파라미터 상태 저장
  useEffect(() => {
    setSelected(null);
    setSelectedSeason(null);
    const params = new URLSearchParams(location.search);
    setPendingPlayerId(params.get('playerId'));
    setPendingSeasonId(params.get('seasonId'));
  }, [location.search]);

  useEffect(() => {
    if (pendingPlayerId && allPlayers.length > 0) {
      const player = allPlayers.find(p => String(p.id) === String(pendingPlayerId));
      if (player) setSelected(player);
    }
    if (pendingSeasonId) setSelectedSeason(pendingSeasonId);
  }, [pendingPlayerId, pendingSeasonId, allPlayers]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 파라미터 변경 시 스크롤 맨 위로 이동
  }, [pendingPlayerId, pendingSeasonId]);

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          선수 리뷰
        </Typography>
      </motion.div>
      <Paper sx={{ p: 3, mb: 4, backgroundColor: isDarkMode ? '#23272f' : '#fff' }}>
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
      </Paper>
      {/* 최근 리뷰 리스트: 선수 선택 전만 노출 */}
      {!selected && recentReviews.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: isDarkMode ? '#23272f' : '#fff' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            최근 등록된 리뷰
          </Typography>
          {recentReviews.map(r => (
            <div key={r.id} style={{ cursor: 'pointer' }} onClick={() => handleRecentReviewClick(r)}>
              {renderReview(r, true)}
            </div>
          ))}
        </Paper>
      )}
      {selected && selected.id ? (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          {/* 선수 이미지 (pid 기준) */}          
          <Box sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {(() => {              
              const pid = String(selected.id).slice(3).replace(/^0+/, "");
              
              // 시즌이 선택되지 않은 경우
              if (!selectedSeason) {
                return (
                  <Box sx={{ 
                    width: 120, 
                    height: 120, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isDarkMode ? '#333' : '#eee',
                    borderRadius: 8,
                    marginBottom: 12
                  }}>
                    <img                  
                      src={`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${pid}.png`}
                      alt="선수 이미지"                  
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onError={e => {                  
                        e.target.onerror = null; 
                        e.target.src = 'https://fconline.nexon.com/assets/images/common/profile_default.png';
                      }}
                    />
                  </Box>
                );
              }
              
              // 시즌이 선택된 경우
              const fullId = selectedSeason + pid;
              return (
                <Box sx={{ 
                  width: 120, 
                  height: 120, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: isDarkMode ? '#333' : '#eee',
                  borderRadius: 8,
                  marginBottom: 12
                }}>
                  <img                  
                    src={`https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${fullId}.png`}
                    alt="선수 이미지"                  
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                    onError={e => {                  
                      e.target.onerror = null; 
                      e.target.src = `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${pid}.png`;
                    }}
                  />
                </Box>
              );
            })()}
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {selected.name}
            </Typography>
          </Box>
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
                      <img                        src={meta.seasonImg}
                        alt={meta.className}
                        style={{ width: 38.5, height: 30, objectFit: 'contain', background: 'transparent', borderRadius: 0, display: 'block' }}
                        onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    </button>
                  ) : null;
                })}
              </Box>
            );
          })()}
          {/* 시즌이 선택된 경우에만 리뷰 입력/출력 */}
          {selectedSeason && (
            <>              {/* 리뷰 입력 폼 */}
              <Paper sx={{ p: 3, mb: 4, backgroundColor: isDarkMode ? '#23272f' : '#fff' }}>
                <Box component="form" onSubmit={handleReviewSubmit}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>리뷰 작성</Typography>
                  <TextField
                    label="닉네임"
                    size="small"                    value={reviewName}
                    onChange={e => {
                      setReviewName(e.target.value);
                      const nameKey = getUserSpecificKey(REVIEW_NAME_KEY_BASE);
                      localStorage.setItem(nameKey, e.target.value);
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
                    type="password"                    value={reviewPassword}
                    onChange={e => {
                      setReviewPassword(e.target.value);
                      const passwordKey = getUserSpecificKey(REVIEW_PASSWORD_KEY_BASE);
                      localStorage.setItem(passwordKey, e.target.value);
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
              </Paper>
              {/* 리뷰 리스트 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  등록된 리뷰
                </Typography>
                  {loading ? (
                  <Typography variant="body2" color="text.secondary">리뷰 불러오는 중...</Typography>
                ) : reviews.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">등록된 리뷰가 없습니다.</Typography>
                ) : (
                  <Box>
                    {reviews.map(r => renderReview(r))}
                  </Box>
                )}
              </Box>
              {/* 삭제 다이얼로그 */}
              <Dialog 
                open={!!deleteId} 
                onClose={() => { setDeleteId(null); setDialogError(""); }}
                PaperProps={{
                  style: {
                    backgroundColor: isDarkMode ? '#23272f' : '#fff',
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
                    backgroundColor: isDarkMode ? '#23272f' : '#fff',
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
