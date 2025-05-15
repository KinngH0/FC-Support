import React, { useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { motion } from 'framer-motion';
import { useAdmin } from '../contexts/AdminContext';

const Notice = () => {
  const { isAdmin } = useAdmin();
  const [notices, setNotices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const handleOpen = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setForm({ title: '', content: '' });
    } else {
      setForm({ title: notices[idx].title, content: notices[idx].content });
    }
    setModalOpen(true);
  };
  const handleClose = () => setModalOpen(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (form.title.trim() === '' || form.content.trim() === '') return;
    if (editIdx === null) {
      setNotices([{
        id: Date.now(),
        title: form.title,
        date: new Date().toISOString().slice(0, 10),
        content: form.content
      }, ...notices]);
    } else {
      setNotices(notices.map((n, i) => i === editIdx ? { ...n, title: form.title, content: form.content } : n));
    }
    setModalOpen(false);
  };

  const handleDelete = idx => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setNotices(notices.filter((_, i) => i !== idx));
    }
  };

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          공지사항
        </Typography>
        {isAdmin && (
          <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={() => handleOpen()}>
            작성
          </Button>
        )}
      </motion.div>

      <Paper elevation={3} sx={{ mt: 3 }}>
        <List>
          {notices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ListItem alignItems="flex-start" secondaryAction={
                isAdmin && (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => handleOpen(index)}>수정</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(index)}>삭제</Button>
                  </Stack>
                )
              }>
                <ListItemText
                  primary={
                    <Typography variant="h6" component="div">
                      {notice.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {notice.date}
                      </Typography>
                      {` — ${notice.content}`}
                    </>
                  }
                />
              </ListItem>
              {index < notices.length - 1 && <Divider />}
            </motion.div>
          ))}
        </List>
      </Paper>

      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle>{editIdx === null ? '공지 작성' : '공지 수정'}</DialogTitle>
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
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notice; 