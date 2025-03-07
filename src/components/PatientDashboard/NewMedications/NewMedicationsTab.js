import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MedicationsListView } from './MedicationsListView';
import { MedicationDetailView } from './MedicationDetailView';
import axiosInstance from '../../../utils/axiosInstance';

export function NewMedicationsTab() {
  const [medications, setMedications] = useState({ list: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/medications/');
      
      // Handle the correct structure where the response contains a list property
      if (response.data && response.data.list) {
        setMedications({
          list: response.data.list,
          summary: response.data.summary || ''
        });
      } else {
        // Fallback in case the structure is different
        setMedications({
          list: Array.isArray(response.data) ? response.data : [],
          summary: ''
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications. Please try again later.');
      setMedications({ list: [], summary: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  return (
    <Routes>
      <Route 
        index 
        element={
          <MedicationsListView 
            medications={medications} 
            loading={loading}
            error={error}
            refreshMedications={fetchMedications}
          />
        } 
      />
      <Route 
        path=":id" 
        element={
          <MedicationDetailView 
            medications={medications} 
            refreshMedications={fetchMedications} 
          />
        } 
      />
    </Routes>
  );
}
