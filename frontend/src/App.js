import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AdminProvider } from './contexts/AdminContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Notice from './pages/Notice';
import PickRate from './pages/PickRate';
import TeamColor from './pages/TeamColor';
import Efficiency from './pages/Efficiency';
import Resources from './pages/Resources';
import Update from './pages/Update';
import Admin from './pages/Admin';
import Database from './pages/Database';
import Login from './pages/Login';
import Review from './pages/Review';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function AppContent() {
  const { theme } = useTheme();
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notice" element={<Notice />} />
            <Route path="/pick-rate" element={<PickRate />} />
            <Route path="/team-color" element={<TeamColor />} />
            <Route path="/efficiency" element={<Efficiency />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/update" element={<Update />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/database" element={<Database />} />
            <Route path="/login" element={<Login />} />
            <Route path="/review" element={<Review />} />
          </Routes>
        </Layout>
      </Router>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <AppContent />
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;