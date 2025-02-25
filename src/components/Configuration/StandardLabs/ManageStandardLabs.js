import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Form, Pagination } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';
import './ManageStandardLabs.css';

function ManageStandardLabs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    long_name: '',
    loinc_code: '',
    uom: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/admin/std-observations/');
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load standard observations');
        setLoading(false);
      }
    };
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
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Filter and sort data
  const getFilteredAndSortedData = () => {
    let filteredData = [...data];

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filteredData = filteredData.filter(item =>
          String(item[key] || '').toLowerCase().includes(filters[key].toLowerCase())
        );
      }
    });

    // Apply sort
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = String(a[sortConfig.key] || '').toLowerCase();
        const bValue = String(b[sortConfig.key] || '').toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  };

  const getVisiblePages = (currentPage, totalPages) => {
    let pages = [];
    if (totalPages <= 7) {
      pages = [...Array(totalPages)].map((_, i) => i + 1);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
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
    <div className="standard-labs-container">
      <h2>Standard Labs</h2>
      
      <div className="table-container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>
                <div onClick={() => handleSort('name')} className="column-header">
                  Name {getSortIndicator('name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('long_name')} className="column-header">
                  Long Name {getSortIndicator('long_name')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.long_name}
                  onChange={(e) => handleFilterChange('long_name', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('loinc_code')} className="column-header">
                  LOINC Code {getSortIndicator('loinc_code')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.loinc_code}
                  onChange={(e) => handleFilterChange('loinc_code', e.target.value)}
                />
              </th>
              <th>
                <div onClick={() => handleSort('uom')} className="column-header">
                  Unit of Measure {getSortIndicator('uom')}
                </div>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Filter..."
                  value={filters.uom}
                  onChange={(e) => handleFilterChange('uom', e.target.value)}
                />
              </th>
              <th>Reference Range</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.long_name}</td>
                <td>{item.loinc_code}</td>
                <td>{item.uom}</td>
                <td>
                  {item.ref_low != null && item.ref_high != null
                    ? `${item.ref_low} - ${item.ref_high}`
                    : item.ref_low != null
                    ? `≥ ${item.ref_low}`
                    : item.ref_high != null
                    ? `≤ ${item.ref_high}`
                    : '---'}
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
    </div>
  );
}

export default ManageStandardLabs;
