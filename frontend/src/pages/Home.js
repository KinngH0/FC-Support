import React from 'react';
import { Grid, Card, CardContent, Typography, CardActionArea, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';

const baseMenuItems = [
  { title: '공지사항', path: '/notice' },
  { title: '업데이트', path: '/update' },
  { title: '자료실', path: '/resources' },
  { title: '픽률 조회', path: '/pick-rate' },
  { title: '팀컬러 조회', path: '/team-color' },
  { title: '효율조회', path: '/efficiency' },
];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAdmin } = useAdmin();

  const menuItems = isAdmin
    ? [{ title: '관리자 페이지', path: '/admin' }, ...baseMenuItems]
    : baseMenuItems;

  return (
    <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
      {menuItems.map((item, idx) => (
        <Grid item xs={12} sm={4} md={4} key={item.path}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              boxShadow: 'none',
              borderColor: theme.palette.divider,
              bgcolor: 'background.paper',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              '&:hover': {
                borderColor: theme.palette.text.primary,
              },
            }}
          >
            <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%' }}>
              <CardContent
                sx={{
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  p: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {item.title}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default Home; 