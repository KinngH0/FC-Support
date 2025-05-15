import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Container, Box } from '@mui/material';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import AdminFab from './AdminFab';

const SunIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <g stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </g>
  </svg>
);

const MoonIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21 12.79A9 9 0 0 1 12.79 3a7 7 0 1 0 8.21 9.79z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: theme.palette.background.default,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledToolbar = styled(Toolbar)({
  justifyContent: 'space-between',
  minHeight: 48,
  paddingLeft: 0,
  paddingRight: 0,
});

const Title = styled(Typography)({
  fontWeight: 600,
  fontSize: 20,
  marginLeft: 4,
  cursor: 'pointer',
  userSelect: 'none',
});

const ToggleButton = styled(IconButton)(({ theme, isdarkmode }) => ({
  border: `2px solid ${isdarkmode === 'true' ? theme.palette.grey[400] : '#222'}`,
  borderRadius: 8,
  marginLeft: 8,
  padding: 7,
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    background: theme.palette.action.hover,
  },
}));

const Footer = styled(Box)(({ theme }) => ({
  padding: 8,
  textAlign: 'center',
  background: theme.palette.background.default,
  color: theme.palette.text.secondary,
  fontSize: 13,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const Layout = ({ children }) => {
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <StyledAppBar position="static" elevation={0}>
        <StyledToolbar>
          <Title variant="h6" onClick={() => navigate('/')}>FC SUPPORT</Title>
          <ToggleButton
            color="inherit"
            onClick={toggleTheme}
            isdarkmode={isDarkMode ? 'true' : 'false'}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </ToggleButton>
        </StyledToolbar>
      </StyledAppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 2, maxWidth: '900px' }}>
        {children}
      </Container>
      <Footer>
        <div>© 2025 FC SUPPORT.</div>
        <div>FC SUPPORT는 EA Sports 및 NEXON과 관련이 없습니다.</div>
        <div>사이트 내 FC온라인 관련 모든 이미지의 저작권은 EA Sports 및 NEXON에 있습니다.</div>
      </Footer>
      <AdminFab />
    </Box>
  );
};

export default Layout; 