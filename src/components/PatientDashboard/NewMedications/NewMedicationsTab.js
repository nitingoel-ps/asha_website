import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MedicationsListView } from './MedicationsListView';
import { MedicationDetailView } from './MedicationDetailView';

export function NewMedicationsTab({ medications }) {
  return (
    <Routes>
      <Route index element={<MedicationsListView medications={medications} />} />
      <Route path=":id" element={<MedicationDetailView medications={medications} />} />
    </Routes>
  );
}
