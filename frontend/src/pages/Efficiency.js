import React, { useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Rating, Stack, TextField, Button } from '@mui/material';
import { motion } from 'framer-motion';

const Efficiency = () => {
  const [form, setForm] = useState({
    nickname: '',
    date: ''
  });
  const players = [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API 호출 등 조회 로직 추가
    console.log('조회:', form);
  };

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          효율조회
        </Typography>
      </motion.div>

      {/* 입력 폼 추가 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              name="nickname"
              label="닉네임"
              value={form.nickname}
              onChange={handleChange}
              placeholder="조회하고자 하는 닉네임 입력"
              fullWidth
              required
            />
            <TextField
              name="date"
              label="날짜"
              type="date"
              value={form.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{ pattern: '\\d{4}-\\d{2}-\\d{2}' }}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" color="primary" size="large">
              조회
            </Button>
          </Stack>
        </form>
      </Paper>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableBody>
            {players.map((player, index) => (
              <motion.tr
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                component={TableRow}
              >
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.position}</TableCell>
                <TableCell>{player.overall}</TableCell>
                <TableCell>{player.speed}</TableCell>
                <TableCell>{player.shooting}</TableCell>
                <TableCell>{player.passing}</TableCell>
                <TableCell>{player.dribbling}</TableCell>
                <TableCell>{player.defending}</TableCell>
                <TableCell>{player.physical}</TableCell>
                <TableCell>
                  <Rating value={player.rating} precision={0.5} readOnly />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Efficiency;