import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { motion } from 'framer-motion';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAdmin } from '../contexts/AdminContext';

const Resources = () => {
  const { isAdmin } = useAdmin();
  const [resources, setResources] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', url: '' });

  const handleOpen = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setForm({ title: '', description: '', url: '' });
    } else {
      setForm({ title: resources[idx].title, description: resources[idx].description, url: resources[idx].url });
    }
    setModalOpen(true);
  };
  const handleClose = () => setModalOpen(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (form.title.trim() === '' || form.description.trim() === '' || form.url.trim() === '') return;
    if (editIdx === null) {
      setResources([{
        id: Date.now(),
        title: form.title,
        description: form.description,
        url: form.url,
        type: 'PDF',
        size: '0MB',
        downloads: 0,
        date: new Date().toISOString().slice(0, 10)
      }, ...resources]);
    } else {
      setResources(resources.map((r, i) => i === editIdx ? { ...r, title: form.title, description: form.description, url: form.url } : r));
    }
    setModalOpen(false);
  };

  const handleDelete = idx => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setResources(resources.filter((_, i) => i !== idx));
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
          자료실
        </Typography>
        {isAdmin && (
          <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={() => handleOpen()}>
            작성
          </Button>
        )}
      </motion.div>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {resources.map((resource, index) => (
          <Grid item xs={12} sm={6} md={4} key={resource.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DescriptionIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      {resource.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {resource.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={resource.type} size="small" />
                    <Chip label={resource.size} size="small" />
                    <Chip label={`다운로드 ${resource.downloads}`} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    업로드: {resource.date}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<DownloadIcon />}
                    variant="contained"
                    fullWidth
                    component="a"
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    다운로드
                  </Button>
                  {isAdmin && (
                    <Stack direction="row" spacing={1} sx={{ width: '100%', mt: 1 }}>
                      <Button size="small" variant="outlined" fullWidth onClick={() => handleOpen(index)}>수정</Button>
                      <Button size="small" color="error" variant="outlined" fullWidth onClick={() => handleDelete(index)}>삭제</Button>
                    </Stack>
                  )}
                </CardActions>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle>{editIdx === null ? '자료 작성' : '자료 수정'}</DialogTitle>
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
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            label="다운로드 URL"
            name="url"
            value={form.url}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
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

export default Resources; 