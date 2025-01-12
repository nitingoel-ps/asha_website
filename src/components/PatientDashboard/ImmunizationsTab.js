import React from 'react';
import { Table, Card } from 'react-bootstrap';
import { format } from 'date-fns';

function ImmunizationsTab({ immunizations }) {
  const sortedImmunizations = [...(immunizations || [])].sort((a, b) => 
    new Date(b.administration_date) - new Date(a.administration_date)
  );

  return (
    <Card className="h-100">
      <Card.Header>
        <Card.Title>Immunization History</Card.Title>
      </Card.Header>
      <Card.Body className="overflow-auto">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vaccine</th>
              <th>Status</th>
              <th>Route</th>
              <th>Site</th>
              <th>Lot Number</th>
            </tr>
          </thead>
          <tbody>
            {sortedImmunizations.map((immunization) => (
              <tr key={immunization.id}>
                <td>{format(new Date(immunization.administration_date), 'MMM dd, yyyy')}</td>
                <td>{immunization.vaccine_name}</td>
                <td>{immunization.status}</td>
                <td>{immunization.route || 'N/A'}</td>
                <td>{immunization.site || 'N/A'}</td>
                <td>{immunization.lot_number || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default ImmunizationsTab;
