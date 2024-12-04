import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Spinner, Table, OverlayTrigger, Tooltip, Accordion } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { InputGroup, Modal } from "react-bootstrap";
import "./MyDocuments.css";

import { Search, Upload, Calendar, Filter, Tags } from "lucide-react";  // Add this line

const MyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [categoryTree, setCategoryTree] = useState({});
  const [yearTree, setYearTree] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [loadingFileId, setLoadingFileId] = useState(null);

  // Fetch documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/list-files/");
      const files = response.data || [];
      setDocuments(files);
      setFilteredDocuments(files);
      setCategoryTree(createCategoryTree(files));
      setYearTree(createYearTree(files));
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal state and selected file
    const [selectedFileSummary, setSelectedFileSummary] = useState(null); // Track the selected file's summary
    const [selectedSummary, setSelectedSummary] = useState(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false); // Toggle the modal view

    // Function to handle opening the modal
    const handleOpenModal = (file) => {
    setSelectedFileSummary(file.ai_summary || "No summary available.");
    setShowSummaryModal(true);
    };

    // Function to handle closing the modal
    const handleCloseModal = () => {
    setSelectedFileSummary(null);
    setShowSummaryModal(false);
    };

  // Create category tree with counts
  const createCategoryTree = (files) => {
    const tree = {};
    files.forEach((file) => {
      const category = file.ai_category || "Uncategorized";
      if (!tree[category]) tree[category] = 0;
      tree[category]++;
    });
    return tree;
  };

  // Create year tree with counts
  const createYearTree = (files) => {
    // First create the tree object as before
    const tree = {};
    files.forEach((file) => {
      const date = file.ai_document_date ? new Date(file.ai_document_date) : null;
      const year = date && !isNaN(date) ? date.getFullYear() : "Unknown";
      if (!tree[year]) tree[year] = 0;
      tree[year]++;
    });
  
    // Convert to array of entries, sort, and convert back to object
    const sortedEntries = Object.entries(tree)
      .sort((a, b) => {
        // Handle "Unknown" cases
        if (a[0] === "Unknown") return 1;  // Move Unknown to bottom
        if (b[0] === "Unknown") return -1;
        // Sort numerically in descending order
        return Number(b[0]) - Number(a[0]);
      });
  
    // Convert back to object
    return Object.fromEntries(sortedEntries);
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "category") {
      setSelectedCategory(value);
      setSelectedYear(null); // Reset year filter if category is selected
    } else if (filterType === "year") {
      setSelectedYear(value);
      setSelectedCategory(null); // Reset category filter if year is selected
    }
  };


  const handleSummaryClick = (summary) => {
    setSelectedSummary(summary);
    setShowSummaryModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Return "N/A" if date is missing
    const options = { day: "numeric", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };


  // Filter documents based on selection
  const filterDocuments = () => {
    let filtered = documents;

    if (selectedCategory) {
      filtered = filtered.filter((doc) => (doc.ai_category || "Uncategorized") === selectedCategory);
    }

    if (selectedYear) {
      filtered = filtered.filter((doc) => {
        const date = doc.ai_document_date ? new Date(doc.ai_document_date) : null;
        const year = date && !isNaN(date) ? date.getFullYear().toString() : "Unknown";
        return year === selectedYear;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter((doc) =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by document date, NA dates on top
    filtered.sort((a, b) => {
      if (!a.ai_document_date) return -1; // Place NA dates on top
      if (!b.ai_document_date) return 1;
      return new Date(b.ai_document_date) - new Date(a.ai_document_date); // Descending order
    });

    setFilteredDocuments(filtered);
  };

  // Handle search
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/list-files/?search=${searchQuery}`);
      const files = response.data || [];
      setFilteredDocuments(files);
    } catch (error) {
      console.error("Failed to search files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file click to view document
  const handleFileClick = async (file) => {
    const supportedTypes = [".pdf", ".txt", ".html"];
    const extension = file.file_name.substring(file.file_name.lastIndexOf(".")).toLowerCase();
  
    if (!supportedTypes.includes(extension)) {
      alert("Viewing is only supported for PDF, TXT, and HTML files.");
      return;
    }
  
    // Set loading state
    setLoadingFileId(file.id);
  
    try {
      const response = await axiosInstance.get(`/view-file?file_id=${encodeURIComponent(file.id)}`, {
        responseType: extension === ".pdf" ? "blob" : "text",
      });
  
      if (extension === ".pdf") {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
      } else {
        const popup = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
        popup.document.write(response.data);
        popup.document.close();
      }
    } catch (error) {
      console.error("Failed to fetch file content:", error);
      alert("Failed to view the file. Please try again.");
    } finally {
      // Clear loading state
      setLoadingFileId(null);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [selectedCategory, selectedYear]);


  const renderFilters = () => {
    return (
      <div className="filters-container">
        <div className="filter-section">
          <div className="filter-header">
            <div className="filter-header">
                <Tags size={20} className="filter-icon" />
                <h5>Category</h5>
            </div>            
          </div>
          <ul className="filter-list">
            {Object.entries(categoryTree).map(([category, count]) => (
              <li
                key={category}
                className={`filter-item ${selectedCategory === category ? "active-filter" : ""}`}
                onClick={() => handleFilterChange("category", category)}
              >
                <span className="filter-name">{category}</span>
                <span className="filter-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="filter-section">
          <div className="filter-header">
            <Calendar size={20} className="filter-icon" />
            <h5>Year</h5>
          </div>
          <ul className="filter-list">
            {Object.entries(yearTree).map(([year, count]) => (
              <li
                key={year}
                className={`filter-item ${selectedYear === year ? "active-filter" : ""}`}
                onClick={() => handleFilterChange("year", year)}
              >
                <span className="filter-name">{year}</span>
                <span className="filter-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderFileList = () => {
    const sortedFiles = filteredDocuments.sort((a, b) => {
      if (!a.ai_document_date) return -1;
      if (!b.ai_document_date) return 1;
      return new Date(b.ai_document_date) - new Date(a.ai_document_date);
    });

    return (
      <div className="table-responsive">
        <Table hover className="modern-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Category</th>
              <th>Document Date</th>
              <th>AI Summary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => (
              <tr key={file.id}>
                <td>
                    <div className="file-link-container">
                        <a
                            href="#!"
                            onClick={() => handleFileClick(file)}
                            className={`file-link ${loadingFileId === file.id ? 'loading' : ''}`}
                        >
                        {file.file_name}
                        </a>
                        {loadingFileId === file.id && (
                        <Spinner 
                            animation="border" 
                            size="sm" 
                            className="ms-2"
                        />
                        )}
                    </div>
                </td>

                <td>
                  <span className="category-badge">
                    {file.ai_category || "N/A"}
                  </span>
                </td>
                <td>{formatDate(file.ai_document_date)}</td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>Click to view the AI summary</Tooltip>
                    }
                  >
                    <span
                      className="summary-trigger"
                      onClick={() => handleSummaryClick(file.ai_summary)}
                    >
                      {file.ai_summary ? "View Summary" : "No summary"}
                    </span>
                  </OverlayTrigger>
                </td>
                <td>
                  <span className={`status-badge ${file.ai_status?.toLowerCase() || 'pending'}`}>
                    {file.ai_status || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "1400px" }}>
      <Row className="g-4">
        <Col md={3}>
          <div className="sidebar">
            <div className="upload-box">
                <Button
                variant="primary"
                className="upload-button"
                onClick={() => navigate("/upload-files")}
                >
                <Upload size={18} className="button-icon" />
                Upload New Files
                </Button>
            </div>
            
            <div className="filters-card">
              <div className="filters-header">
                <Filter size={22} className="filter-icon"/>
                <h3>Filters</h3>
                <Button 
                    variant="link" 
                    className="clear-filters"
                    onClick={() => {
                    setSelectedCategory("");
                    setSelectedYear("");
                    }}
                >
                    show all
                </Button>
              </div>
              {renderFilters()}
            </div>
          </div>
        </Col>

        <Col md={9}>
          <div className="main-content">
            <div className="search-container">
              <div className="search-wrapper">
                <Search size={20} className="search-icon" />
                <Form.Control
                  type="search"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="primary"
                onClick={handleSearch}
                disabled={isLoading}
                className="search-button"
              >
                {isLoading ? <Spinner animation="border" size="sm" /> : "Search"}
              </Button>
            </div>

            <div className="files-card">
              <div className="files-header">
                <h5>File List</h5>
                <span className="file-count">
                  {filteredDocuments.length} files
                </span>
              </div>
              {renderFileList()}
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        show={showSummaryModal}
        onHide={() => setShowSummaryModal(false)}
        size="lg"
        centered
        className="summary-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>AI Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{selectedSummary || "No summary available."}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowSummaryModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyDocuments;