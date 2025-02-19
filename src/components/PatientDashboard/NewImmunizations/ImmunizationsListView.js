import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { Calendar, Hash } from 'lucide-react';
import './ImmunizationsListView.css';

export function ImmunizationsListView({ groupedImmunizations }) {
  const navigate = useNavigate();

  const sortedVaccines = Object.values(groupedImmunizations)
    .sort((a, b) => {
      return new Date(b.doses[0].administration_date) - new Date(a.doses[0].administration_date);
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
        {sortedVaccines.map((vaccine) => (
          <Card 
            key={vaccine.id}
            className="immunization-card mb-3"
            onClick={() => handleVaccineClick(vaccine.id)}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-2">{vaccine.name}</h5>
                  <div className="meta-info">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Calendar size={16} />
                      <span>Latest dose: {formatDate(vaccine.doses[0].administration_date)}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Hash size={16} />
                      <span>{vaccine.doses.length} {vaccine.doses.length === 1 ? 'dose' : 'doses'}</span>
                    </div>
                  </div>
                </div>
                <span className="dose-badge">{vaccine.doses.length}</span>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
