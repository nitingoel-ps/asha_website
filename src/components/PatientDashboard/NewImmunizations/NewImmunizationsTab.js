import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ImmunizationsListView } from './ImmunizationsListView';
import { ImmunizationDetailView } from './ImmunizationDetailView';

export function NewImmunizationsTab({ immunizations }) {
  const groupedImmunizations = React.useMemo(() => {
    const groups = {};
    
    immunizations?.forEach(imm => {
      if (!groups[imm.vaccine_name]) {
        groups[imm.vaccine_name] = {
          id: imm.id, // Use the first occurrence's ID as the group ID
          name: imm.vaccine_name,
          doses: []
        };
      }
      groups[imm.vaccine_name].doses.push(imm);
    });
    
    // Sort doses within each group
    Object.values(groups).forEach(group => {
      group.doses.sort((a, b) => new Date(b.administration_date) - new Date(a.administration_date));
    });
    
    return groups;
  }, [immunizations]);

  return (
    <Routes>
      <Route 
        index 
        element={<ImmunizationsListView groupedImmunizations={groupedImmunizations} />} 
      />
      <Route 
        path=":id" 
        element={<ImmunizationDetailView groupedImmunizations={groupedImmunizations} />} 
      />
    </Routes>
  );
}
