import React, { useState } from "react";
import { Table, FormControl, InputGroup, Button, Modal } from "react-bootstrap";
import { format } from "date-fns";
import { FaSortUp, FaSortDown } from "react-icons/fa";
import ObservationGraph from "./ObservationGraph";

function ObservationsTab({ observations }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [selectedObservations, setSelectedObservations] = useState([]);
  const [plotData, setPlotData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [modalContent, setModalContent] = useState({});

  const filterObservations = (observations, searchTerm) => {
    if (!searchTerm) return observations;

    const terms = searchTerm.split(/\s+(AND|OR)\s+/i);
    let filtered = observations;

    for (let i = 0; i < terms.length; i += 2) {
      const term = terms[i].toLowerCase();
      const operator = terms[i + 1]?.toUpperCase();

      if (operator === "AND" || !operator) {
        filtered = filtered.filter(
          (observation) =>
            observation.report_name.toLowerCase().includes(term) ||
            observation.observation_name.toLowerCase().includes(term)
        );
      } else if (operator === "OR") {
        const nextTerm = terms[i + 2]?.toLowerCase();
        if (nextTerm) {
          filtered = filtered.filter(
            (observation) =>
              observation.report_name.toLowerCase().includes(term) ||
              observation.observation_name.toLowerCase().includes(term) ||
              observation.report_name.toLowerCase().includes(nextTerm) ||
              observation.observation_name.toLowerCase().includes(nextTerm)
          );
          i += 2;
        }
      }
    }

    return filtered;
  };

  const filteredObservations = filterObservations(observations || [], searchTerm);

  const sortedObservations = [...filteredObservations].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";
      if (sortConfig.direction === "ascending") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy");
  };

  const handleSelectObservation = (observation) => {
    setSelectedObservations((prevSelected) =>
      prevSelected.includes(observation)
        ? prevSelected.filter((obs) => obs !== observation)
        : [...prevSelected, observation]
    );
  };

  const parseValue = (value) => {
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? null : parsedValue;
  };

  const handlePlot = () => {
    if (selectedObservations.length > 0) {
      const data = {
        observationName: selectedObservations[0].observation_name,
        points: selectedObservations.map((obs) => ({
          date: obs.observation_date,
          value: parseValue(obs.observation_value || obs.observation_value_str),
        })),
        uom: selectedObservations[0].observation_uom,
        referenceRange: {
          low: Math.min(...selectedObservations.map((obs) => parseFloat(obs.observation_ref_range?.split("-")[0] || 0))),
          high: Math.max(...selectedObservations.map((obs) => parseFloat(obs.observation_ref_range?.split("-")[1] || 0))),
        },
        explanation: selectedObservations[0].observation_explanation,
      };
      setPlotData(data);
    }
  };

  const handleClearPlot = () => {
    setPlotData(null);
    setSelectedObservations([]);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? <FaSortUp /> : <FaSortDown />;
    }
    return null;
  };

  const handleReportClick = (observation) => {
    setModalContent({
      title: "Report Details",
      body: (
        <div>
          <p><strong>Report Name:</strong> {observation.report_name}</p>
          <p><strong>Source:</strong> {observation.source}</p>
          <p><strong>Lab:</strong> {observation.lab}</p>
        </div>
      ),
    });
    setShowReportModal(true);
  };

  const handleObservationClick = (observation) => {
    setModalContent({
      title: "Observation Explanation",
      body: <p>{observation.observation_explanation || "No explanation available."}</p>,
    });
    setShowObservationModal(true);
  };

  const handleCloseModal = () => {
    setShowReportModal(false);
    setShowObservationModal(false);
  };

  return (
    <div>
      <InputGroup className="mb-3">
        <FormControl
          placeholder="Search observations"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>
      {selectedObservations.length > 0 && (
        <Button onClick={handlePlot} className="mb-3">Plot Selected Observations</Button>
      )}
      {plotData && <Button onClick={handleClearPlot} className="mb-3 ml-2">Clear Plot</Button>}
      {plotData && <ObservationGraph data={plotData} />}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Select</th>
            <th onClick={() => requestSort("report_name")}>
              Report Name {getSortIcon("report_name")}
            </th>
            <th onClick={() => requestSort("observation_name")}>
              Observation Name {getSortIcon("observation_name")}
            </th>
            <th>Observation Value</th>
            <th>Reference Range</th>
            <th onClick={() => requestSort("observation_date")}>
              Observation Date {getSortIcon("observation_date")}
            </th>
            <th>Performed At</th>
          </tr>
        </thead>
        <tbody>
          {sortedObservations.map((observation) => (
            <tr key={observation.observation_id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedObservations.includes(observation)}
                  onChange={() => handleSelectObservation(observation)}
                />
              </td>
              <td onClick={() => handleReportClick(observation)} style={{ cursor: "pointer", color: "blue" }}>
                {observation.report_name}
              </td>
              <td onClick={() => handleObservationClick(observation)} style={{ cursor: "pointer", color: "blue" }}>
                {observation.observation_name}
              </td>
              <td>{observation.observation_value || observation.observation_value_str || "N/A"}</td>
              <td>{observation.observation_ref_range || "N/A"}</td>
              <td>{formatDate(observation.observation_date)}</td>
              <td>{observation.lab}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showReportModal || showObservationModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{modalContent.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalContent.body}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ObservationsTab;
