import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { motion } from "framer-motion";
import { useAdmin } from "../contexts/AdminContext";
import axios from "axios";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { authAxios } from "../utils/jwt";

const Notice = () => {
  const { isAdmin } = useAdmin();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });

  // 목록 불러오기
  const fetchNotices = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/notices/");
      setNotices(res.data);
    } catch (err) {
      setError("공지사항을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleOpen = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setForm({ title: "", content: "" });
    } else {
      setForm({ title: notices[idx].title, content: notices[idx].content });
    }
    setModalOpen(true);
  };
  const handleClose = () => setModalOpen(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // 저장(작성/수정)
  const handleSave = async () => {
    if (form.title.trim() === "" || form.content.trim() === "") return;
    setLoading(true);
    setError("");
    try {
      if (editIdx === null) {
        await authAxios.post("/api/notices/", form);
      } else {
        await authAxios.patch(`/api/notices/${notices[editIdx].id}/`, form);
      }
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 삭제
  const handleDelete = async (idx) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    setError("");
    try {
      await authAxios.delete(`/api/notices/${notices[idx].id}/`);
      fetchNotices();
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          공지사항
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            sx={{ mb: 2 }}
            onClick={() => handleOpen()}
          >
            작성
          </Button>
        )}
      </motion.div>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ mt: 3 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {notices.map((notice, index) => (
              <Accordion key={notice.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: "bold" }}>
                    {notice.title}
                  </Typography>
                  <Typography
                    sx={{ ml: 2, color: "text.secondary", fontSize: 14 }}
                  >
                    {notice.date}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ whiteSpace: "pre-line" }}>
                    {notice.content}
                  </Typography>
                  {isAdmin && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpen(index)}
                      >
                        수정
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleDelete(index)}
                      >
                        삭제
                      </Button>
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>
      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle>
          {editIdx === null ? "공지 작성" : "공지 수정"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="제목"
            name="title"
            value={form.title}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="내용"
            name="content"
            value={form.content}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notice;
