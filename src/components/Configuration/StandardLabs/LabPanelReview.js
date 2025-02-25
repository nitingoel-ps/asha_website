import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Pagination, Form, Button, ButtonGroup } from 'react-bootstrap';
import { FaCopy } from 'react-icons/fa';
import axiosInstance from '../../../utils/axiosInstance';
import MapStandardModal from './MapStandardModal';
import CreateStandardModal from './CreateStandardModal';
import './LabPanelReview.css';

function LabPanelReview() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    observation_name: '',
    observation_loinc_code: '',
    report_name: '',
    provider_name: '',
    mapped_observation_name: ''  // New filter field
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      const response = await axiosInstance.get('/admin/lab-panel-review/');
      setData(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load lab panel data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const getVisiblePages = (currentPage, totalPages) => {
    let pages = [];
    if (totalPages <= 7) {
      // If 7 or fewer pages, show all
      pages = [...Array(totalPages)].map((_, i) => i + 1);
    } else {
      // Always include first and last page
      if (currentPage <= 3) {
        // Near the start
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        // Somewhere in the middle
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  // Filter and sort data
  const getFilteredAndSortedData = () => {
    let filteredData = [...data];

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        const searchWords = filters[key].toLowerCase().split(/\s+/).filter(word => word.length > 0);
        
        filteredData = filteredData.filter(item => {
          if (key === 'mapped_observation_name') {
            const mappedName = (item.mapped_observation?.name || '').toLowerCase();
            // All search words must exist in the mapped name
            return searchWords.every(word => mappedName.includes(word));
          }
          
          const fieldValue = String(item[key]).toLowerCase();
          // All search words must exist in the field value
          return searchWords.every(word => fieldValue.includes(word));
        });
      }
    });

    // Apply sort
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'mapped_observation_name') {
          aValue = (a.mapped_observation?.name || '').toLowerCase();
          bValue = (b.mapped_observation?.name || '').toLowerCase();
        } else {
          aValue = String(a[sortConfig.key]).toLowerCase();
          bValue = String(b[sortConfig.key]).toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  };

  // Helper function to generate unique row key
  const getRowKey = (item) => {
    return `${item.provider_id}-${item.observation_name}-${item.report_name}`;
  };

  const handleRowSelect = (index, item) => {
    const rowKey = getRowKey(item);
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowKey)) {
      newSelected.delete(rowKey);
    } else {
      newSelected.add(rowKey);
    }
    setSelectedRows(newSelected);
  };

  const handleMapStandard = () => {
    setShowMapModal(true);
  };

  const handleMapModalSave = async () => {
    setShowMapModal(false);
    // Refresh the data
    await fetchData();
  };

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  const handleCreateModalSave = async () => {
    setShowCreateModal(false);
    // Refresh the data
    await fetchData();
  };

  const getHeaderCheckboxState = () => {
    const filteredItems = filteredAndSortedData.map(getRowKey);
    const selectedFilteredItems = filteredItems.filter(key => selectedRows.has(key));
    
    if (selectedFilteredItems.length === 0) return 'unchecked';
    if (selectedFilteredItems.length === filteredItems.length) return 'checked';
    return 'indeterminate';
  };

  const toggleAllRows = () => {
    const currentState = getHeaderCheckboxState();
    const filteredItems = filteredAndSortedData.map(getRowKey);
    
    if (currentState === 'checked') {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredItems));
    }
  };

  const copyToClipboard = () => {
    const headers = [
      'Observation Name',
      'LOINC Code',
      'Report Name',
      'Provider',
      'Values',
      'Units',
      'Mapped Observation'
    ];

    const selectedData = filteredAndSortedData
      .filter(item => selectedRows.has(getRowKey(item)))
      .map(item => [
        item.observation_name,
        item.observation_loinc_code,
        item.report_name,
        item.provider_name,
        item.unique_values.join('; '),
        item.unique_uoms.join('; '),
        item.mapped_observation?.name || '---'
      ]);

    const tsvContent = [
      headers.join('\t'),
      ...selectedData.map(row => row.join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent)
      .then(() => {
        // Optional: Add visual feedback
        alert(`Copied ${selectedData.length} rows to clipboard`);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
  };

  const getSelectedObservationsData = () => {
    return filteredAndSortedData
      .filter(item => selectedRows.has(getRowKey(item)))
      .map(item => ({
        provider_id: item.provider_id,
        observation_name: item.observation_name,
        observation_loinc_code: item.observation_loinc_code,
        report_name: item.report_name
      }));
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const filteredAndSortedData = getFilteredAndSortedData();
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const currentItems = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="lab-panel-review">
      <div className="header-actions">
        <h2>Lab Panel Review</h2>
        {selectedRows.size > 0 && (
          <ButtonGroup>
            <Button 
              variant="outline-secondary"
              onClick={copyToClipboard}
              title="Copy selected rows as TSV"
            >
              <FaCopy />
            </Button>
            <Button 
              variant="primary" 
              onClick={handleMapStandard}
            >
              Map Standard ({selectedRows.size})
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleCreateNew}
            >
              Create New Standard ({selectedRows.size})
            </Button>
          </ButtonGroup>
        )}
      </div>
      
      <div className="table-container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th className="select-column">
                <Form.Check
                  type="checkbox"
                  onChange={toggleAllRows}
                  checked={getHeaderCheckboxState() === 'checked'}
                  ref={el => {
                    if (el) {
                      el.indeterminate = getHeaderCheckboxState() === 'indeterminate';
                    }
                  }}
                />
              </th>
              <th>
                <div onClick={() => handleSort('observation_name')} className="column-header">
                  Observation Name {getSortIndicator('observation_name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.observation_name}
                  onChange={(e) => handleFilterChange('observation_name', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('observation_loinc_code')} className="column-header">
                  LOINC Code {getSortIndicator('observation_loinc_code')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.observation_loinc_code}
                  onChange={(e) => handleFilterChange('observation_loinc_code', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('report_name')} className="column-header">
                  Report Name {getSortIndicator('report_name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.report_name}
                  onChange={(e) => handleFilterChange('report_name', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('provider_name')} className="column-header">
                  Provider {getSortIndicator('provider_name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.provider_name}
                  onChange={(e) => handleFilterChange('provider_name', e.target.value)}
                />
              </th>
              <th>Values</th>
              <th>Units</th>
              <th className="mapped-column">
                <div onClick={() => handleSort('mapped_observation_name')} className="column-header">
                  Mapped Observation {getSortIndicator('mapped_observation_name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.mapped_observation_name}
                  onChange={(e) => handleFilterChange('mapped_observation_name', e.target.value)}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr 
                key={getRowKey(item)}
                className={selectedRows.has(getRowKey(item)) ? 'selected-row' : ''}
              >
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedRows.has(getRowKey(item))}
                    onChange={() => handleRowSelect(index, item)}
                  />
                </td>
                <td>{item.observation_name}</td>
                <td>{item.observation_loinc_code}</td>
                <td>{item.report_name}</td>
                <td>{item.provider_name}</td>
                <td>{item.unique_values.join(', ')}</td>
                <td>{item.unique_uoms.join(', ')}</td>
                <td className="mapped-column">
                  {item.mapped_observation?.name || '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="pagination-container">
        <Pagination>
          <Pagination.First 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
          />
          <Pagination.Prev 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          />
          
          {getVisiblePages(currentPage, totalPages).map((page, index) => (
            page === '...' ? (
              <Pagination.Ellipsis key={`ellipsis-${index}`} />
            ) : (
              <Pagination.Item
                key={page}
                active={page === currentPage}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Pagination.Item>
            )
          ))}

          <Pagination.Next 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          />
          <Pagination.Last 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>

      <MapStandardModal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        onSave={handleMapModalSave}
        selectedObservations={getSelectedObservationsData()}
      />

      <CreateStandardModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSave={handleCreateModalSave}
        selectedObservations={getSelectedObservationsData()}
      />
    </div>
  );
}

export default LabPanelReview;
