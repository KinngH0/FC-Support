import React, { useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useAdmin } from '../contexts/AdminContext';

const Update = () => {
  const { isAdmin } = useAdmin();
  const [updates, setUpdates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const handleOpen = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setForm({ title: '', content: '' });
    } else {
      setForm({ title: updates[idx].title, content: updates[idx].content });
    }
    setModalOpen(true);
  };
  const handleClose = () => setModalOpen(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (form.title.trim() === '' || form.content.trim() === '') return;
    if (editIdx === null) {
      setUpdates([{
        id: Date.now(),
        title: form.title,
        date: new Date().toISOString().slice(0, 10),
        content: form.content
      }, ...updates]);
    } else {
      setUpdates(updates.map((u, i) => i === editIdx ? { ...u, title: form.title, content: form.content } : u));
    }
    setModalOpen(false);
  };

  const handleDelete = idx => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setUpdates(updates.filter((_, i) => i !== idx));
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        업데이트
      </Typography>
      {isAdmin && (
        <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={() => handleOpen()}>
          작성
        </Button>
      )}
      <Paper elevation={3} sx={{ mt: 3 }}>
        <List>
          {updates.map((update, index) => (
            <div key={update.id}>
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
                      {update.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {update.date}
                      </Typography>
                      {` — ${update.content}`}
                    </>
                  }
                />
              </ListItem>
              {index < updates.length - 1 && <Divider />}
            </div>
          ))}
        </List>
      </Paper>
      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle>{editIdx === null ? '업데이트 작성' : '업데이트 수정'}</DialogTitle>
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

export default Update; 