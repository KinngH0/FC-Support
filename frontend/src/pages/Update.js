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
import { useAdmin } from "../contexts/AdminContext";
import axios from "axios";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const Update = () => {
  const { isAdmin } = useAdmin();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });

  // 목록 불러오기
  const fetchUpdates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/updates/");
      setUpdates(res.data);
    } catch (err) {
      setError("업데이트 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleOpen = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setForm({ title: "", content: "" });
    } else {
      setForm({ title: updates[idx].title, content: updates[idx].content });
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
        await axios.post("/api/updates/", form);
      } else {
        await axios.patch(`/api/updates/${updates[editIdx].id}/`, form);
      }
      setModalOpen(false);
      fetchUpdates();
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
      await axios.delete(`/api/updates/${updates[idx].id}/`);
      fetchUpdates();
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        업데이트
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
            {updates.map((update, index) => (
              <Accordion key={update.id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: "bold" }}>
                    {update.title}
                  </Typography>
                  <Typography
                    sx={{ ml: 2, color: "text.secondary", fontSize: 14 }}
                  >
                    {update.date}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ whiteSpace: "pre-line" }}>
                    {update.content}
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
          {editIdx === null ? "업데이트 작성" : "업데이트 수정"}
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

export default Update;
