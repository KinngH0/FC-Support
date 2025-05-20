import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CardActionArea,
  useTheme,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../contexts/AdminContext";
import axios from "axios";

const baseMenuItems = [
  { title: "공지사항", path: "/notice" },
  { title: "업데이트", path: "/update" },
  { title: "자료실", path: "/resources" },
  { title: "픽률 조회", path: "/pick-rate" },
  { title: "팀 컬러 조회", path: "/team-color" },
  { title: "효율 조회", path: "/efficiency" },
  { title: "선수 리뷰", path: "/review" }, // 선수 리뷰 버튼 추가
];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAdmin } = useAdmin();

  const menuItems = isAdmin
    ? [{ title: "관리자 페이지", path: "/admin" }, ...baseMenuItems]
    : baseMenuItems;

  React.useEffect(() => {
    axios.post("/api/log-visitor/").catch(() => {});
  }, []);

  return (
    <>
      <Box
        sx={{
          width: "100%",
          mb: 2,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            minHeight: 400,
            bgcolor: "#e0e0e0",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: { xs: 18, sm: 22, md: 24 },
            color: "#333",
            px: { xs: 2, sm: 4 },
            boxSizing: "border-box",
          }}
        >
          추가 예정
        </Box>
      </Box>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          mb: 2,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "none",
            borderColor: theme.palette.divider,
            cursor: "pointer",
            transition: "border-color 0.2s",
            "&:hover": {
              borderColor: theme.palette.text.primary,
            },
            height: 100,
            minHeight: 100,
            maxHeight: 100,
          }}
        >
          <CardActionArea
            onClick={() => window.open("https://fc-info.com/", "_blank")}
            sx={{
              height: "100%",
              minHeight: 100,
              maxHeight: 100,
              borderRadius: 2,
              bgcolor: "#212121",
              transition: "background 0.2s",
              "&:hover": {
                bgcolor: "#333",
              },
            }}
          >
            <CardContent
              sx={{
                height: 100,
                minHeight: 100,
                maxHeight: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <img
                  src="/fc_logo.png"
                  alt="FC INFO 로고"
                  style={{ width: 32, height: 32, marginRight: 12 }}
                />
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "#4eb555",
                    fontFamily: "Arial, Helvetica, sans-serif !important",
                  }}
                >
                  FC INFO
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
      <Grid
        container
        spacing={0}
        justifyContent="center"
        alignItems="center"
        sx={{ minHeight: "30vh", width: "100%", maxWidth: "100%", margin: 0 }}
      >
        {menuItems.map((item, idx) => (
          <Grid item xs={12} sm={4} md={4} key={item.path}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                boxShadow: "none",
                borderColor: theme.palette.divider,
                bgcolor: "background.paper",
                cursor: "pointer",
                transition: "border-color 0.2s",
                "&:hover": {
                  borderColor: theme.palette.text.primary,
                },
                mx: 1,
              }}
            >
              <CardActionArea
                onClick={() => navigate(item.path)}
                sx={{ height: "100%" }}
              >
                <CardContent
                  sx={{
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    p: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 500, color: "text.primary" }}
                  >
                    {item.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default Home;
