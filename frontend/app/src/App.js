import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Container, Stack } from '@mui/material';
import DelegationTable from './component/DelegationTable';
import BarChart from './component/BarChart';
import Line3Chart from './component/Line3Chart';
import PieChart from './component/PieChart';
import PolarAreaChart from './component/PolarAreaChart';
import PromoteTable from './component/PromoteTable';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TelegramIcon from '@mui/icons-material/Telegram';


const Header = ({
  systemInfo,
  connectedAccount,
  connectWallet,
  disconnectWallet,
  toggleTheme,
  darkMode,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: darkMode ? '#333' : '#fff',
        color: darkMode ? '#fff' : '#000',
        marginBottom: '20px',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Логотип */}
        <Box display="flex" alignItems="center">
          <img
            src="https://explorer.sophon.xyz/images/logo-sophon.svg"
            alt="Logo"
            style={{ height: '20px', marginRight: '10px' }}
          />
          {!isMobile && (
            <Typography
              variant="h6"
              component="div"
              sx={{ color: darkMode ? '#ddd' : '#888', fontSize: '8px' }}
            >
              Updated: {systemInfo.last_update} (UTC+0) | BLOCK: {systemInfo.last_block}
            </Typography>
          )}
        </Box>

        {/* Кнопки */}
        <Box display="flex" alignItems="center" gap={1}>
          {/* Кнопка Telegram */}
          <IconButton
            component="a"
            href="https://t.me/chelovek86" // Замените ссылкой на ваш Telegram
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: darkMode ? '#fff' : '#000' }}
          >
            <TelegramIcon />
          </IconButton>
          {/* Кнопка переключения темы */}
          <IconButton onClick={toggleTheme} sx={{ color: darkMode ? '#fff' : '#000' }}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          {!connectedAccount ? (
            <Button variant="contained" color="primary" onClick={connectWallet}>
              Connect
            </Button>
          ) : (
            <>
              {!isMobile && (
                <Typography
                  variant="body1"
                  sx={{ color: darkMode ? '#ddd' : '#888', fontSize: '8px', marginRight: '10px' }}
                >
                  {connectedAccount}
                </Typography>
              )}
              <Button variant="contained" color="secondary" onClick={disconnectWallet}>
                Disconnect
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};




const App = ({ toggleTheme, darkMode }) => {
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [promoteTableData, setPromoteTableData] = useState([]);
  const [chartsData, setChartsData] = useState({});
  const [systemInfo, setSystemInfo] = useState({ lastUpdate: '', lastBlock: '' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));


  useEffect(() => {
    const account = localStorage.getItem('connectedAccount');
    if (account) {
      setConnectedAccount(account);
    }
    fetchData();
  }, []);

  useEffect(() => {
    document.title = "Sophon Inspector";
  }, []);


  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      localStorage.setItem('connectedAccount', account);
      setConnectedAccount(account);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem('connectedAccount');
    setConnectedAccount(null);
  };

  const fetchData = async () => {
    try {
      const [tableResponse, promotionResponse, delegationResponse, commissionResponse, uptimeResponse, eventDynamicsResponse, operatorStatusResponse, systemResponse, topDelegatorsResponse] = await Promise.all([
        fetch(`/api/table-data`),
        fetch(`/api/promote-table`),
        fetch(`/api/delegation-distribution`),
        fetch(`/api/commission-distribution`),
        fetch(`/api/uptime-distribution`),
        fetch(`/api/event-dynamics`),
        fetch(`/api/operator-status`),
        fetch(`/api/system-info`),
        fetch(`/api/top-delegators`),
      ]);

      const rawTableData = await tableResponse.json();
      const rawPromoteTableData = await promotionResponse.json();
      const delegationData = await delegationResponse.json();
      const commissionData = await commissionResponse.json();
      const uptimeData = await uptimeResponse.json();
      const eventDynamicsData = await eventDynamicsResponse.json();
      const operatorStatusData = await operatorStatusResponse.json();
      const topDelegatorsData = await topDelegatorsResponse.json();

      const formattedDelegationDistributionData = {
        labels: delegationData.operators.map(op => `${op}`),
        values: delegationData.delegations,
        colors: delegationData.operators.map(() =>
          `rgba(103, 193, 249, 0.6)`
        ),
      };

      const formattedCommissionDistributionData = {
        labels: commissionData.fee.map(op => `${op}`),
        values: commissionData.operators,
        colors: commissionData.fee.map(() =>
          `rgba(103, 193, 249, 0.6)`
        ),
      };

      const formattedUptimeDistributionData = {
        labels: uptimeData.uptime.map(op => `${op}`),
        values: uptimeData.count,
        colors: uptimeData.uptime.map(() =>
          `rgba(103, 193, 249, 0.6)`
        ),
      };

      const formattedEventDynamicsData = {
        labels: eventDynamicsData.dates,
        datasets: [
          {
            label: 'Mint',
            data: eventDynamicsData.mint,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
          },
          {
            label: 'Delegations',
            data: eventDynamicsData.delegations,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
          },
          {
            label: 'Undelegations',
            data: eventDynamicsData.undelegations,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
          },
        ],
      };

      const formattedOperatorStatusData = {
        labels: operatorStatusData.statuses.map(op => (op === 0 ? 'Inactive' : 'Active')),
        values: operatorStatusData.counts,
        colors: operatorStatusData.statuses.map(op =>
          op === 0
            ? 'rgba(255, 99, 132, 0.6)'
            : `rgba(103, 193, 249, 0.6)`
        ),
      };

      const totalMint = formattedEventDynamicsData.datasets
        .find(dataset => dataset.label === 'Mint')
        .data.reduce((sum, value) => sum + value, 0);

      const totalDelegationsMinusUndelegations = formattedEventDynamicsData.datasets
        .find(dataset => dataset.label === 'Delegations')
        .data.reduce((sum, value, index) => {
          const undelegationsValue = formattedEventDynamicsData.datasets
            .find(dataset => dataset.label === 'Undelegations')
            .data[index];
          return sum + (value - undelegationsValue);
        }, 0);

      const formattedSummaryData = {
        labels: ['Total Mint', 'Net Delegations'],
        values: [totalMint, totalDelegationsMinusUndelegations],
        colors: ['rgba(75, 192, 192, 0.6)', `rgba(103, 193, 249, 0.6)`],
      };
      

      // const formattedDelegationDistributionData = {
      //   labels: delegationData.operators.map(op => `Operator ${op}`),
      //   values: delegationData.delegations,
      //   colors: delegationData.operators.map(() =>
      //     `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
      //   ),
      // };

      const formattedTopDelegatorsData = {
        labels: topDelegatorsData.guardian,
        values: topDelegatorsData.total_delegated_nodes,
        colors: topDelegatorsData.guardian.map(() =>
          `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
        ),
      };

      setTableData(
        rawTableData.map((row, index) => ({
          id: index,
          operator: row[0],
          delegatorsCount: row[11] ? row[11].split(',').length : 0,
          delegators: row[11] ? row[11].split(',') : [],
          status: row[1] === 1 ? 'Active' : 'Inactive',
          rewards: row[2] || '-',
          fee: row[3] !== null ? `${row[3]}%` : '-',
          uptime: row[4] !== null ? `${row[4]}%` : '-',
          createdAt: row[5] || '-',
          actualDelegations: row[6] || '-',
          totalDelegateAmount: row[7] || '-',
          totalUndelegateAmount: row[8] || '-',
          totalDelegateOperations: row[9] || '-',
          totalUndelegateOperations: row[10] || '-',
        }))
      );

      setPromoteTableData(
        rawPromoteTableData.map((row, index) => ({
          id: index,
          operator: row[0] || '-',
          status: row[1] === true ? 'Active' : 'Inactive',
          emptySlots: row[2] || '-',
          fee: row[3] !== null ? `${row[3]}%` : '-',
          uptime: row[4] !== null ? `${row[4]}%` : '-',
          createdAt: row[5] || '-',
          nodeText: row[6] || '-',
        }))
      );

      setChartsData({
        delegationDistribution: formattedDelegationDistributionData,
        commissionDistribution: formattedCommissionDistributionData,
        uptimeDistribution: formattedUptimeDistributionData,
        eventDynamics: formattedEventDynamicsData,
        operatorStatus: formattedOperatorStatusData,
        summary: formattedSummaryData,
        topDelegators: formattedTopDelegatorsData,
      });

      setSystemInfo(await systemResponse.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <Container maxWidth="lg" style={{ padding: '20px', borderRadius: '8px' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Header 
          systemInfo={systemInfo} 
          connectedAccount={connectedAccount} 
          connectWallet={connectWallet} 
          disconnectWallet={disconnectWallet} 
          toggleTheme={toggleTheme}
          darkMode={darkMode}
        />
    </Box>

      <Box mb={4}>
        <Typography variant="h5">Delegation Table</Typography>
        <DelegationTable rows={tableData} />
      </Box>
      <Box mb={4}>
        <Typography variant="h5">Promote Table</Typography>
        <PromoteTable rows={promoteTableData} isAuthorized={connectedAccount} refreshData={fetchData}  />
      </Box>
      <Box mb={4}>
        <Typography variant="h5">Charts</Typography>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={2} 
          flexWrap="wrap"
        >
            <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
              <BarChart
                  title="Status of operators"
                  chartId="summaryChart"
                  type="bar"
                  data={chartsData.operatorStatus}
                  height="300px"
                  xAxisTitle="Status"
                  yAxisTitle="Count"
                />
            </Box>
            <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
              <BarChart
                  title="Summary of events"
                  chartId="summaryChart"
                  type="bar"
                  data={chartsData.summary}
                  height="300px"
                  xAxisTitle="Type"
                  yAxisTitle="Count"
                />
            </Box>
          
          <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
            <BarChart
              title="Delegation distribution"
              chartId="delegationDistributionChart1"
              type="bar"
              data={chartsData.delegationDistribution}
              height="300px"
              xAxisTitle="Delegations"
              yAxisTitle="Operators"
            />
          </Box>
          <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
            <BarChart
              title="Commission distribution"
              chartId="commissionDistributionChart"
              type="bar"
              data={chartsData.commissionDistribution}
              height="300px"
              xAxisTitle="%"
              yAxisTitle="Operators"
            />
          </Box>
          <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
            <BarChart
              title="Uptime distribution"
              chartId="uptimeDistributionChart"
              type="bar"
              data={chartsData.uptimeDistribution}
              height="300px"
              xAxisTitle="%"
              yAxisTitle="Operators"
            />
          </Box>
          <Box flex={1} minWidth={{ xs: '100%', md: '45%' }}>
          <Line3Chart
            title="Events dynamics"
            data={chartsData.eventDynamics}
            height="300px"
            xAxisTitle="Date"
            yAxisTitle="Count"
          />
          </Box>
          <Box  flex={1} minWidth={{ xs: '100%', md: '45%', display: isMobile ? 'none' : 'block' }}>
              {/* <PolarAreaChart
                title="Top delegators"
                data={chartsData.topDelegators}
                height="300px"
              /> */}
              <BarChart
                title="Top delegators"
                chartId="topDelegatorsChart"
                type="bar"
                data={chartsData.topDelegators}
                height="300px"
                xAxisTitle="Delegators"
                yAxisTitle="Delegated"
            />
            </Box>
        </Stack>
      </Box>
    </Container>
  );
};

export default App;
