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
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

// Register the required Chart.js components
ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, Filler);

function ObservationGraph({ data }) {
  const { observationName, points, uom, referenceRange } = data;

  // Prepare the data for Chart.js
  const chartData = {
    labels: points.map((point) => point.date),
    datasets: [
      // Reference range (background area)
      {
        label: "Reference Range",
        data: points.map(() => referenceRange.high),
        backgroundColor: "rgba(231, 248, 231, 0.5)", // Light green fill
        borderWidth: 0, // No border for the reference range
        pointRadius: 0, // No points for this dataset
        fill: { target: { value: referenceRange.low }, above: "rgba(231, 248, 231, 0.5)", below: "transparent" },
        order: 2, // Render behind the observation line
      },
      // Observation levels (line and points)
      {
        label: `${observationName} (${uom})`,
        data: points.map((point) => point.value),
        borderColor: "#007bff", // Line color (blue)
        borderWidth: 2,
        pointBackgroundColor: points.map((point) =>
          point.value < referenceRange.low || point.value > referenceRange.high ? "red" : "green"
        ), // Red for out-of-range points, green for in-range points
        pointBorderColor: points.map((point) =>
          point.value < referenceRange.low || point.value > referenceRange.high ? "red" : "green"
        ),
        pointRadius: points.map((point) =>
          point.value < referenceRange.low || point.value > referenceRange.high ? 6 : 4
        ), // Larger radius for out-of-range points
        pointStyle: points.map((point) =>
          point.value < referenceRange.low || point.value > referenceRange.high ? "rect" : "circle"
        ), // Rect for out-of-range, circle for in-range
        order: 1, // Render above the reference range
      },
    ],
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
            const pointValue = context.raw;
            const isOutOfRange =
              pointValue < referenceRange.low || pointValue > referenceRange.high;
            const rangeLabel = isOutOfRange
              ? pointValue < referenceRange.low
                ? "Below Normal Range"
                : "Above Normal Range"
              : "Within Normal Range";
            return `${context.dataset.label}: ${pointValue} (${rangeLabel})`;
          },
        },
      },
      title: {
        display: true,
        text: `${observationName}`,
        align: "start",
        font: {
          size: 18,
        },
      },
      subtitle: {
        display: true,
        text: `Normal range: ${referenceRange.low} - ${referenceRange.high}`,
        align: "start",
        font: {
          size: 12,
          style: "italic",
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
      },
      y: {
        title: {
          display: true,
          text: `${observationName} (${uom})`,
          font: {
            size: 13,
          },
        },
        suggestedMin: Math.min(referenceRange.low - 1, ...points.map((p) => p.value)),
        suggestedMax: Math.max(referenceRange.high + 1, ...points.map((p) => p.value)),
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