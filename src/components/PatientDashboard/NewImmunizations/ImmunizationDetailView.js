import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table } from 'react-bootstrap';
import { Calendar, Activity, MapPin, Hash } from 'lucide-react';
import './ImmunizationDetailView.css';

export function ImmunizationDetailView({ groupedImmunizations }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Check if there are no immunizations at all
  useEffect(() => {
    if (!groupedImmunizations || Object.keys(groupedImmunizations).length === 0) {
      navigate('..');
    }
  }, [groupedImmunizations, navigate]);
  
  const vaccineDetails = Object.values(groupedImmunizations || {})
    .find(vaccine => vaccine?.id?.toString() === id);
  
  if (!vaccineDetails) {
    navigate('..');
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const DoseCard = ({ dose }) => (
    <Card className="dose-card mb-3">
      <Card.Body>
        <div className="dose-info">
          <div className="dose-info-item">
            <Calendar size={16} />
            <div>
              <small>Date</small>
              <div>{formatDate(dose.administration_date)}</div>
            </div>
          </div>
          <div className="dose-info-item">
            <Activity size={16} />
            <div>
              <small>Status</small>
              <div>{dose.status}</div>
            </div>
          </div>
          {dose.route && (
            <div className="dose-info-item">
              <MapPin size={16} />
              <div>
                <small>Route & Site</small>
                <div>{dose.route} {dose.site ? `- ${dose.site}` : ''}</div>
              </div>
            </div>
          )}
          {dose.lot_number && (
            <div className="dose-info-item">
              <Hash size={16} />
              <div>
                <small>Lot Number</small>
                <div>{dose.lot_number}</div>
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="immunization-detail-container">
      <Card className="detail-card mb-4">
        <Card.Body>
          <h3>{vaccineDetails.name}</h3>
          {vaccineDetails.doses[0].description && (
            <p className="vaccine-description mt-3">
              {vaccineDetails.doses[0].description}
            </p>
          )}
        </Card.Body>
      </Card>

      <div className="vaccination-history">
        <h4 className="mb-3">Vaccination History</h4>
        
        {/* Mobile View */}
        <div className="d-block d-md-none">
          {vaccineDetails.doses.map((dose) => (
            <DoseCard key={dose.id} dose={dose} />
          ))}
        </div>

        {/* Desktop View */}
        <div className="d-none d-md-block">
          <Card>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Route</th>
                    <th>Site</th>
                    <th>Lot Number</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccineDetails.doses.map((dose) => (
                    <tr key={dose.id}>
                      <td>{formatDate(dose.administration_date)}</td>
                      <td>{dose.status}</td>
                      <td>{dose.route || 'N/A'}</td>
                      <td>{dose.site || 'N/A'}</td>
                      <td>{dose.lot_number || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
