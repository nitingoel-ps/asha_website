import React from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  SubTitle,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

// Register the required Chart.js components
ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, Filler, SubTitle);

function ObservationGraph({ data }) {
  const { observationName, points, uom, referenceRange, explanation } = data;

  // Sort points by date before processing
  const sortedPoints = points
    .slice() // Create a shallow copy to avoid mutating the original array
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Prepare the data for Chart.js
  const chartData = {
    labels: sortedPoints.map((point) => point.date), // Sorted dates
    datasets: [
      // Reference range (background area)
      referenceRange ? {
        label: "Reference Range",
        data: sortedPoints.map((point) => ({
          x: point.date,
          y: referenceRange.high
        })),
        backgroundColor: "rgba(231, 248, 231, 0.5)", // Light green fill
        borderWidth: 0, // No border for the reference range
        pointRadius: 0, // No points for this dataset
        fill: {
          target: {
            value: referenceRange.low
          },
          above: "rgba(190, 243, 190, 0.5)",
          below: "transparent"
        },
        order: 2, // Render behind the observation line
      } : null,
      // Observation levels (line and points)
      {
        label: `${observationName} (${uom})`,
        data: sortedPoints.map((point) => ({
          x: point.date,
          y: observationName === "Blood Pressure" ? point.value.split("/")[0] : point.value
        })),
        borderColor: "#007bff",
        borderWidth: 2,
        pointBackgroundColor: sortedPoints.map((point) =>
          observationName === "Blood Pressure" ? "blue" : (point.value < referenceRange?.low || point.value > referenceRange?.high ? "red" : "green")
        ),
        pointBorderColor: sortedPoints.map((point) =>
          observationName === "Blood Pressure" ? "blue" : (point.value < referenceRange?.low || point.value > referenceRange?.high ? "red" : "green")
        ),
        pointRadius: sortedPoints.map((point) =>
          observationName === "Blood Pressure" ? 4 : (point.value < referenceRange?.low || point.value > referenceRange?.high ? 6 : 4)
        ),
        pointStyle: sortedPoints.map((point) =>
          observationName === "Blood Pressure" ? "circle" : (point.value < referenceRange?.low || point.value > referenceRange?.high ? "rect" : "circle")
        ),
        order: 1,
      },
      observationName === "Blood Pressure" ? {
        label: `${observationName} Diastolic (${uom})`,
        data: sortedPoints.map((point) => ({
          x: point.date,
          y: point.value.split("/")[1]
        })),
        borderColor: "#ff0000",
        borderWidth: 2,
        pointBackgroundColor: "red",
        pointBorderColor: "red",
        pointRadius: 4,
        pointStyle: "circle",
        order: 1,
      } : null,
    ].filter(Boolean), // Filter out null datasets
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to adapt to container height
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const pointValue = context.raw.y;
            const isOutOfRange =
              pointValue < referenceRange?.low || pointValue > referenceRange?.high;
            const rangeLabel = isOutOfRange
              ? pointValue < referenceRange?.low
                ? "Below Normal Range"
                : "Above Normal Range"
              : "Within Normal Range";
            return `${context.dataset.label}: ${pointValue} (${rangeLabel})`;
          },
        },
      },
      title: {
        display: true,
        text: [
          `${observationName}`,
        ],
        align: "start",
        font: {
          size: window.innerWidth < 768 ? 14 : 18, // Smaller font on mobile
        },
      },
      subtitle: {
        display: true,
        text: [
          referenceRange ? `Normal range: ${referenceRange.low} - ${referenceRange.high}` : '',
          explanation
        ].filter(Boolean),
        align: "start",
        font: {
          size: window.innerWidth < 768 ? 12 : 18,
          style: "italic",
        },
        padding: {
          bottom: 20, // Add padding below the subtitle
        },
      },
    },
    
    scales: {
      x: {
        type: "time", // Use time scale
        time: {
          unit: "month", // Group data points by month
          displayFormats: {
            month: "MMM yyyy", // Customize the format
          },
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: window.innerWidth < 768 ? 4 : 8, // Fewer ticks on mobile
          maxRotation: 0, // Keep labels horizontal
          minRotation: 0,
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
        grid: {
          display: true,
          drawBorder: true,
        },
      },
      y: {
        suggestedMin: Math.min(
          referenceRange?.low - 1 || 0,
          ...points.map((p) => {
            if (!p.value) return 0;
            return p.value.split ? Math.min(...p.value.split("/").map(Number)) : Number(p.value);
          })
        ),
        suggestedMax: Math.max(
          referenceRange?.high + 1 || 100,
          ...points.map((p) => {
            if (!p.value) return 0;
            return p.value.split ? Math.max(...p.value.split("/").map(Number)) : Number(p.value);
          })
        ),
        ticks: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
        grid: {
          display: true,
          drawBorder: true,
        },
      },
    },
  };

  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      <Line 
        data={chartData} 
        options={{
          ...options,
          maintainAspectRatio: false,
          layout: {
            padding: {
              left: 10,
              right: 20,
              top: 20,
              bottom: 10
            }
          },
          plugins: {
            ...options.plugins,
            title: {
              ...options.plugins.title,
              padding: {
                top: 0,
                bottom: 5
              }
            },
            subtitle: {
              ...options.plugins.subtitle,
              padding: {
                bottom: 10
              }
            }
          }
        }} 
      />
    </div>
  );
}

export default ObservationGraph;