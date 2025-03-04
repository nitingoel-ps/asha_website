import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { Container, Spinner, Alert } from 'react-bootstrap';
import SymptomsList from './SymptomsList';
import SymptomDetail from './SymptomDetail';
import CreateSymptom from './CreateSymptom';
import CreateSymptomLog from './CreateSymptomLog';
import './Symptoms.css';

const SymptomsTab = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    setLoading(true);
    try {
      // Updated to use the RESTful endpoint
      const response = await axiosInstance.get('/symptoms/');
      
      console.log('API Response:', response.data);
      
      // Handle both array response and nested response with symptoms key
      const symptomsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.symptoms || []);
      
      console.log('Extracted Symptoms:', symptomsData);
      
      setSymptoms(symptomsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching symptoms:', err);
      setError('Failed to load symptoms. Please try again later.');
      setSymptoms([]);
    } finally {
      setLoading(false);
    }
  };

  console.log('Symptoms state in SymptomsTab:', symptoms);

  if (loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading symptoms...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-4">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Routes>
        <Route 
          index 
          element={
            <SymptomsList 
              symptoms={symptoms} 
              onRefresh={fetchSymptoms}
            />
          } 
        />
        <Route path=":symptomId" element={<SymptomDetail />} />
        <Route path="create" element={<CreateSymptom onSuccess={fetchSymptoms} />} />
        <Route path=":symptomId/log" element={<CreateSymptomLog />} />
      </Routes>
    </Container>
  );
};

export default SymptomsTab;
