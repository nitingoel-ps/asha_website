import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * Component for blood pressure input with separate fields for systolic and diastolic values.
 * 
 * @param {object} props Component properties
 * @param {object} props.formData The form data object
 * @param {function} props.handleInputChange Function to handle input changes
 * @param {boolean} props.validated Whether form validation has been triggered
 */
const BloodPressureInput = ({ formData, handleInputChange, validated }) => {
  return (
    <div className="bp-input-group">
      <div className="bp-input-container">
        <div className="bp-input-label">Systolic (mmHg)</div>
        <Form.Control
          type="number"
          name="systolic"
          placeholder="e.g. 120"
          value={formData.systolic || ''}
          onChange={handleInputChange}
          required
          isInvalid={validated && !formData.systolic}
          min="40"
          max="250"
        />
        <Form.Control.Feedback type="invalid">
          Please enter a valid systolic value.
        </Form.Control.Feedback>
      </div>
      
      <div className="bp-input-container">
        <div className="bp-input-label">Diastolic (mmHg)</div>
        <Form.Control
          type="number"
          name="diastolic"
          placeholder="e.g. 80"
          value={formData.diastolic || ''}
          onChange={handleInputChange}
          required
          isInvalid={validated && !formData.diastolic}
          min="40"
          max="150"
        />
        <Form.Control.Feedback type="invalid">
          Please enter a valid diastolic value.
        </Form.Control.Feedback>
      </div>
    </div>
  );
};

export default BloodPressureInput;
