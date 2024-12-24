import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Chart from 'chart.js/auto';

const PolarAreaChart = ({ data, title, height }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');

    // Уничтожаем предыдущий график, если он есть
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Создаем новый график
    chartInstance.current = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            backgroundColor: data.colors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
        },
      },
    });

    return () => {
      // Уничтожаем график при размонтировании
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <Box>
      <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography>
      <canvas ref={chartRef} style={{ height: `${height} !important` }}></canvas>
    </Box>
  );
};

export default PolarAreaChart;
