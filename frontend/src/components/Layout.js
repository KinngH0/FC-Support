import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Box,
} from "@mui/material";
import { useTheme as useCustomTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import AdminFab from "./AdminFab";
import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

const SunIcon = ({ size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
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
  boxShadow: "none",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledToolbar = styled(Toolbar)({
  justifyContent: "space-between",
  minHeight: 48,
  paddingLeft: 0,
  paddingRight: 0,
});

const Title = styled(Typography)({
  fontWeight: 600,
  fontSize: 20,
  marginLeft: 4,
  cursor: "pointer",
  userSelect: "none",
});

const ToggleButton = styled(IconButton)(({ theme, isdarkmode }) => ({
  border: `2px solid ${
    isdarkmode === "true" ? theme.palette.grey[400] : "#222"
  }`,
  borderRadius: 8,
  marginLeft: 8,
  padding: 7,
  transition: "border-color 0.2s",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    background: theme.palette.action.hover,
  },
}));

const Footer = styled(Box)(({ theme }) => ({
  padding: 8,
  textAlign: "center",
  background: theme.palette.background.default,
  color: theme.palette.text.secondary,
  fontSize: 13,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const Layout = ({ children }) => {
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <StyledAppBar position="static" elevation={0}>
        <StyledToolbar sx={{ justifyContent: "center", position: "relative" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              position: "absolute",
              left: 0,
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerOpen}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              justifyContent: "center",
              flex: 1,
            }}
            onClick={() => navigate("/")}
          >
            <img
              src={isDarkMode ? "/logo_dk.png" : "/logo_wt.png"}
              alt="로고"
              style={{ height: 50, marginRight: 10 }}
            />
            {/* <Title variant="h6">FC SUPPORT</Title> */}
          </Box>
          <ToggleButton
            color="inherit"
            onClick={toggleTheme}
            isdarkmode={isDarkMode ? "true" : "false"}
            sx={{ position: "absolute", right: 0, mr: "10px" }}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </ToggleButton>
        </StyledToolbar>
      </StyledAppBar>
      <Container
        component="main"
        sx={{ flexGrow: 1, py: 2, maxWidth: "900px" }}
      >
        {children}
      </Container>
      <Footer>
        <div>© 2025 FC SUPPORT.</div>
        <div>FC SUPPORT는 EA Sports 및 NEXON과 관련이 없습니다.</div>
        <div>
          사이트 내 FC 온라인 관련 모든 이미지의 저작권은 EA Sports 및 NEXON에
          있습니다.
        </div>
        <div style={{ marginTop: 4 }}>
          문의:{" "}
          <a href="mailto:fc-support@naver.com">fc-support@naver.com</a>
        </div>
      </Footer>
      <AdminFab />
      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerClose}>
        <Box
          sx={{
            width: 250,
            p: 2,
            bgcolor: (theme) => theme.palette.background.default,
            color: (theme) => theme.palette.text.primary,
            height: "100%",
          }}
          role="presentation"
        >
          <List
            sx={{
              bgcolor: "transparent",
              color: "inherit",
            }}
          >
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  window.open("https://fc-info.com/", "_blank");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="FC INFO" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/notice");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="공지사항" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/update");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="업데이트" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/resources");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="자료실" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/pick-rate");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="픽률 조회" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/team-color");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="팀 컬러 조회" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/efficiency");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="효율 조회" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/review");
                  handleDrawerClose();
                }}
                sx={{
                  bgcolor: "transparent",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText primary="선수 리뷰" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Layout;
