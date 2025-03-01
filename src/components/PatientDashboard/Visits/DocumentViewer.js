import React, { useEffect, useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "./DocumentViewer.css";

// Set the workerSrc to use pdf.js web worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const DocumentViewer = ({ 
  documentUrl, 
  documentName, 
  onClose, 
  documentType = "auto",
  onPrevDocument,
  onNextDocument,
  hasPrev,
  hasNext,
  documentIndex,
  totalDocuments
}) => {
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectedType, setDetectedType] = useState(documentType);
  const [content, setContent] = useState(null);
  const canvasRef = useRef(null);
  const iframeRef = useRef(null);
  const textContainerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const contentContainerRef = useRef(null); // Add this ref for the content container

  // Add a console log to check if onClose is being triggered
  const handleClose = (e) => {
    console.log("Close button clicked");
    if (onClose) {
      onClose(e);
    }
  };

  // Detect document type if set to auto
  useEffect(() => {
    if (documentType !== "auto") {
      setDetectedType(documentType);
      return;
    }

    const detectDocumentType = async () => {
      try {
        // If URL ends with a known extension, use that
        if (documentUrl.match(/\.pdf$/i)) {
          setDetectedType("pdf");
          return;
        }
        if (documentUrl.match(/\.html?$/i)) {
          setDetectedType("html");
          return;
        }
        if (documentUrl.match(/\.txt$/i)) {
          setDetectedType("text");
          return;
        }

        // Try to determine type from content
        const response = await fetch(documentUrl, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        
        if (contentType) {
          if (contentType.includes('pdf')) {
            setDetectedType("pdf");
          } else if (contentType.includes('html')) {
            setDetectedType("html");
          } else if (contentType.includes('text/plain')) {
            setDetectedType("text");
          } else {
            // Default to PDF for unknown binary types
            setDetectedType("pdf");
          }
        } else {
          // If content-type is not available, make a best guess
          setDetectedType("pdf");
        }
      } catch (err) {
        console.error("Error detecting document type:", err);
        // Default to PDF if detection fails
        setDetectedType("pdf");
      }
    };

    detectDocumentType();
  }, [documentUrl, documentType]);

  // Load and render PDF document
  useEffect(() => {
    if (detectedType !== "pdf") return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(documentUrl);
        const pdfDocument = await loadingTask.promise;
        setPdf(pdfDocument);
        setNumPages(pdfDocument.numPages);
        setError(null);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load document. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      setPdf(null);
    };
  }, [documentUrl, detectedType]);

  // Render PDF page
  useEffect(() => {
    if (detectedType !== "pdf" || !pdf) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");

        // Update canvas dimensions to match the viewport
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render the PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page:", err);
        setError("Failed to render page. Please try again.");
      }
    };

    renderPage();
  }, [pdf, currentPage, scale, detectedType]);

  // Load HTML or Text content
  useEffect(() => {
    if (detectedType !== "html" && detectedType !== "text") return;
    
    const loadContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(documentUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`);
        }
        
        const contentText = await response.text();
        setContent(contentText);
        setError(null);
      } catch (err) {
        console.error(`Error loading ${detectedType} document:`, err);
        setError(`Failed to load ${detectedType} document. Please try again.`);
      } finally {
        setLoading(false);
      }
    };
    
    loadContent();
  }, [documentUrl, detectedType]);

  // HTML content handling - iframe height adjustment
  useEffect(() => {
    if (detectedType !== "html" || !iframeRef.current || !content) return;
    
    // Once iframe content loads, adjust its height if needed
    const handleIframeLoad = () => {
      try {
        const iframe = iframeRef.current;
        if (!iframe) return;
        
        // Adjust iframe height to match content
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const height = iframeDoc.body.scrollHeight;
        iframe.style.height = `${height + 20}px`;
      } catch (err) {
        console.error("Error adjusting iframe height:", err);
      }
    };
    
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = handleIframeLoad;
    }
  }, [content, detectedType]);

  // Plain text formatting
  useEffect(() => {
    if (detectedType !== "text" || !textContainerRef.current || !content) return;
    
    // Format plain text with line breaks
    textContainerRef.current.innerHTML = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }, [content, detectedType]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = documentName || `document.${detectedType === "pdf" ? "pdf" : detectedType === "html" ? "html" : "txt"}`;
    link.click();
  };

  // Add a useEffect to detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', checkMobile);
    checkMobile();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add a useEffect to handle touch events for mobile zooming and panning
  useEffect(() => {
    if (!isMobile) return;
    
    const contentContainer = contentContainerRef.current;
    if (!contentContainer) return;
    
    // Variables to track touch state
    let isPanning = false;
    let startX, startY;
    let lastZoomLevel = scale;
    
    const handleTouchStart = (e) => {
      // Don't interfere with pinch-zoom
      if (e.touches.length !== 1) return;
      
      // Start panning if we're zoomed in
      if (scale > 1.1) {
        isPanning = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        e.preventDefault(); // Prevent default to enable panning
      }
    };
    
    const handleTouchMove = (e) => {
      // Only handle single touch panning (not pinch-zoom)
      if (!isPanning || e.touches.length !== 1) return;
      
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      
      // Apply the pan movement
      contentContainer.scrollLeft -= deltaX;
      contentContainer.scrollTop -= deltaY;
      
      // Update start position
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = () => {
      isPanning = false;
    };
    
    // Add event listeners
    contentContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    contentContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    contentContainer.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Clean up event listeners
      contentContainer.removeEventListener('touchstart', handleTouchStart);
      contentContainer.removeEventListener('touchmove', handleTouchMove);
      contentContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, scale]);

  const handleKeyDown = (e) => {
    switch(e.key) {
      case 'ArrowLeft':
        if (detectedType === "pdf" && currentPage > 1) {
          handlePrevPage();
        } else if (hasPrev) {
          onPrevDocument();
        }
        break;
      case 'ArrowRight':
        if (detectedType === "pdf" && currentPage < numPages) {
          handleNextPage();
        } else if (hasNext) {
          onNextDocument();
        }
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, numPages, detectedType, hasPrev, hasNext]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-indicator">
          <p>Loading document...</p>
        </div>
      );
    } 
    
    if (error) {
      return (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.open(documentUrl, "_blank")}>
            Open in New Tab
          </button>
        </div>
      );
    }

    switch (detectedType) {
      case "pdf":
        return (
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
        );
      case "html":
        return (
          <div className="html-container" style={{ zoom: scale }}>
            <iframe 
              ref={iframeRef}
              srcDoc={content}
              title="Document content"
              className="html-iframe"
              sandbox="allow-same-origin"
            ></iframe>
          </div>
        );
      case "text":
        return (
          <div 
            className="text-container"
            style={{ fontSize: `${16 * scale}px` }}
          >
            <div 
              ref={textContainerRef}
              className="text-content"
            ></div>
          </div>
        );
      default:
        return (
          <div className="error-message">
            <p>Unsupported document type</p>
            <button onClick={() => window.open(documentUrl, "_blank")}>
              Open in New Tab
            </button>
          </div>
        );
    }
  };

  return (
    <div className="document-viewer-overlay" onClick={handleClose}>
      <div className="document-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="document-viewer-header">
          {/* Mobile header layout */}
          {isMobile && (
            <>
              {/* Document navigation for mobile */}
              <div className="mobile-nav-buttons">
                {totalDocuments > 1 && (
                  <>
                    <button 
                      className="control-button icon-button" 
                      onClick={(e) => { e.stopPropagation(); onPrevDocument(); }}
                      disabled={!hasPrev}
                      title="Previous Document"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    
                    <span className="doc-nav-info">
                      {documentIndex + 1}/{totalDocuments}
                    </span>
                    
                    <button 
                      className="control-button icon-button" 
                      onClick={(e) => { e.stopPropagation(); onNextDocument(); }}
                      disabled={!hasNext}
                      title="Next Document"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </>
                )}
              </div>

              {/* Document title for mobile - centered */}
              <h3 className="document-title">{documentName || "Document"}</h3>
              
              {/* Control buttons for mobile */}
              <div className="mobile-control-buttons">
                <button 
                  className="control-button download-button" 
                  onClick={handleDownload}
                  title="Download"
                >
                  <i className="fas fa-download"></i>
                </button>
                <button 
                  className="control-button close-icon-button" 
                  onClick={handleClose}
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </>
          )}

          {/* Desktop header layout */}
          {!isMobile && (
            <>
              <div className="header-left">
                <h3 className="document-title">{documentName || "Document"}</h3>
                <span className="document-type-badge">
                  {detectedType.toUpperCase()}
                </span>
              </div>
              
              <div className="header-center">
                {totalDocuments > 1 && (
                  <div className="desktop-doc-navigation">
                    <button 
                      className="nav-button"
                      onClick={onPrevDocument}
                      disabled={!hasPrev}
                      title="Previous Document"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="desktop-doc-info">
                      Document {documentIndex + 1} of {totalDocuments}
                    </span>
                    <button 
                      className="nav-button"
                      onClick={onNextDocument}
                      disabled={!hasNext}
                      title="Next Document"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="document-controls">
                <span className="zoom-info">{Math.round(scale * 100)}%</span>
                <button 
                  className="control-button" 
                  onClick={handleZoomOut} 
                  disabled={scale <= 0.5}
                  title="Zoom Out"
                >
                  <i className="fas fa-search-minus"></i>
                </button>
                <button 
                  className="control-button" 
                  onClick={handleZoomIn} 
                  disabled={scale >= 3.0}
                  title="Zoom In"
                >
                  <i className="fas fa-search-plus"></i>
                </button>
                <button 
                  className="control-button download-button" 
                  onClick={handleDownload}
                  title="Download"
                >
                  <i className="fas fa-download"></i>
                </button>
                <button 
                  className="control-button close-button" 
                  onClick={handleClose}
                  title="Close"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>

        <div 
          className="document-viewer-content" 
          ref={contentContainerRef} // Add the ref here
        >
          {renderContent()}
        </div>

        {detectedType === "pdf" && !loading && !error && numPages > 1 && (
          <div className="document-viewer-footer">
            <div className="page-navigation">
              <button 
                className="control-button" 
                onClick={handlePrevPage} 
                disabled={currentPage <= 1}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="page-info">
                {currentPage} / {numPages}
              </span>
              <button 
                className="control-button" 
                onClick={handleNextPage} 
                disabled={currentPage >= numPages}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* Remove the floating document navigation - now included in header */}
      </div>
    </div>
  );
};

export default DocumentViewer;
