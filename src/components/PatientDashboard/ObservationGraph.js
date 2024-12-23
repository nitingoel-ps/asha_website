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
          y: point.value
        })),
        borderColor: "#007bff",
        borderWidth: 2,
        pointBackgroundColor: sortedPoints.map((point) =>
          point.value < referenceRange?.low || point.value > referenceRange?.high ? "red" : "green"
        ),
        pointBorderColor: sortedPoints.map((point) =>
          point.value < referenceRange?.low || point.value > referenceRange?.high ? "red" : "green"
        ),
        pointRadius: sortedPoints.map((point) =>
          point.value < referenceRange?.low || point.value > referenceRange?.high ? 6 : 4
        ),
        pointStyle: sortedPoints.map((point) =>
          point.value < referenceRange?.low || point.value > referenceRange?.high ? "rect" : "circle"
        ),
        order: 1,
      },
    ].filter(Boolean), // Filter out null datasets
  };

  // Chart options
  const options = {
    responsive: true,
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
          size: 18,
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
          size: 18,
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
        title: {
          display: true,
          text: "Date",
          font: {
            size: 13,
          },
        },
        ticks: {
          // Rotate labels to 45 degrees
          maxRotation: 45,
          minRotation: 45,
          // To make labels vertical, use:
          // maxRotation: 90,
          // minRotation: 90,
        },
      },
      y: {
        title: {
          display: true,
          text: `${observationName} (${uom})`,
          font: {
            size: 13,
          },
        },
        suggestedMin: Math.min(referenceRange?.low - 1, ...points.map((p) => p.value)),
        suggestedMax: Math.max(referenceRange?.high + 1, ...points.map((p) => p.value)),
      },
    },
  };

  return (
    <div style={{ padding: "10px" }}>
      {/*
      <div style={{ marginBottom: "10px", textAlign: "left" }}>
        <h5 style={{ margin: 0 }}> {observationName}</h5>
        <small>
          Normal range: {referenceRange.low} - {referenceRange.high} ( {uom} )
        </small>
      </div> */}
      <Line data={chartData} options={options} />
    </div>
  );
}

export default ObservationGraph;