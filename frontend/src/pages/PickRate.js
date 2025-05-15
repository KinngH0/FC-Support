import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Autocomplete, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { teamColors } from '../constants/teamColors';

const PickRate = () => {
  const [form, setForm] = useState({
    rankRange: '',
    teamColor: '',
    topN: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeamColorChange = (event, newValue) => {
    setForm(prev => ({
      ...prev,
      teamColor: newValue ? newValue.id : ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API 호출하여 데이터 가져오기
    console.log('Form submitted:', form);
  };

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          픽률조회
        </Typography>
      </motion.div>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              name="rankRange"
              label="랭킹 범위"
              type="number"
              value={form.rankRange}
              onChange={handleChange}
              inputProps={{ max: 10000, min: 1 }}
              placeholder="조회하실 랭킹 범위"
              fullWidth
            />

            <Autocomplete
              freeSolo
              options={teamColors}
              getOptionLabel={(option) => 
                typeof option === 'string' ? option : `${option.name} (${option.color})`
              }
              onChange={handleTeamColorChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="팀컬러"
                  placeholder="팀컬러를 선택하거나 입력하세요"
                />
              )}
            />

            <TextField
              name="topN"
              label="TOP N"
              type="number"
              value={form.topN}
              onChange={handleChange}
              inputProps={{ max: 10, min: 1 }}
              placeholder="집계하실 포지션별 선수 수"
              fullWidth
            />

            <Button type="submit" variant="contained" color="primary" size="large">
              조회
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default PickRate; 