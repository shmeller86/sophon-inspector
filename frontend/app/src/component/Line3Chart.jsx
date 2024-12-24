import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Chart from 'chart.js/auto';

const Line3Chart = ({ data, title, height, xAxisTitle, yAxisTitle }) => {
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
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          borderWidth: 1,
          pointRadius: 1,
        })),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
        scales: {
            x: {
              title: {
                display: true,
                text: xAxisTitle, // Подпись для оси X
                color: '#666', // Цвет текста
                font: {
                  size: 14, // Размер текста
                },
              },
            },
            y: {
              title: {
                display: true,
                text: yAxisTitle, // Подпись для оси Y
                color: '#666', // Цвет текста
                font: {
                  size: 14, // Размер текста
                },
              },
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
      {/* <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography> */}
      <canvas ref={chartRef} style={{ height: `${height} !important` }}></canvas>
    </Box>
  );
};

export default Line3Chart;
