import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Chip, TextField, Button, Stack, Paper } from '@mui/material';
import { motion } from 'framer-motion';

const TeamColor = () => {
  const [form, setForm] = useState({
    rankRange: '',
    topN: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API 호출하여 데이터 가져오기
    console.log('Form submitted:', form);
  };

  const teamColors = [];

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          팀컬러 조회
        </Typography>
      </motion.div>

      <Paper sx={{ p: 3, mb: 3 }}>
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

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {teamColors.map((team, index) => (
          <Grid item xs={12} sm={6} md={4} key={team.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={team.image}
                  alt={team.name}
                />
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">
                    {team.name}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {team.colors.map((color) => (
                      <Chip
                        key={color}
                        label={color}
                        sx={{ mr: 1, mb: 1 }}
                        size="small"
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {team.description}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TeamColor; 