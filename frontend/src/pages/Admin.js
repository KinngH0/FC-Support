import React, { useEffect, useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Tabs, Tab, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, List, ListItem, ListItemText, Button, TextField, Stack, Alert, LinearProgress, TablePagination } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import Database from './Database';

const tabList = [
  { label: '트래픽/방문자', value: 'traffic' },
  { label: '서버/시스템', value: 'server' },
  { label: '사용자 행동', value: 'user' },
  { label: '보안', value: 'security' },
  { label: '데이터/콘텐츠', value: 'data' },
  { label: '알림/경고', value: 'alert' },
  { label: 'DB', value: 'db' },
];

function TabPanel({ value, current, children }) {
  if (value !== current) return null;
  return <Box sx={{ py: 2 }}>{children}</Box>;
}

// 트래픽 관련
const TRAFFIC_KEY = 'fc_support_traffic';
function recordTraffic(path) {
  const ref = document.referrer || '직접 방문';
  const data = JSON.parse(localStorage.getItem(TRAFFIC_KEY) || '{}');
  const today = new Date().toISOString().slice(0, 10);
  if (!data[today]) data[today] = { visitors: new Set(), pageviews: 0, pages: {}, referrers: {} };
  const visitorId = btoa(navigator.userAgent + (window.navigator.language || ''));
  data[today].visitors = new Set([...(data[today].visitors || []), visitorId]);
  data[today].pageviews = (data[today].pageviews || 0) + 1;
  data[today].pages[path] = (data[today].pages[path] || 0) + 1;
  data[today].referrers[ref] = (data[today].referrers[ref] || 0) + 1;
  data[today].visitors = Array.from(data[today].visitors);
  localStorage.setItem(TRAFFIC_KEY, JSON.stringify(data));
}
function getTodayTraffic() {
  const data = JSON.parse(localStorage.getItem(TRAFFIC_KEY) || '{}');
  const today = new Date().toISOString().slice(0, 10);
  return data[today] || { visitors: [], pageviews: 0, pages: {}, referrers: {} };
}

// 사용자 행동 기록
const USER_EVENT_KEY = 'fc_support_user_events';
function logUserEvent(type, detail) {
  const arr = JSON.parse(localStorage.getItem(USER_EVENT_KEY) || '[]');
  arr.unshift({ time: new Date().toLocaleString(), type, detail });
  localStorage.setItem(USER_EVENT_KEY, JSON.stringify(arr.slice(0, 100)));
}
function getUserEvents() {
  return JSON.parse(localStorage.getItem(USER_EVENT_KEY) || '[]');
}

// 보안(로그인 시도/실패/잠금)
const ADMIN_LOG_KEY = 'fc_support_admin_log';
function logAdminEvent(type, detail) {
  const arr = JSON.parse(localStorage.getItem(ADMIN_LOG_KEY) || '[]');
  arr.unshift({ time: new Date().toLocaleString(), type, detail });
  localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify(arr.slice(0, 100)));
}
function getAdminEvents() {
  return JSON.parse(localStorage.getItem(ADMIN_LOG_KEY) || '[]');
}

// 보안(IP 차단)
const BLOCKED_IP_KEY = 'fc_support_blocked_ips';
function getBlockedIps() {
  return JSON.parse(localStorage.getItem(BLOCKED_IP_KEY) || '[]');
}
function setBlockedIps(arr) {
  localStorage.setItem(BLOCKED_IP_KEY, JSON.stringify(arr));
}
function getMyIp() {
  return localStorage.getItem('fc_support_my_ip') || '';
}

// 더미 함수(임시)
function getAlerts() {
  return [];
}
function getContentStats() {
  return { totalUsers: 0, activeUsers: 0, totalPosts: 0, totalComments: 0 };
}
function logAlert(msg, type) {
  // 실제 알림 추가 로직 필요시 구현
}

