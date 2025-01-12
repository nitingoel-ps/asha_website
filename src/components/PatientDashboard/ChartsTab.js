import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { FaFlask } from 'react-icons/fa';
import ObservationGraph from './ObservationGraph';
import './ChartsTab.css';

function ChartsTab({ chartData }) {
  const [selectedChart, setSelectedChart] = useState(null);

  // Add useEffect for debugging
  useEffect(() => {
    console.group('ChartsTab Debug Info');
    console.log('Raw chartData:', chartData);
    console.log('chartData type:', typeof chartData);
    console.log('Is charts array present?', Boolean(chartData?.charts));
    if (chartData?.charts) {
      console.log('Charts array length:', chartData.charts.length);
      console.log('First chart item:', chartData.charts[0]);
    }
    console.groupEnd();
  }, [chartData]);

  // Ensure chartData and charts array exist
  if (!chartData || !chartData.charts || chartData.charts.length === 0) {
    console.warn('ChartsTab: No data available:', {
      chartDataExists: Boolean(chartData),
      chartsArrayExists: Boolean(chartData?.charts),
      chartsLength: chartData?.charts?.length
    });
    return (
      <div className="charts-tab">
        <h3>Key Lab Results</h3>
        <p>No lab results available.</p>
      </div>
    );
  }

  const getLatestValue = (chartData) => {
    if (!chartData?.points || chartData.points.length === 0) return null;
    
    const sortedPoints = [...chartData.points].sort((a, b) => 
      new Date(b.observationDate) - new Date(a.observationDate)
    );
    
    return {
      value: sortedPoints[0].observationValue,
      date: sortedPoints[0].observationDate
    };
  };

  const isChartable = (chart) => {
    return chart.points && chart.points.length > 1;
  };

  const handleCardClick = (chart) => {
    if (!isChartable(chart)) return;
    
    const transformedChart = {
      ...chart,
      points: chart.points.map(point => ({
        date: point.observationDate,
        value: point.observationValue
      }))
    };
    console.log('Transformed chart data:', transformedChart); // Debug log
    setSelectedChart(transformedChart);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  console.log('Charts data:', chartData); // Debug log

  return (
    <div className="charts-tab">
      <h3>Key Lab Results</h3>
      
      {/* Add summary section */}
      {chartData.summary && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Summary</Card.Title>
            <Card.Text>{chartData.summary}</Card.Text>
          </Card.Body>
        </Card>
      )}

      <div className="charts-grid">
        {chartData.charts.map((chart, index) => {
          const latestValue = getLatestValue(chart);
          const chartable = isChartable(chart);
          console.log('Chart:', chart, 'Latest value:', latestValue); // Debug log
          
          return (
            <Card 
              key={index}
              className={`chart-card ${chartable ? 'chartable' : 'non-chartable'}`}
              onClick={() => handleCardClick(chart)}
              style={{ cursor: chartable ? "pointer" : "default" }}
            >
              <Card.Body>
                <div className="chart-card-header">
                  <div className="chart-title-container">
                    <Card.Title>{chart.observationName}</Card.Title>
                    {latestValue && (
                      <span className="chart-date">
                        {formatDate(latestValue.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="chart-reading-container">
                  <FaFlask className="chart-icon" />
                  <Card.Text className="chart-value">
                    {latestValue ? latestValue.value : 'N/A'}
                  </Card.Text>
                  <div className="chart-unit">
                    {chart.uom}
                  </div>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {selectedChart && (
        <div className="graph-container">
          <ObservationGraph data={selectedChart} />
        </div>
      )}
    </div>
  );
}

export default ChartsTab;