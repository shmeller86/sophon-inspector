import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Chart from 'chart.js/auto';

const BarChart = ({ title, chartId, type, data, height, xAxisTitle, yAxisTitle }) => {
  const chartRef = useRef(null); // Ref для canvas
  const chartInstance = useRef(null); // Ref для хранения экземпляра графика

  useEffect(() => {
    if (!data || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');

    // Уничтожить предыдущий экземпляр графика
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Создать новый экземпляр графика
    chartInstance.current = new Chart(ctx, {
      type: type,
      data: {
        labels: data.labels,
        datasets: [
          {
            label: title,
            data: data.values,
            backgroundColor: data.colors,
            borderColor: data.colors.map(color => color.replace('0.6', '1')), // Прозрачность для границы
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Отключаем сохранение пропорций
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

    // Уничтожить график при размонтировании компонента
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, type, title]);

  return (
    <Box mb={4} sx={{ height }}>
      <canvas id={chartId} ref={chartRef}></canvas>
    </Box>
  );
};

export default BarChart;
