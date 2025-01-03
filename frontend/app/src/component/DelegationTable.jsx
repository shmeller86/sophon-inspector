import React, { useState, useEffect, useMemo } from 'react';
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
  TableRow, Button, Modal
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Badge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { padding } from '@mui/system';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Switch, FormControlLabel } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';
import { useTheme } from '@mui/material/styles';

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

const DetailPanel = ({ row, showSnackbar }) => {
  const operator = row.original.operator;
  const { data, isLoading, isError } = useFetchDetails(operator, row.getIsExpanded());
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Typography color="error">Error loading details</Typography>;
  }


  return (
    <TableContainer component={Box} sx={{ padding: '0px', maxWidth: '1000px', backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[200] }}>
      {data && data.length > 0 ? (
        <Table size="small" aria-label="details table">
          <TableHead>
            <TableRow>
              <TableCell><strong></strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>TX</strong></TableCell>
              <TableCell><strong>Delegator</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(([id, address, type, amount, owner, createdAt]) => { 
              const txLink = `https://explorer.sophon.xyz/tx/${address}`;
              const shortenedAddress = `${address.slice(0, 4)}...${address.slice(-2)}`;
              const delegatorLink = `https://explorer.sophon.xyz/address/${owner}`;
              const shortenedOwner = `${owner.slice(0, 4)}...${owner.slice(-2)}`;
              return (
              <TableRow key={id}>
                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {type.toLowerCase() === 'delegate' ? (
                    <BookmarkAddIcon
                      sx={{
                        color: 'rgba(75, 192, 192, 1)',
                        paddingRight: '4px',
                        marginRight: '4px',
                      }}
                    />
                  ) : (
                    <BookmarkRemoveIcon
                      sx={{
                        color: 'rgba(255, 99, 132, 1)',
                        paddingRight: '4px',
                        marginRight: '4px',
                      }}
                    />
                  )}
                  {type}
                </TableCell>
                <TableCell>{amount}</TableCell>
                <TableCell>{shortenedAddress}
                  <Tooltip title="Copy to clipboard">
                      <IconButton onClick={() => {
                          navigator.clipboard.writeText(address);
                          showSnackbar(`Transaction ${address} copied to clipboard`, 'success');
                        }}
                        sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                      >
                          <ContentCopyIcon />
                      </IconButton>
                  </Tooltip>
                  <Tooltip title="Open in explorer">
                      <IconButton onClick={() => {
                          window.open(txLink, '_blank');
                        }}
                        sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                      >
                          <OpenInNewIcon />
                      </IconButton>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {shortenedOwner}
                  <Tooltip title="Copy to clipboard">
                      <IconButton onClick={() => {
                          navigator.clipboard.writeText(owner);
                          showSnackbar(`Delegator ${owner} copied to clipboard`, 'success');
                        }}
                        sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                      >
                          <ContentCopyIcon />
                      </IconButton>
                  </Tooltip>
                  <Tooltip title="Open in explorer">
                      <IconButton onClick={() => {
                          window.open(delegatorLink, '_blank');
                        }}
                        sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                      >
                          <OpenInNewIcon />
                      </IconButton>
                  </Tooltip>  
                </TableCell>
                <TableCell>{new Date(createdAt).toLocaleString()}</TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      ) : (
        <Typography>No details available</Typography>
      )}
    </TableContainer>
  );
};

const DelegationTable = ({ rows, isLoading, showSnackbar }) => {
    const [favorites, setFavorites] = useState(
      JSON.parse(localStorage.getItem('favoriteOperators')) || []
    );
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const handleToggleFavorites = () => {
      setShowOnlyFavorites(!showOnlyFavorites);
    };

    const [openDelegatorsDialog, setOpenDelegatorsDialog] = useState(false);
    const [selectedDelegators, setSelectedDelegators] = useState([]);

    const toggleFavorite = (operator) => {
      if (favorites.includes(operator)) {
        setFavorites(favorites.filter((fav) => fav !== operator));
        showSnackbar(`Operator ${operator} removed from favorites`, 'success');
      } else {
        setFavorites([...favorites, operator]);
        showSnackbar(`Operator ${operator} added to favorites`, 'success');
      }
    };

    useEffect(() => {
      localStorage.setItem('favoriteOperators', JSON.stringify(favorites));
    }, [favorites]);

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

    const filteredRows = useMemo(() => {
      if (showOnlyFavorites) {
        return rows.filter((row) => favorites.includes(row.operator));
      }
      return rows;
    }, [rows, favorites, showOnlyFavorites]);

    const columns = [
      {
        accessorKey: 'operator',
        header: 'Operator',
        minSize: 50,
        maxSize: 100,
        size: 100,
        Cell: ({ cell }) => {
            const value = cell.getValue();
            const shortenedValue = `${value.slice(0, 6)}...${value.slice(-4)}`;
            const isFavorite = favorites.includes(value);
            return (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <Typography variant="body2" noWrap>
                        {shortenedValue}
                        <Tooltip title="Copy to clipboard">
                            <IconButton onClick={() => {
                                navigator.clipboard.writeText(value);
                                showSnackbar(`Operator ${value} copied to clipboard`, 'success');
                              }}
                              sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                            >
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                          <IconButton
                            onClick={() => toggleFavorite(value)}
                            sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                          >
                            {isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                          </IconButton>
                        </Tooltip>
                    </Typography>
                </Box>
            );
        },
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
      filterVariant: 'checkbox',
      filterFn: (row, columnId, filterValue) => {
        const rowValue = row.getValue(columnId);
        if (!filterValue) {
          console.log('FilterValue is empty, showing all records');
          return true;
        }
        if (filterValue.includes(true) && rowValue === 'Active') {
          return true;
        } else if (filterValue.includes(false) && rowValue === 'Inactive') {
          return true;
        }
        return false;
      },
      size: 150,
      Cell: ({ row }) => {
        const status = row.original.status;
        const lastNodeUpdate = row.original.lastNodeUpdate;
        const operator = row.original.operator;
        const [open, setOpen] = useState(false);
        const [nodeData, setNodeData] = useState(null);

        const handleOpen = async () => {
          try {
            const response = await fetch(`https://monitor.sophon.xyz/nodes?operators=${operator}`);
            const data = await response.json();
            setNodeData(data);
            setOpen(true);
          } catch (error) {
            console.error('Error fetching node data:', error);
          }
        };
    
        const handleClose = () => {
          setOpen(false);
        };
        
        const currentDate = new Date();
        const lastUpdateDate = new Date(lastNodeUpdate);
        const oneDatAgo = new Date(currentDate.getTime() - 60 * 60 * 24 * 1000);
        
        const showUpdated = lastUpdateDate < oneDatAgo;
        
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  status === 'Active'
                    ? 'rgba(75, 192, 192, 1)' // Цвет для Active
                    : 'rgba(255, 99, 132, 1)', // Цвет для Inactive
                borderRadius: '0.5rem',
                color: '#fff',
                padding: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {status}
              <Button disabled={open} onClick={handleOpen} variant="contained" size="small" startIcon={<HttpIcon />} sx={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                Check
              </Button>
            </Box>
            {showUpdated && (
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '8px' }}>
                updated: {new Date(lastNodeUpdate).toLocaleString()}
              </Typography>
            )}


              

        <Modal open={open} onClose={handleClose}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}>

            {nodeData ? (
              <pre>{JSON.stringify(nodeData, null, 2)}</pre>
            ) : (
              <Typography>Loading...</Typography>
            )}
            <Button onClick={handleClose} variant="contained" size="small">Close</Button>
          </Box>
        </Modal>

        
          </Box>
        );
      },
    },
    { accessorKey: 'rewards', header: 'Rewards', size: 80,},
    { accessorKey: 'fee', 
      header: 'Fee', 
      size: 120,
      Cell: ({ cell }) => `${Number(cell.getValue()).toFixed(1)}%`,
      filterVariant: 'range-slider',
        filterFn: 'betweenInclusive', // default (or between)
        muiFilterSliderProps: {
          marks: true,
          max: 100.0, //custom max (as opposed to faceted max)
          min: 0.0, //custom min (as opposed to faceted min)
          step: 0.5,
        },
    },
    { accessorKey: 'uptime', 
      header: 'Uptime', 
      size: 120,
      Cell: ({ cell }) => `${Number(cell.getValue()).toFixed(1)}%`,
      filterVariant: 'range-slider',
        filterFn: 'betweenInclusive', // default (or between)
        muiFilterSliderProps: {
          marks: true,
          max: 100.0, //custom max (as opposed to faceted max)
          min: 0.0, //custom min (as opposed to faceted min)
          step: 1,
        },
    },
    { accessorKey: 'createdAt', 
      header: 'Created At', 
      size: 80,
      filterFn: 'includesString',
      Cell: ({ cell }) => {
        const value = cell.getValue();
        return <Typography variant="body2">{new Date(value).toLocaleString()}</Typography>;
      },
    },
    { accessorKey: 'actualDelegations', 
      header: 'Delegations', 
      size: 120,
      filterVariant: 'range-slider',
      filterFn: 'betweenInclusive',
      muiFilterSliderProps: {
        marks: true,
        max: 20,
        min: 0,
        step: 1,
      },
      Cell: ({ cell }) => {
        const value = cell.getValue();
        if (value === null) {
          return <Typography variant="body2">-</Typography>;
        }
        if (value < 0) {
          return <Typography variant="body2">0</Typography>;
        }
        return <Typography variant="body2">{value}</Typography>;
      },
    },
    { accessorKey: 'totalDelegateAmount', header: 'Total Delegate Amount', size: 80, enableHiding: true },
    { accessorKey: 'totalUndelegateAmount', header: 'Total Undelegate Amount', size: 80, enableHiding: true },
    { accessorKey: 'totalDelegateOperations', header: 'Total Delegate Operations', size: 80, enableHiding: true },
    { accessorKey: 'totalUndelegateOperations', header: 'Total Undelegate Operations', size: 80, enableHiding: true },
    { accessorKey: 'currentDelegators', 
      header: 'Current Delegators', 
      size: 80, 
      enableHiding: true,
      Cell: ({ cell }) => {
        const values = cell.getValue();
        const lines = values ? values.split(',') : [];
      
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {lines.length > 0 ? (
              lines.map((line, index) => {
                const shortenedValue = `${line.slice(0, 6)}...${line.slice(-4)}`; // Сокращаем каждую строку
                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {shortenedValue}
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton
                        onClick={() => {
                          navigator.clipboard.writeText(line);
                          showSnackbar(`Value ${line} copied to clipboard`, 'success');
                        }}
                        sx={{ padding: '0px 0px 0px 4px', margin: '0px' }}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })
            ) : (
              <Typography variant="body2" color="textSecondary">
                -
              </Typography>
            )}
          </Box>
        );
      },
      
    },
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
    
    data: filteredRows,
    enableRowVirtualization: false,
    enableGlobalFilter: true,
    globalFilterFn: 'contains',
    enableFacetedValues: true,
    enableColumnFilters: true,
    enableRowSelection: false,
    enableBottomToolbar: true,
    enableStickyHeader: false,
    enableStickyFooter: false,
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
    renderDetailPanel: ({ row }) => <DetailPanel row={row} showSnackbar={showSnackbar} />,
    muiTableContainerProps: { sx: { } },
    muiTableBodyCellProps: {
      sx: (theme) => ({
        backgroundColor:
          theme.palette.mode === 'dark'
            ? theme.palette.grey[900]
            : theme.palette.grey[150],
      }),
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: '1rem', p: '0.5rem', flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={showOnlyFavorites}
              onChange={handleToggleFavorites}
              color="primary"
            />
          }
          label="Show only favorites"
        />
      </Box>
    ),

    initialState: {
      density: 'compact',
      showGlobalFilter: true,
      showColumnFilters: false,
      columnVisibility: { 
        rewards: false,
        totalDelegateAmount: false, 
        totalUndelegateAmount: false, 
        totalDelegateOperations: false, 
        totalUndelegateOperations: false,
        currentDelegators: false,
      },
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: { pageSize:25, pageIndex: 0 },

      paginationDisplayMode: 'pages',
        
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }
  

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
