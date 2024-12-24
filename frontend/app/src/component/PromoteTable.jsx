import React, { useState } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
    MRT_GlobalFilterTextField,
    MRT_ToggleFiltersButton,
    MRT_ShowHideColumnsButton,
    MRT_ToggleDensePaddingButton,
    MRT_ToggleFullScreenButton,
    MRT_ColumnDef,
    MRT_SortingState,
    MRT_RowVirtualizer,
} from 'material-react-table';

import { Box, Button, IconButton, Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField, Typography, Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
 } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Badge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { padding } from '@mui/system';

const PromoteTable = ({ rows, isAuthorized, refreshData }) => {
  
    const [openDialog, setOpenDialog] = useState(false);
    const [inputText, setInputText] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [openDelegatorsDialog, setOpenDelegatorsDialog] = useState(false);
    const [selectedDelegators, setSelectedDelegators] = useState([]);

    const handleOpenDialog = () => {
      setOpenDialog(true);
      setInputText('');
      setCharCount(0);
    };
  
    const handleCloseDialog = () => {
      setOpenDialog(false);
    };

    const handleInputChange = (event) => {
      const text = event.target.value.slice(0, 50); // Ограничение в 50 символов
      setInputText(text);
      setCharCount(text.length);
    };

    const StyledBadge = styled(Badge)(({ theme }) => ({
        '& .MuiBadge-badge': {
            right: -3,
            top: 13,
            border: `0px solid ${theme.palette.background.paper}`,
            padding: '0 8px',
            backgroundColor: 'rgba(103, 193, 249, 0.9)',
            color: '#000',
        },
    }));

    const handlePromote = async () => {
      try {
        // Подключение к Ethereum
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        console.log('Connected account:', account);
    
        // Сохранение подключенного аккаунта
        localStorage.setItem('connectedAccount', account);
    
        // Генерация подписи для ввода текста
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [inputText, account],
        });
    
        console.log('Generated signature:', signature);
    
        // Отправка данных на сервер
        const response = await fetch(`/api/post-node`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nodeText: inputText, accountAddress: account, signature }),
        });
    
        if (response.ok) {
          console.log('Message successfully sent:', inputText);
          setOpenDialog(false); // Закрываем модальное окно
          setInputText(''); // Сбрасываем текст
          setCharCount(0); // Сбрасываем счетчик символов
          if (refreshData) {
            refreshData(); // Вызываем обновление данных
          }
        } else {
          console.error('Failed to send message:', response.statusText);
          alert('Failed to send the message. Please try again.');
        }
      } catch (error) {
        console.error('Error in handlePromote:', error);
        alert('An error occurred. Please try again.');
      }
    };
    


    
  

    const columns = [
    {
        accessorKey: 'operator',
        header: 'Operator',
        minSize: 50,
        maxSize: 250,
        size: 200,
        Cell: ({ cell }) => (
            cell.getValue()
        ),
    },
    {
        accessorKey: 'status',
        header: 'Status',
        size: 80,
        Cell: ({ cell }) => (
            <Box
                component="span"
                sx={(theme) => ({
                    backgroundColor:
                    cell.getValue() === 'Active'
                    ? 'rgba(75, 192, 192, 1)' // Цвет для Active
                    : 'rgba(255, 99, 132, 1)', // Цвет для Inactive
                    borderRadius: '0.5rem',
                    color: '#fff',
                    padding: '0.5rem',
                })}
                >
                {cell.getValue()}
            </Box>
        ),
    },
    { accessorKey: 'emptySlots', header: 'Empty Slots', size: 80 },
    { accessorKey: 'fee', header: 'Fee', size: 80 },
    { accessorKey: 'uptime', header: 'Uptime', size: 80 },
    { accessorKey: 'createdAt', header: 'Created At', size: 80 },
    { accessorKey: 'nodeText', header: 'Message', size: 180 },

  ];

  const table = useMaterialReactTable({
    columns,
    
    data: rows,
    enableRowVirtualization: false,
    enableGlobalFilter: true,
    enableFacetedValues: true,
    enableColumnFilters: true,
    enableRowSelection: false,
    enableBottomToolbar: true,
    enableStickyHeader: true,
    enableStickyFooter: true,
    // paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    muiSearchTextFieldProps: {
      size: 'small',
      variant: 'outlined',
    },
    muiPaginationProps: {
      color: 'primary',
      rowsPerPageOptions: [10, 20, 30],
      showRowsPerPage: false,
      variant: 'outlined',
      shape: 'rounded',
      variant: 'outlined',
      sx: {},
    },
    muiTableContainerProps: { sx: { } },
    muiTableBodyCellProps: {
      sx: (theme) => ({
        backgroundColor:
          theme.palette.mode === 'dark'
            ? theme.palette.grey[900]
            : theme.palette.grey[150],
      }),
    },
    initialState: {
      density: 'compact',
      showGlobalFilter: true,
      showColumnFilters: false,
      columnVisibility: { 
        rewards: false,
        totalDelegateAmount: false, 
        totalUndelegateAmount: false, 
        totalDelegateOperations: false, 
        totalUndelegateOperations: false }
    },
    renderTopToolbar: ({ table }) => (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem',
          gap: '0.5rem',
        }}
      >
        <Box>
          <Button
            color="success"
            variant="contained"
            disabled={!isAuthorized}
            onClick={handleOpenDialog}
          >
            Promote
          </Button>
          
        </Box>
      </Box>
    )
  });
  

  return (
    <>
    <Box sx={{ width: '100%', overflow: 'auto' }}>
        <MaterialReactTable table={table}/>
    </Box>
    <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Promote Node</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Enter your message (max 50 characters):
          </Typography>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            variant="outlined"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Enter message here..."
          />
          <Typography variant="caption">{charCount}/50 characters</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handlePromote} color="primary" disabled={inputText.trim().length === 0}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PromoteTable;
