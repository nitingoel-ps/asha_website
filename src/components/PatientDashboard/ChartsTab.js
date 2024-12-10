import React from "react";
import { Card, Container, Row, Col } from "react-bootstrap";
import ObservationGraph from "./ObservationGraph"; // Adjust the path as needed

function ChartsTab({ charts }) {
  // Ensure points have the correct structure for the chart
  const transformChartData = (chartData) => ({
    observationName: chartData.observationName,
    uom: chartData.uom,
    points: chartData.points.map((point) => ({
      date: new Date(point.observationDate), // Convert string to Date object
      value: point.observationValue,
    })),
    referenceRange: chartData.referenceRange,
  });

  // Consolidated data list
  const chartDataList = []
  if (charts.list.charts) {
    charts.list.charts.map(transformChartData)
  }

  return (
    <Container fluid className="mt-4">
      {/* Card Section */}
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Key Charts of Interest</Card.Title>
              <Card.Text
                style={{
                  whiteSpace: "pre-wrap", // Preserve line breaks and wrap long text
                  wordWrap: "break-word", // Prevent words from overflowing
                  maxHeight: "200px", // Set a maximum height for vertical scrolling
                  overflowY: "auto", // Enable vertical scrolling when content exceeds maxHeight
                }}
              >
                {charts?.summary || "No summary available"}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row className="mt-4">
        {chartDataList.map((chartData, index) => (
          <Col key={index} md={12} className="mb-4">
            <ObservationGraph data={chartData} />
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default ChartsTab;