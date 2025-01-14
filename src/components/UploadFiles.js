import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, Alert, Spinner, ProgressBar, Table, OverlayTrigger, Tooltip, Accordion } from "react-bootstrap";
//import OverlayTrigger from "react-bootstrap/OverlayTrigger";Suggested, but why? Try it later.
//import Tooltip from "react-bootstrap/Tooltip"; Suggested, but why? Try it later.
import { AiOutlineInfoCircle } from "react-icons/ai";
import axiosInstance from "../utils/axiosInstance";
import "./UploadFiles.css";

const UploadFiles = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Track progress
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [backendFiles, setBackendFiles] = useState([]); // To store files fetched from backend
  const [fetchingFiles, setFetchingFiles] = useState(false); // To track file fetching
  const navigate = useNavigate();
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 10MB in bytes

  // Redirect non-authenticated users
  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      navigate("/");
    }
  }, [navigate]);

  // Fetch files from backend
  const fetchBackendFiles = async () => {
    setFetchingFiles(true);
    try {
      const response = await axiosInstance.get("/list-files/");
      setBackendFiles(response.data || []);
      setFetchingFiles(false);
    } catch (error) {
      console.error("Failed to fetch backend files:", error);
      setFetchingFiles(false);
    }
  };

  // Fetch backend files on component mount
  useEffect(() => {
    fetchBackendFiles();
  }, []);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Return "N/A" if dateString is null or undefined
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A"; // Handle invalid dates
    if (dateString.includes("T")) {
      return date.toLocaleDateString("en-US", options);
    } else {
      return date.toLocaleDateString("en-US", options);
    }
  };

  // Handle file and folder selection via drag-and-drop
  const handleDrop = (event) => {
    event.preventDefault();
    const allowedExtensions = [".txt", ".pdf", ".html"]; // Allowed extensions
    const droppedFiles = Array.from(event.dataTransfer.items)
      .map((item) => (item.kind === "file" ? item.getAsFile() : null))
      .filter((file) => {
        if (file) {
          const extension = file.name.substring(file.name.lastIndexOf("."));
          if (!allowedExtensions.includes(extension.toLowerCase())) return false;
          if (file.size > MAX_FILE_SIZE) {
            alert(`${file.name} exceeds the 10MB size limit.`);
            return false;
          }
          return true;
        }
        return false;
      });
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
  };

  // Prevent default behavior on drag-over events
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handle file and folder selection via input
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = [];
    selectedFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds the 10MB size limit.`);
      } else {
        validFiles.push(file);
      }
    });
    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError("Please select at least one file or folder to upload.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(0);

    const uploadedFiles = []; // Collect uploaded files for immediate update

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("relativePath", file.webkitRelativePath || file.name); // Send relative path

      try {
        const response = await axiosInstance.post("/upload-file/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // Add the uploaded file to the list (assume API returns the file object)
        uploadedFiles.push(response.data);

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      } catch (error) {
        console.error(`Failed to upload file: ${file.name}`, error);
        setUploadError(`Failed to upload some files. Please try again.`);
      }
    }

    setUploading(false);
    if (!uploadError) {
      setUploadSuccess("All files uploaded successfully!");
      
      // Immediately update the file list with the new files
      // setBackendFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
      fetchBackendFiles(); // Refresh from backend for a full sync
    }
    setFiles([]);
};

  // Handle removing a selected file
  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleFileClick = async (file) => {
    const supportedTypes = [".pdf", ".txt", ".html"];
    const extension = file.file_name.substring(file.file_name.lastIndexOf(".")).toLowerCase();
  
    if (!supportedTypes.includes(extension)) {
      alert("Viewing is only supported for PDF, TXT, and HTML files.");
      return;
    }
  
    try {
      const response = await axiosInstance.get(`/view-file?file_id=${encodeURIComponent(file.id)}`, {
        responseType: extension === ".pdf" ? "blob" : "text",
      });
  
      if (extension === ".pdf") {
        // Convert PDF blob to URL
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
  
        // Open in a new popup window
        window.open(url, "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
      } else if (extension === ".txt") {
        // Escape text content for safe rendering in the browser
        const escapedContent = response.data
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
  
        // Open content in a new popup window with <pre> for text formatting
        const popup = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
        popup.document.write(`
          <html>
            <head>
              <title>${file.file_name}</title>
              <style>
                body {
                  font-family: monospace;
                  margin: 0;
                  padding: 10px;
                  background-color: #f9f9f9;
                }
                pre {
                  white-space: pre-wrap; /* Preserve line breaks and word wrap */
                  word-wrap: break-word;
                  background: #fff;
                  border: 1px solid #ccc;
                  padding: 10px;
                  border-radius: 5px;
                  overflow: auto;
                }
              </style>
            </head>
            <body>
              <pre>${escapedContent}</pre>
            </body>
          </html>
        `);
        popup.document.close();
      } else {
        // For HTML, directly write the content
        const popup = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
        popup.document.write(response.data);
        popup.document.close();
      }
    } catch (error) {
      console.error("Failed to fetch file content:", error);
      alert("Failed to view the file. Please try again.");
    }
  };

  // Group files by year for reviewed documents
  const groupByYear = (files) => {
    return files.reduce((groups, file) => {
      const date = file.ai_document_date ? new Date(file.ai_document_date) : null;
      const year = date && !isNaN(date) ? date.getFullYear() : "Unknown";
  
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(file);
  
      return groups;
    }, {});
  };

  // Prepare sorted and grouped files
  const prepareFileDisplay = () => {
    // Define completed statuses
    const COMPLETED_STATUSES = ["completed", "final"]; // Add other relevant statuses

    // Not completed (e.g., pending, processing, failed)
    const notCompletedFiles = backendFiles
      .filter((file) => !file.ai_status || !COMPLETED_STATUSES.includes(file.ai_status.toLowerCase()))
      .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time));

    // Completed files
    const completedFiles = backendFiles
      .filter((file) => file.ai_status && COMPLETED_STATUSES.includes(file.ai_status.toLowerCase()))
      .sort((a, b) => new Date(b.ai_document_date) - new Date(a.ai_document_date));

    // Group completed files by year
    const groupedCompletedFiles = groupByYear(completedFiles);

    return { notCompletedFiles, groupedCompletedFiles };
  };

  const { notCompletedFiles: pendingFiles, groupedCompletedFiles: groupedReviewedFiles } = prepareFileDisplay();

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header>
          <h4>Upload Files or Folders</h4>
        </Card.Header>
        <Card.Body>
          {uploadError && <Alert variant="danger">{uploadError}</Alert>}
          {uploadSuccess && <Alert variant="success">{uploadSuccess}</Alert>}

          {/* Drag-and-Drop Area */}
          <div
            className="drag-drop-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <p>Drag & drop files or folders here, or</p>
            <Button variant="outline-primary">
              Select Files/Folders
              <input
                type="file"
                webkitdirectory
                directory
                multiple
                accept=".txt,.pdf,.html,.csv"
                onChange={(event) => {
                  console.log("File input changed");
                  handleFileChange(event);
                  // Reset the input to allow re-uploading the same file
                  event.target.value = null;
                }}
                className="file-input"
              />
            </Button>
          </div>

          {/* Display selected files */}
          {files.length > 0 && (
            <div className="file-list mb-3">
              <h6>Selected Files:</h6>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    {file.webkitRelativePath || file.name}{" "}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && <ProgressBar now={uploadProgress} label={`${Math.round(uploadProgress)}%`} />}

          {/* Upload Button */}
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploading}
            className="mt-3"
          >
            {uploading ? <Spinner animation="border" size="sm" /> : "Upload"}
          </Button>
        </Card.Body>
      </Card>

      {/* List of Files from Backend */}
      <Card className="mt-4">
        <Card.Header>
          <h4>Uploaded Files</h4>
        </Card.Header>
        <Card.Body>
          {fetchingFiles ? (
            <Spinner animation="border" />
          ) : backendFiles.length > 0 ? (
            <>
              {/* Pending Review Section */}
              {pendingFiles.length > 0 && (
            <>
              <h5>Pending Review</h5>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>File Name</th>
                    <th>Uploaded Date</th>
                  <th>Review Status</th>
                </tr>
              </thead>
              <tbody>
                  {pendingFiles.map((file) => (
                    <tr key={file.id}>
                    <td>                      
                        <a
                        href="#!"
                        onClick={() => handleFileClick(file)}
                        style={{ textDecoration: "underline", cursor: "pointer", color: "blue" }}
                        >
                        {file.file_name}
                      </a>
                      </td>
                          <td>{formatDate(file.upload_time)}</td>
                      <td>{file.ai_status || "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
                </>
              )}

              {/* Reviewed Files Section */}
              <h5>Reviewed Files</h5>
              <Accordion>
                {Object.keys(groupedReviewedFiles)
                  .sort((a, b) => {
                    if (a === "Unknown") return 1; // Place "Unknown" at the bottom
                    if (b === "Unknown") return -1;
                    return b - a; // Sort numeric years in descending order
                  })                  .map((year) => (
                  <Accordion.Item eventKey={year} key={year}>
                    <Accordion.Header>{year}</Accordion.Header>
                    <Accordion.Body>
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Document Date</th>
                            <th>AI Summary</th>
                            <th>Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedReviewedFiles[year].map((file) => (
                            <tr key={file.id}>
                              <td>
                                <a
                                  href="#!"
                                  onClick={() => handleFileClick(file)}
                                  style={{ textDecoration: "underline", cursor: "pointer", color: "blue" }}
                                >
                                  {file.file_name}
                                </a>
                              </td>
                                <td>{formatDate(file.ai_document_date)}</td>
                              <td>
                      <OverlayTrigger
                        placement="top"
                        delay={{ show: 250, hide: 400 }}
                        overlay={
                          <Tooltip className="ai-summary-tooltip">
                            {file.ai_summary || "No summary available for this file."}
                          </Tooltip>
                        }
                      >
                                    <span className="truncated-summary">
                          {file.ai_summary || "No summary available for this file."}
                        </span>
                      </OverlayTrigger>
                    </td>
                    <td>{file.ai_category}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </>
          ) : (
            <Alert variant="info">No files uploaded yet.</Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UploadFiles;
