import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { Calendar, Hash, AlertCircle } from 'lucide-react';
import './ImmunizationsListView.css';

export function ImmunizationsListView({ groupedImmunizations }) {
  const navigate = useNavigate();

  const sortedVaccines = Object.values(groupedImmunizations || {})
    .sort((a, b) => {
      return new Date(b.doses[0].administration_date) - new Date(a.doses[0].administration_date);
    });

  // Add debug logging
  console.log('Grouped Immunizations:', groupedImmunizations);
  sortedVaccines.forEach(vaccine => {
    console.log('Vaccine details:', {
      name: vaccine.name,
      common_name: vaccine.immunization_common_name,
      id: vaccine.id
    });
  });

  const handleVaccineClick = (vaccineId) => {
    navigate(`${vaccineId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="immunizations-list-container">
      <div className="immunizations-header">
        <h2>Immunizations</h2>
      </div>

      <div className="immunizations-list">
        {sortedVaccines.length > 0 ? (
          sortedVaccines.map((vaccine) => (
            <Card 
              key={vaccine.id}
              className="immunization-card"
              onClick={() => handleVaccineClick(vaccine.id)}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="mb-1">{vaccine.name}</h5>
                    <div className="text-muted mb-1">
                      {vaccine.immunization_common_name || '[Common Name Not Available]'}
                    </div>
                    <div className="meta-info">
                      <div className="d-flex align-items-center gap-2">
                        <Calendar size={16} />
                        <span>Latest dose: {formatDate(vaccine.doses[0].administration_date)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="dose-badge">{vaccine.doses.length}</span>
                </div>
              </Card.Body>
            </Card>
          ))
        ) : (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h4>No Immunizations Available</h4>
            <p>There are no immunization records available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
