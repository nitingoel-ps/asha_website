import React, { useState } from "react";
import { Card, ListGroup, Button, Row, Col } from "react-bootstrap";
import axiosInstance from "../../utils/axiosInstance";
import { format } from "date-fns";
import './EncountersTab.css';

function EncountersTab({ encounters }) {
  const [contentType, setContentType] = useState("");

  const handleDocumentClick = async (attachment) => {
    const binaryId = attachment.replace("Binary/", "");
    try {
      const response = await axiosInstance.get(`/get-binary`, {
        params: { binary_id: binaryId }
      });
      setContentType(response.headers['content-type']);
      const newWindow = window.open("", "_blank", "width=800,height=600,resizable=yes,scrollbars=yes");
      if (contentType === "text/html") {
        newWindow.document.write(response.data);
      } else {
        newWindow.document.write(`<pre>${response.data}</pre>`);
      }
      newWindow.document.close();
    } catch (error) {
      console.error("Failed to fetch document content", error);
    }
  };

  const parseDate = (dateString) => {
    if (dateString.includes("T")) {
      return new Date(dateString);
    } else {
      return new Date(`${dateString}T00:00:00`);
    }
  };

  const formatDateTime = (start, end) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const formattedStartDate = format(startDate, "MMM dd, yyyy");
    const formattedStartTime = format(startDate, "hh:mm a");
    const formattedEndTime = format(endDate, "hh:mm a");

    if (formattedStartDate === format(endDate, "MMM dd, yyyy")) {
      if (formattedStartTime === formattedEndTime) {
        return `${formattedStartDate} at ${formattedStartTime}`;
      } else {
        return `${formattedStartDate} from ${formattedStartTime} to ${formattedEndTime}`;
      }
    } else {
      return `From ${formattedStartDate} at ${formattedStartTime} to ${format(endDate, "MMM dd, yyyy")} at ${formattedEndTime}`;
    }
  };

  return (
    <div className="encounters-tab">
      {encounters
        .sort((a, b) => parseDate(b.start) - parseDate(a.start))
        .map((encounter) => (
          <Card key={encounter.id} className="mb-4 encounter-card">
          <Card.Body>
              <Row>
                <Col md={2} className="encounter-date">
                  <div className="date-section">
                    <div className="month">{format(parseDate(encounter.start), "MMM").toUpperCase()}</div>
                    <div className="day">{format(parseDate(encounter.start), "dd")}</div>
                    <div className="year">{format(parseDate(encounter.start), "yyyy")}</div>
                  </div>
                </Col>
                <Col md={10} className="encounter-details">
                  <h5 className="encounter-type">{encounter.type}</h5>
                  <h6><span className="encounter-location">{encounter.participant}</span></h6>
                  <h6><span className="encounter-location">{encounter.location}</span></h6>
                  <p className="encounter-summary">{encounter.encounter_summary}</p>
                  <div className="encounter-documents">
              {encounter.documents.map((doc) => (
                      <Button
                        key={doc.id}
                        variant="link"
                        onClick={() => handleDocumentClick(doc.content[0]?.attachment)}
                        className="document-button"
                      >
                        {doc.type} ({doc.category})
                          </Button>
                        ))}
                      </div>
                </Col>
              </Row>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}

export default EncountersTab;