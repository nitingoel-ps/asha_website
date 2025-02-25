import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';

function CreateStandardModal({ show, onHide, onSave, selectedObservations }) {
  const [formData, setFormData] = useState({
    name: '',
    long_name: '',
    loinc_code: '',
    uom: '',
    ref_low: '',
    ref_high: ''
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'creating', 'mapping'
  const [customInputs, setCustomInputs] = useState({
    name: false,
    loinc_code: false,
    uom: false
  });

  // Reset form and status when modal is shown
  useEffect(() => {
    if (show) {
      setFormData({
        name: '',
        long_name: '',
        loinc_code: '',
        uom: '',
        ref_low: '',
        ref_high: ''
      });
      setError(null);
      setSaving(false);
      setStatus('idle');
    }
  }, [show]);

  // Get unique values from selected observations
  const uniqueValues = useMemo(() => ({
    names: selectedObservations
      .map(obs => obs.observation_name)
      .filter((name, index, self) => self.indexOf(name) === index)
      .sort(),
    loincCodes: selectedObservations
      .map(obs => obs.observation_loinc_code)
      .filter(code => code && code.trim())
      .filter((code, index, self) => self.indexOf(code) === index)
      .sort(),
    units: selectedObservations
      .map(obs => obs.unique_uoms)
      .flat()
      .filter(unit => unit && unit.trim())
      .filter((unit, index, self) => self.indexOf(unit) === index)
      .sort()
  }), [selectedObservations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (value === 'custom') {
      setCustomInputs(prev => ({ ...prev, [name]: true }));
      setFormData(prev => ({ ...prev, [name]: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // First create the standard lab
      setStatus('creating');
      const createResponse = await axiosInstance.post('/admin/std-observations/', {
        name: formData.name.trim(),
        long_name: formData.long_name.trim() || null,
        loinc_code: formData.loinc_code.trim() || null,
        uom: formData.uom.trim() || null,
        ref_low: formData.ref_low ? parseFloat(formData.ref_low) : null,
        ref_high: formData.ref_high ? parseFloat(formData.ref_high) : null
      });

      // Then create the mappings
      setStatus('mapping');
      const newStandardLab = createResponse.data;
      const mappings = selectedObservations.map(observation => ({
        provider_id: observation.provider_id,
        observation_name: observation.observation_name,
        observation_loinc_code: observation.observation_loinc_code,
        report_name: observation.report_name,
        standard_observation_id: newStandardLab.id
      }));

      await axiosInstance.post('/admin/mappings/', mappings);
      onSave();
    } catch (err) {
      setError(
        (status === 'creating' ? 'Failed to create standard lab: ' : 'Failed to create mappings: ') +
        (err.response?.data?.message || err.message || 'Unknown error')
      );
      setSaving(false);
      setStatus('idle');
    }
  };

  const getSubmitButtonText = () => {
    if (!saving) return 'Create and Map';
    switch (status) {
      case 'creating':
        return 'Creating Standard Lab...';
      case 'mapping':
        return 'Creating Mappings...';
      default:
        return 'Processing...';
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Standard Lab</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            {uniqueValues.names.length > 0 ? (
              <Form.Select
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              >
                <option value="">Select an observation name...</option>
                {uniqueValues.names.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="custom">Enter custom name...</option>
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter standard lab name"
              />
            )}
            {formData.name === 'custom' && (
              <Form.Control
                type="text"
                name="name"
                value=""
                onChange={handleChange}
                placeholder="Enter custom name"
                className="mt-2"
                required
              />
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Long Name</Form.Label>
            <Form.Control
              type="text"
              name="long_name"
              value={formData.long_name}
              onChange={handleChange}
              placeholder="Enter long name"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>LOINC Code</Form.Label>
            {!customInputs.loinc_code ? (
              <Form.Select
                name="loinc_code"
                value={formData.loinc_code}
                onChange={handleChange}
              >
                <option value="">Select a LOINC code...</option>
                {uniqueValues.loincCodes.map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
                <option value="custom">Enter custom code...</option>
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                name="loinc_code"
                value={formData.loinc_code}
                onChange={handleCustomInputChange}
                placeholder="Enter custom LOINC code"
              />
            )}
            {customInputs.loinc_code && (
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1 p-0"
                onClick={() => {
                  setCustomInputs(prev => ({ ...prev, loinc_code: false }));
                  setFormData(prev => ({ ...prev, loinc_code: '' }));
                }}
              >
                Back to dropdown
              </Button>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Unit of Measure</Form.Label>
            {!customInputs.uom ? (
              <Form.Select
                name="uom"
                value={formData.uom}
                onChange={handleChange}
              >
                <option value="">Select a unit...</option>
                {uniqueValues.units.map(unit => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
                <option value="custom">Enter custom unit...</option>
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                name="uom"
                value={formData.uom}
                onChange={handleCustomInputChange}
                placeholder="Enter custom unit"
              />
            )}
            {customInputs.uom && (
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1 p-0"
                onClick={() => {
                  setCustomInputs(prev => ({ ...prev, uom: false }));
                  setFormData(prev => ({ ...prev, uom: '' }));
                }}
              >
                Back to dropdown
              </Button>
            )}
          </Form.Group>

          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Reference Min</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="ref_low"
                value={formData.ref_low}
                onChange={handleChange}
                placeholder="Enter min value"
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Reference Max</Form.Label>
              <Form.Control
                type="number"
                step="any"
                name="ref_high"
                value={formData.ref_high}
                onChange={handleChange}
                placeholder="Enter max value"
              />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={onHide}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={saving || !formData.name.trim()}
          >
            {getSubmitButtonText()}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default CreateStandardModal;
