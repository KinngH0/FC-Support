import React, { useState, useEffect, useCallback } from "react";
import {
  Fab,
  Popover,
  Box,
  Typography,
  Button,
  Modal,
  TextField,
  Stack,
  Alert,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { styled } from "@mui/material/styles";
import { useAdmin } from "../contexts/AdminContext";
import axios from "axios";
import { setToken } from "../utils/jwt";

const FabBox = styled(Box)({
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 2000,
});

const LOCK_KEY = "fc_support_admin_lock";
const FAIL_KEY = "fc_support_admin_fail";

function getLockInfo() {
  const lock = localStorage.getItem(LOCK_KEY);
  if (!lock) return null;
  try {
    return JSON.parse(lock);
  } catch {
    return null;
  }
}

function setLockInfo(info) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(info));
}

function clearLockInfo() {
  localStorage.removeItem(LOCK_KEY);
}

function getFailCount() {
  return parseInt(localStorage.getItem(FAIL_KEY) || "0", 10);
}

function setFailCount(count) {
  localStorage.setItem(FAIL_KEY, String(count));
}

function clearFailCount() {
  localStorage.removeItem(FAIL_KEY);
}

const AdminFab = () => {
  const { isAdmin, login, logout } = useAdmin();
  const [anchorEl, setAnchorEl] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [lockInfo, setLockInfoState] = useState(getLockInfo());
  const [failCount, setFailCountState] = useState(getFailCount());
  const [now, setNow] = useState(Date.now());
  const [baseDate, setBaseDate] = useState("-");
  const [loading, setLoading] = useState(false);

  // Ctrl+Alt+Space로 비밀번호 입력 모달만 띄움
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.code === "Space") {
        setModalOpen(true);
        setError("");
        setPw("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 잠금 상태 실시간 체크
  useEffect(() => {
    if (!lockInfo) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockInfo]);

  // 잠금 해제 자동 처리
  useEffect(() => {
    if (!lockInfo) return;
    if (Date.now() > lockInfo.unlockAt) {
      clearLockInfo();
      clearFailCount();
      setLockInfoState(null);
      setFailCountState(0);
    }
  }, [lockInfo, now]);

  // 팝오버 열릴 때마다 기준 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/base-date/");
        setBaseDate(res.data.base_date || "-");
      } catch {
        setBaseDate("-");
      } finally {
        setLoading(false);
      }
    };
    if (anchorEl) {
      fetchData();
    }
  }, [anchorEl]);

  const handleFabClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const ADMIN_USERNAME = "rangec";
  const ADMIN_PASSWORD = "0824"; // 입력값과 비교용

  const handleLogin = async () => {
    if (lockInfo && Date.now() < lockInfo.unlockAt) return;
    if (pw === ADMIN_PASSWORD) {
      try {
        // Django JWT 로그인 시도
        const res = await axios.post("/api/token/", {
          username: ADMIN_USERNAME,
          password: "sk159159",
        });
        setToken(res.data.access);
        setModalOpen(false);
        clearFailCount();
        setFailCountState(0);
        setError("");
      } catch (e) {
        setError("서버 관리자 인증 실패! (계정정보 확인)");
      }
    } else {
      const nextFail = failCount + 1;
      setFailCount(nextFail);
      setFailCountState(nextFail);
      let lockMinutes = 0;
      if (nextFail >= 3) {
        if (!lockInfo) lockMinutes = 10;
        else lockMinutes = Math.min(10 + (nextFail - 3) * 30, 90);
        const unlockAt = Date.now() + lockMinutes * 60 * 1000;
        setLockInfo({ unlockAt, lockMinutes });
        setLockInfoState({ unlockAt, lockMinutes });
        setError(
          `로그인 시도 ${nextFail}회 초과! ${lockMinutes}분 후 재시도 가능.`
        );
        return;
      }
      setError("비밀번호가 올바르지 않습니다.");
    }
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  // 남은 잠금 시간 계산
  const getLockRemain = useCallback(() => {
    if (!lockInfo) return 0;
    return Math.max(0, Math.ceil((lockInfo.unlockAt - Date.now()) / 1000));
  }, [lockInfo]);

  return (
    <>
      <FabBox>
        <Fab color="primary" onClick={handleFabClick} size="medium">
          <SettingsIcon />
        </Fab>
      </FabBox>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ sx: { p: 2, minWidth: 350 } }}
      >
        <Stack spacing={1}>
          {loading ? (
            <Typography variant="body2">로딩 중...</Typography>
          ) : (
            <Typography variant="body2">기준 데이터 : {baseDate}</Typography>
          )}
          {isAdmin && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleLogout}
            >
              관리자 모드 해제
            </Button>
          )}
        </Stack>
      </Popover>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            minWidth: 300,
          }}
        >
          <Typography variant="h6" mb={2}>
            관리자 비밀번호 입력
          </Typography>
          {lockInfo && Date.now() < lockInfo.unlockAt ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              로그인 시도 제한!
              <br />
              {lockInfo.lockMinutes}분 후 재시도 가능
              <br />
              (남은 시간: {Math.floor(getLockRemain() / 60)}:
              {String(getLockRemain() % 60).padStart(2, "0")})
            </Alert>
          ) : null}
          <TextField
            label="비밀번호"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            fullWidth
            autoFocus
            error={!!error}
            helperText={error}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            disabled={lockInfo && Date.now() < lockInfo.unlockAt}
          />
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleLogin}
            disabled={lockInfo && Date.now() < lockInfo.unlockAt}
          >
            확인
          </Button>
        </Box>
      </Modal>
    </>
  );
};

export default AdminFab;
