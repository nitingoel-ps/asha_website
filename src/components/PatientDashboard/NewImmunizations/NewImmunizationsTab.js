import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ImmunizationsListView } from './ImmunizationsListView';
import { ImmunizationDetailView } from './ImmunizationDetailView';

export function NewImmunizationsTab({ immunizations }) {
  const groupedImmunizations = React.useMemo(() => {
    if (!immunizations || immunizations.length === 0) {
      return {};
    }
    
    const groups = {};
    
    immunizations.forEach(imm => {
      if (!groups[imm.vaccine_name]) {
        groups[imm.vaccine_name] = {
          id: imm.id, // Use the first occurrence's ID as the group ID
          name: imm.vaccine_name,
          immunization_common_name: imm.immunization_common_name,
          immunization_short_description: imm.immunization_short_description,
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
