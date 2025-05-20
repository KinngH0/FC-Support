import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';

const Login = () => {
  const { login, loading, error } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.username, form.password);
    setSuccess(ok);
  };

  return (
    <Box sx={{ maxWidth: 360, mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom>관리자 로그인</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="아이디"
          name="username"
          value={form.username}
          onChange={handleChange}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          {loading ? <CircularProgress size={24} /> : '로그인'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>로그인 성공!</Alert>}
      </form>
    </Box>
  );
};

export default Login;
