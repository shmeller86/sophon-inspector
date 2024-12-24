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

import { Box, IconButton, Dialog, DialogTitle, DialogContent, Typography, Tooltip,
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


// Хук для выполнения запросов
const useFetchDetails = (operator, enabled) => {
  return useQuery({
    queryKey: ['operatorDetails', operator],
    queryFn: async () => {
      const response = await fetch(
        `/api/operator-details?operator=${operator}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch details');
      }
      return response.json();
    },
    enabled, // Запрос выполняется только если enabled = true
    staleTime: 60 * 1000, // Кэш сохраняется на 60 секунд
  });
};

const DetailPanel = ({ row }) => {
  const operator = row.original.operator;
  const { data, isLoading, isError } = useFetchDetails(operator, row.getIsExpanded());

  if (isLoading) {
    return <CircularProgress />;
  }

  if (isError) {
    return <Typography color="error">Error loading details</Typography>;
  }

  return (
    <TableContainer component={Box} sx={{ padding: '0px', maxWidth: '1000px' }}>
      {data && data.length > 0 ? (
        <Table size="small" aria-label="details table">
          <TableHead>
            <TableRow>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>TX</strong></TableCell>
              <TableCell><strong>Delegator</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(([id, address, type, amount, owner, createdAt]) => (
              <TableRow key={id}>
                <TableCell>{type}</TableCell>
                <TableCell>{amount}</TableCell>
                <TableCell><a href={`https://explorer.sophon.xyz/tx/${address}`} target="_blank" rel="noopener noreferrer">{address}</a></TableCell>
                <TableCell><a href={`https://explorer.sophon.xyz/address/${owner}`} target="_blank" rel="noopener noreferrer">{owner}</a></TableCell>
                <TableCell>{new Date(createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography>No details available</Typography>
      )}
    </TableContainer>
  );
};

const DelegationTable = ({ rows }) => {
    const [openDelegatorsDialog, setOpenDelegatorsDialog] = useState(false);
    const [selectedDelegators, setSelectedDelegators] = useState([]);

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
        accessorKey: 'delegatorsCount',
        header: 'Delegators',
        size: 80,
        Cell: ({ row, cell }) => (
            <Tooltip title="View Delegators">
              <IconButton sx={{ padding: 0 }}
                  onClick={() => handleDelegatorsClick(row.original.delegators)}
              >
                  <StyledBadge badgeContent={cell.getValue()}>
                  <PeopleAltIcon />
                  </StyledBadge>
              </IconButton>
            </Tooltip>
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
    { accessorKey: 'rewards', header: 'Rewards', size: 80,},
    { accessorKey: 'fee', header: 'Fee', size: 80 },
    { accessorKey: 'uptime', header: 'Uptime', size: 80 },
    { accessorKey: 'createdAt', header: 'Created At', size: 80 },
    { accessorKey: 'actualDelegations', header: 'Actual Delegations', size: 80 },
    { accessorKey: 'totalDelegateAmount', header: 'Total Delegate Amount', size: 80, enableHiding: true },
    { accessorKey: 'totalUndelegateAmount', header: 'Total Undelegate Amount', size: 80, enableHiding: true },
    { accessorKey: 'totalDelegateOperations', header: 'Total Delegate Operations', size: 80, enableHiding: true },
    { accessorKey: 'totalUndelegateOperations', header: 'Total Undelegate Operations', size: 80, enableHiding: true },
  ];

  const handleDelegatorsClick = (delegators) => {
    setSelectedDelegators(delegators);
    setOpenDelegatorsDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDelegatorsDialog(false);
  };

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
    renderDetailPanel: ({ row }) => <DetailPanel row={row} />,
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
  });
  

  return (
    <>
    <Box sx={{ width: '100%', overflow: 'auto' }}>
        <MaterialReactTable table={table}/>
    </Box>

      {/* Dialog for showing delegators */}
      <Dialog open={openDelegatorsDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Delegators</DialogTitle>
        <DialogContent>
          {selectedDelegators.length > 0 ? (
            selectedDelegators.map((delegator, index) => (
              <Typography key={index}>
                <a
                  href={`https://explorer.sophon.xyz/address/${delegator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1976d2', textDecoration: 'none' }}
                >
                  {delegator}
                </a>
              </Typography>
            ))
          ) : (
            <Typography>No delegators found</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DelegationTable;