// 실제 데이터만 사용하도록 수정
const Admin = () => {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('traffic');
  const [traffic, setTraffic] = useState(getTodayTraffic());
  const [userEvents, setUserEvents] = useState(getUserEvents());
  const [adminEvents, setAdminEvents] = useState(getAdminEvents());
  const [blockedIps, setBlockedIpsState] = useState(getBlockedIps());
  const [ipInput, setIpInput] = useState('');
  const [alertList, setAlertList] = useState(getAlerts());
  const [myIp] = useState(getMyIp());
  const [notifications, setNotifications] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [serverStats, setServerStats] = useState({ cpu: 0, memory: 0, disk: 0 });
  const [contentStats, setContentStats] = useState({ totalUsers: 0, activeUsers: 0, totalPosts: 0, totalComments: 0 });

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  useEffect(() => {
    recordTraffic(location.pathname);
    setTraffic(getTodayTraffic());
  }, [location.pathname]);

  // 사용자 행동/관리자/알림 데이터 실시간 반영
  useEffect(() => {
    setUserEvents(getUserEvents());
    setAdminEvents(getAdminEvents());
    setAlertList(getAlerts());
    setContentStats(getContentStats());
  }, [tab]);

  // IP 차단/해제
  const handleBlockIp = () => {
    if (!ipInput.trim()) return;
    if (blockedIps.includes(ipInput.trim())) return;
    const arr = [ipInput.trim(), ...blockedIps];
    setBlockedIps(arr);
    setBlockedIpsState(arr);
    setIpInput('');
    logAlert(`IP ${ipInput.trim()} 차단`, 'warning');
  };
  const handleUnblockIp = (ip) => {
    const arr = blockedIps.filter(i => i !== ip);
    setBlockedIps(arr);
    setBlockedIpsState(arr);
    logAlert(`IP ${ip} 차단 해제`, 'info');
  };

  // 클라이언트 환경 정보
  const clientInfo = {
    브라우저: navigator.userAgent,
    언어: navigator.language,
    온라인: navigator.onLine ? '온라인' : '오프라인',
    플랫폼: navigator.platform,
    메모리: navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '알 수 없음',
    코어수: navigator.hardwareConcurrency || '알 수 없음',
  };

  return (
    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 0, minWidth: 360, width: '100%', maxWidth: 900 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {tabList.map(t => (
            <Tab key={t.value} label={t.label} value={t.value} />
          ))}
        </Tabs>
        <Box sx={{ p: 3 }}>
          {/* 트래픽/방문자 */}
          <TabPanel value="traffic" current={tab}>
            <Typography variant="h6">트래픽/방문자</Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ mb: 2 }}>
              <Chip label={`오늘 방문자: ${traffic.visitors.length}`} sx={{ mr: 1 }} />
              <Chip label={`페이지뷰: ${traffic.pageviews}`} sx={{ mr: 1 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>인기 페이지</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>페이지</TableCell>
                    <TableCell align="right">뷰</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(traffic.pages).map(([page, count]) => (
                    <TableRow key={page}>
                      <TableCell>{page}</TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle1">유입 경로</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>경로</TableCell>
                    <TableCell align="right">횟수</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(traffic.referrers).map(([ref, count]) => (
                    <TableRow key={ref}>
                      <TableCell>{ref}</TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          {/* 서버/시스템 */}
          <TabPanel value="server" current={tab}>
            <Typography variant="h6">서버/시스템</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">서버 사용률 (최근 24시간, 1시간 간격)</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={12} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip labelFormatter={(value) => {
                  const hour = value[0];
                  return `시간: ${hour}`;
                }} />
                <Line type="monotone" dataKey="cpu" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
                <Line type="monotone" dataKey="disk" stroke="#ffc658" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </TabPanel>
          {/* 사용자 행동 */}
          <TabPanel value="user" current={tab}>
            <Typography variant="h6">사용자 행동</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">사용자 행동 기록</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>세부 정보</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userEvents.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell>{event.time}</TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>{event.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          {/* 보안 */}
          <TabPanel value="security" current={tab}>
            <Typography variant="h6">보안</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">관리자 로그인 기록</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>세부 정보</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminEvents.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell>{event.time}</TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>{event.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle1">IP 차단 관리</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IP</TableCell>
                    <TableCell>차단 여부</TableCell>
                    <TableCell>조치</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {blockedIps.map((ip, index) => (
                    <TableRow key={index}>
                      <TableCell>{ip}</TableCell>
                      <TableCell>{blockedIps.includes(ip) ? '차단됨' : '차단되지 않음'}</TableCell>
                      <TableCell>
                        {blockedIps.includes(ip) ? (
                          <Button variant="outlined" color="error" onClick={() => handleUnblockIp(ip)}>차단 해제</Button>
                        ) : (
                          <Button variant="outlined" color="success" onClick={() => handleBlockIp()}>차단</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          {/* 데이터/콘텐츠 */}
          <TabPanel value="data" current={tab}>
            <Typography variant="h6">데이터/콘텐츠</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">서버 통계</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>통계</TableCell>
                    <TableCell align="right">값</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(serverStats).map(([stat, value]) => (
                    <TableRow key={stat}>
                      <TableCell>{stat}</TableCell>
                      <TableCell align="right">{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle1">콘텐츠 통계</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>통계</TableCell>
                    <TableCell align="right">값</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(contentStats).map(([stat, value]) => (
                    <TableRow key={stat}>
                      <TableCell>{stat}</TableCell>
                      <TableCell align="right">{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          {/* 알림/경고 */}
          <TabPanel value="alert" current={tab}>
            <Typography variant="h6">알림/경고</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">알림 목록</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>알림</TableCell>
                    <TableCell>세부 정보</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notification, index) => (
                    <TableRow key={index}>
                      <TableCell>{notification.title}</TableCell>
                      <TableCell>{notification.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="subtitle1">에러 로그</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>에러</TableCell>
                    <TableCell>세부 정보</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{log.title}</TableCell>
                      <TableCell>{log.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          {/* DB */}
          <TabPanel value="db" current={tab}>
            <Database />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default Admin;