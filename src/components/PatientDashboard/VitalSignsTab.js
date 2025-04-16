import React, { useState, useRef, useEffect } from "react";
import { Card, Row, Col, Table, Container, Spinner, Button, Modal, Form, Alert, ButtonGroup, ToggleButton } from "react-bootstrap";
import ObservationGraph from "./ObservationGraph";
import "./VitalSignsTab.css";
import { 
  FaHeart,
  FaWaveSquare,
  FaLungsVirus,
  FaRuler,
  FaWeight,
  FaChartLine,
  FaCalendarAlt,
  FaHospital,
  FaTrashAlt,
  FaPlusCircle,
  FaExchangeAlt
} from "react-icons/fa";
import axiosInstance from "../../utils/axiosInstance";
import BloodPressureInput from './BloodPressureInput';
import EmptyStateMessage from '../Common/EmptyStateMessage';
import { ConnectionProvider, useConnection } from "../../context/ConnectionContext";
import '../Common/EmptyStateMessage.css';
import { Link } from "react-router-dom";

// Unit conversion functions
const convertHeight = (value, fromUnit, toUnit) => {
  // Normalize to cm first
  let valueInCm;
  switch (fromUnit.toLowerCase()) {
    case 'in':
    case 'inch':
    case 'inches':
      valueInCm = value * 2.54;
      break;
    case 'm':
    case 'meter':
    case 'meters':
      valueInCm = value * 100;
      break;
    case 'cm':
    case 'centimeter':
    case 'centimeters':
      valueInCm = value;
      break;
    default:
      valueInCm = value; // Assume cm if unit not recognized
      break;
  }

  // Convert from cm to target unit
  switch (toUnit) {
    case 'in':
      return Number((valueInCm / 2.54).toFixed(1));
    case 'cm':
      return Number(valueInCm.toFixed(1));
    default:
      return Number(valueInCm.toFixed(1)); // Default to cm
  }
};

const convertWeight = (value, fromUnit, toUnit) => {
  // Normalize to kg first
  let valueInKg;
  switch (fromUnit.toLowerCase()) {
    case 'lb':
    case 'lbs':
    case 'pound':
    case 'pounds':
      valueInKg = value * 0.45359237;
      break;
    case 'g':
    case 'gram':
    case 'grams':
      valueInKg = value / 1000;
      break;
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      valueInKg = value;
      break;
    default:
      valueInKg = value; // Assume kg if unit not recognized
      break;
  }

  // Convert from kg to target unit
  switch (toUnit) {
    case 'lb':
      return Number((valueInKg / 0.45359237).toFixed(1));
    case 'kg':
      return Number(valueInKg.toFixed(1));
    default:
      return Number(valueInKg.toFixed(1)); // Default to kg
  }
};

// Normalize unit names for consistent display
const normalizeUnitName = (unit, vitalType) => {
  if (!unit) return '';
  
  // Extract the primary unit if it's followed by additional information in parentheses
  // Example: "kg (194 lb 9.6 oz)" should return "kg"
  const unitMatch = unit.match(/^(\w+)(\s*\(.*\))?/);
  const primaryUnit = unitMatch ? unitMatch[1].trim().toLowerCase() : unit.toLowerCase();
  
  if (vitalType === "Height") {
    if (primaryUnit.includes('in') || primaryUnit === 'inch' || primaryUnit === 'inches') {
      return 'in';
    } else if (primaryUnit === 'cm' || primaryUnit === 'centimeter' || primaryUnit === 'centimeters') {
      return 'cm';
    } else if (primaryUnit === 'm' || primaryUnit === 'meter' || primaryUnit === 'meters') {
      return 'm';
    }
    // Try to extract unit from beginning of string if not already matched
    if (unit.toLowerCase().startsWith('in')) return 'in';
    if (unit.toLowerCase().startsWith('cm')) return 'cm';
    if (unit.toLowerCase().startsWith('m ')) return 'm'; // Space after 'm' to avoid matching 'mm'
    return primaryUnit;
  } 
  
  if (vitalType === "Weight") {
    if (primaryUnit === 'lb' || primaryUnit === 'lbs' || primaryUnit === 'pound' || primaryUnit === 'pounds') {
      return 'lb';
    } else if (primaryUnit === 'kg' || primaryUnit === 'kilogram' || primaryUnit === 'kilograms') {
      return 'kg';
    } else if (primaryUnit === 'g' || primaryUnit === 'gram' || primaryUnit === 'grams') {
      return 'g';
    }
    // Try to extract unit from beginning of string if not already matched
    if (unit.toLowerCase().startsWith('lb')) return 'lb';
    if (unit.toLowerCase().startsWith('kg')) return 'kg';
    if (unit.toLowerCase().startsWith('g ')) return 'g'; // Space after 'g' to avoid matching 'kg'
    return primaryUnit;
  }
  
  return primaryUnit;
};

// Helper function to extract the primary unit from a potentially complex unit string
const extractPrimaryUnit = (unitString) => {
  if (!unitString) return '';
  
  // Common unit patterns to look for at the beginning of the string
  const unitPatterns = [
    // Weight units
    /^kg\b/i, /^kilogram\b/i, /^kilograms\b/i,
    /^lb\b/i, /^lbs\b/i, /^pound\b/i, /^pounds\b/i,
    /^g\b/i, /^gram\b/i, /^grams\b/i,
    // Height units
    /^cm\b/i, /^centimeter\b/i, /^centimeters\b/i,
    /^m\b/i, /^meter\b/i, /^meters\b/i,
    /^in\b/i, /^inch\b/i, /^inches\b/i,
    // BP units
    /^mmHg\b/i,
    // Other common units
    /^%\b/i, /^bpm\b/i
  ];
  
  for (const pattern of unitPatterns) {
    const match = unitString.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }
  
  // If no direct match, try to extract the first word before any parenthesis
  const firstWordMatch = unitString.match(/^([^\s(]+)/);
  if (firstWordMatch) {
    return firstWordMatch[0].toLowerCase();
  }
  
  return unitString.toLowerCase();
};

// Update the calculate trend function to format the text differently
const calculateTrend = (currentReading, previousReading, vitalType) => {
  if (!previousReading) return { type: 'stable', text: 'No change' };
  
  let current = parseFloat(currentReading);
  let previous = parseFloat(previousReading);
  
  // Special handling for blood pressure
  if (vitalType === "Blood Pressure") {
    const [currentSystolic] = currentReading.split('/').map(Number);
    const [previousSystolic] = previousReading.split('/').map(Number);
    
    current = currentSystolic;
    previous = previousSystolic;
  }
  
  if (isNaN(current) || isNaN(previous)) return { type: 'stable', text: 'No change' };
  
  const diff = current - previous;
  const unit = getUnit(vitalType);
  
  if (Math.abs(diff) < 0.1) return { type: 'stable', text: 'No change' };
  
  // Format more like "-16.0 mmHg" instead of just the raw number
  return {
    type: diff > 0 ? 'up' : 'down',
    text: `${diff > 0 ? '+' : ''}${Math.abs(diff).toFixed(1)} ${unit}`.trim()
  };
};

const getUnit = (vitalType) => {
  switch (vitalType) {
    case "Blood Pressure": return "mmHg";
    case "Pulse": return "bpm";
    case "Oxygen Saturation": return "%";
    case "Height": return "in";
    case "Weight": return "lb";
    case "Body Mass Index": return "";
    default: return "";
  }
};

// Add a specialized empty state component for Vital Signs
const VitalSignsEmptyState = () => {
  const { connectionStatus } = useConnection();
  
  return (
    <div className="empty-state-container text-center p-4">
      <h4 className="mb-3">No Vital Signs Available</h4>
      
      <p className="text-muted mb-4">
        {connectionStatus === 'no-connections' 
          ? "You don't have any vital signs data yet. You can either connect to your healthcare providers to import your data, or manually record your own vital signs."
          : "No vital signs were found in your health data. You can manually record your own vital signs."}
      </p>
      
      <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
        {connectionStatus === 'no-connections' && (
          <Link to="/add-providers">
            <Button variant="primary">
              Connect Provider
            </Button>
          </Link>
        )}
        
        <Button 
          variant="primary" 
          onClick={() => window.dispatchEvent(new Event('openAddVital'))}
        >
          Add Vital Signs
        </Button>
      </div>
    </div>
  );
};

function VitalSignsTab() {
  const [vitals, setVitals] = useState([]);
  const [selectedVital, setSelectedVital] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVital, setNewVital] = useState({
    vital_sign: "Blood Pressure",
    reading: "",
    systolic: "",      // Add systolic field for blood pressure
    diastolic: "",     // Add diastolic field for blood pressure
    units_of_measure: "mmHg",
    date_taken: new Date().toISOString().split('T')[0],
    source: "Self-reported"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [displayUnit, setDisplayUnit] = useState({
    Height: "in",
    Weight: "lb"
  });
  const [convertedVitals, setConvertedVitals] = useState(null);
  const detailsRef = useRef(null);
  const graphRef = useRef(null);
  const shouldScrollRef = useRef(false);

  // Add event listener for the custom event from top nav bar
  useEffect(() => {
    const handleOpenAddVital = () => {
      setShowAddModal(true);
      setError("");
    };

    window.addEventListener('openAddVital', handleOpenAddVital);
    return () => window.removeEventListener('openAddVital', handleOpenAddVital);
  }, []);

  // Fetch vital signs data from the new API endpoint
  useEffect(() => {
    fetchVitalSigns();
  }, []);

  // Effect to convert selected vitals when display unit changes
  useEffect(() => {
    if (selectedVital && selectedVital.length > 0) {
      const vitalType = selectedVital[0].vital_sign;
      
      if (vitalType === "Blood Pressure") {
        // Blood Pressure - maintain the string format but don't try to convert units
        setConvertedVitals(
          selectedVital.map(vital => ({
            ...vital,
            converted_reading: vital.reading, // Keep the original string format (e.g. "120/80")
            display_unit: extractPrimaryUnit(vital.units_of_measure) || 'mmHg'
          }))
        );
      } else if (vitalType === "Height" || vitalType === "Weight") {
        const converted = selectedVital.map(vital => {
          const normalizedUnit = normalizeUnitName(vital.units_of_measure, vitalType);
          const targetUnit = displayUnit[vitalType];
          
          let convertedReading;
          try {
            if (vitalType === "Height") {
              convertedReading = convertHeight(parseFloat(vital.reading), normalizedUnit, targetUnit);
            } else {
              convertedReading = convertWeight(parseFloat(vital.reading), normalizedUnit, targetUnit);
            }
          } catch (e) {
            console.error("Conversion error:", e);
            convertedReading = parseFloat(vital.reading) || 0;
          }
          
          return {
            ...vital,
            converted_reading: convertedReading,
            display_unit: targetUnit,
            original_unit: normalizedUnit
          };
        });
        
        setConvertedVitals(converted);
      } else {
        // For non-convertible vitals, just pass through
        setConvertedVitals(
          selectedVital.map(vital => ({
            ...vital,
            converted_reading: parseFloat(vital.reading) || vital.reading,
            display_unit: extractPrimaryUnit(vital.units_of_measure)
          }))
        );
      }
    }
  }, [selectedVital, displayUnit]);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to handle scrolling to details after they're rendered
  useEffect(() => {
    if (shouldScrollRef.current && detailsRef.current && !isLoading) {
      const scrollToDetails = () => {
        detailsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        shouldScrollRef.current = false;
      };
      
      // Use a short timeout to ensure DOM is fully updated
      const timer = setTimeout(scrollToDetails, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedVital, isLoading]);

  const fetchVitalSigns = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/vital-signs/");
      setVitals(response.data.vital_signs || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching vital signs:", error);
      setVitals([]);
      setIsLoading(false);
    }
  };

  // Check if we have vital signs data
  const hasVitals = vitals && vitals.length > 0;

  // If no data and we're done loading, return empty state handler
  if (!hasVitals && !isLoading) {
    return (
      <ConnectionProvider>
        <VitalSignsEmptyState />
      </ConnectionProvider>
    );
  }

  const keyVitals = {
    "Blood Pressure": {
      data: vitals.filter(v => v.vital_sign_type === "Blood Pressure"),
      icon: "❤️"
    },
    "Pulse": {
      data: vitals.filter(v => v.vital_sign_type === "Pulse Rate"),
      icon: "📈"
    },
    "Oxygen Saturation": {
      data: vitals.filter(v => v.vital_sign_type === "Oxygen Saturation"),
      icon: "🫁"
    },
    "Height": {
      data: vitals.filter(v => v.vital_sign_type === "Height"),
      icon: "📏"
    },
    "Weight": {
      data: vitals.filter(v => v.vital_sign_type === "Weight"),
      icon: "⚖️"
    },
    "Body Mass Index": {
      data: vitals.filter(v => v.vital_sign_type === "Body Mass Index"),
      icon: "📊"
    }
  };

  const handleCardClick = (vitalSign) => {
    setIsLoading(true);
    setSelectedVital(keyVitals[vitalSign].data);
    shouldScrollRef.current = true;
    
    // Short timeout just to show loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setError("");
  };

  const handleShowAddModal = () => {
    setShowAddModal(true);
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If changing vital sign type, update the units automatically
    if (name === "vital_sign") {
      let units = "";
      switch (value) {
        case "Blood Pressure":
          units = "mmHg";
          break;
        case "Pulse":
          units = "bpm";
          break;
        case "Oxygen Saturation":
          units = "%";
          break;
        case "Height":
          units = "cm";
          break;
        case "Weight":
          units = "kg";
          break;
        case "Body Mass Index":
          units = "kg/m²";
          break;
        default:
          units = "";
      }
      
      setNewVital({
        ...newVital,
        vital_sign: value,
        units_of_measure: units
      });
    } else {
      setNewVital({
        ...newVital,
        [name]: value
      });
    }
  };

  const handleAddVital = async () => {
    // Validation for blood pressure or regular readings
    if (newVital.vital_sign === "Blood Pressure") {
      if (!newVital.systolic || !newVital.diastolic) {
        setError("Please enter both systolic and diastolic values");
        return;
      }
    } else if (!newVital.reading) {
      setError("Please enter a reading value");
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a copy to avoid modifying the state directly
      const vitalToSave = { ...newVital };
      
      // Special handling for blood pressure
      if (newVital.vital_sign === "Blood Pressure") {
        // Combine systolic and diastolic into a reading
        vitalToSave.reading = `${newVital.systolic}/${newVital.diastolic}`;
        // Remove the extra fields before sending to API
        delete vitalToSave.systolic;
        delete vitalToSave.diastolic;
      }
      
      const response = await axiosInstance.post("/vital-signs/", vitalToSave);
      
      // Reset form
      setNewVital({
        vital_sign: "Blood Pressure",
        reading: "",
        systolic: "",
        diastolic: "",
        units_of_measure: "mmHg",
        date_taken: new Date().toISOString().split('T')[0],
        source: "Self-reported"
      });
      
      // Close modal and show success message
      setShowAddModal(false);
      setSuccess("Vital sign recorded successfully!");
      
      // Refresh vital signs data
      await fetchVitalSigns();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error adding vital sign:", error);
      setError("Failed to save vital sign. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDeleteVital = async (vitalId) => {
    if (window.confirm("Are you sure you want to delete this vital sign record?")) {
      try {
        setDeleteLoading(vitalId);
        await axiosInstance.delete(`/vital-signs/${vitalId}/`);
        
        // Refresh vital signs data
        await fetchVitalSigns();
        
        // If currently viewing details, update it
        if (selectedVital && selectedVital.length > 0) {
          const vitalType = selectedVital[0].vital_sign;
          const updatedVitals = vitals.filter(v => v.vital_sign === vitalType);
          setSelectedVital(updatedVitals);
        }
        
        setSuccess("Vital sign deleted successfully!");
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess("");
        }, 3000);
        
        setDeleteLoading(null);
      } catch (error) {
        console.error("Error deleting vital sign:", error);
        setError("Failed to delete vital sign. Please try again.");
        setDeleteLoading(null);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          setError("");
        }, 3000);
      }
    }
  };
  
  // Handle unit change for height and weight
  const handleUnitChange = (vitalType, unit) => {
    console.log(`Changing ${vitalType} unit to ${unit}`); // Debug log
    setDisplayUnit(prev => {
      const newUnits = { ...prev, [vitalType]: unit };
      console.log("New display units:", newUnits); // Debug log
      return newUnits;
    });
  };
  
  // Get latest value for a vital sign, with appropriate unit conversion
  const getLatestValue = (vitalSign, data) => {
    if (!data.length) return "No data";
    
    const latestVital = data[0];
    const value = latestVital.reading;
    
    try {
      if (vitalSign === "Height") {
        const normalizedUnit = normalizeUnitName(latestVital.units_of_measure, vitalSign);
        return convertHeight(parseFloat(value), normalizedUnit, displayUnit.Height);
      }
      
      if (vitalSign === "Weight") {
        const normalizedUnit = normalizeUnitName(latestVital.units_of_measure, vitalSign);
        return convertWeight(parseFloat(value), normalizedUnit, displayUnit.Weight);
      }
    } catch (e) {
      console.error(`Error converting ${vitalSign} value:`, e);
      return value; // Return original value if conversion fails
    }
    
    return value;
  };
  
  // Get display unit for a vital sign
  const getDisplayUnit = (vitalSign) => {
    if (vitalSign === "Height") return displayUnit.Height;
    if (vitalSign === "Weight") return displayUnit.Weight;
    
    // For other vitals, extract the primary unit
    const data = keyVitals[vitalSign].data;
    return data.length > 0 ? extractPrimaryUnit(data[0].units_of_measure) : "";
  };

  return (
    <div className="vital-signs-tab">
      {success && (
        <Alert variant="success" className="alert-message" onClose={() => setSuccess("")} dismissible>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" className="alert-message" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      
      <div className="row">
        {Object.entries(keyVitals).map(([vitalSign, { data = [], icon }]) => {
          const latestVital = data[0];
          const previousVital = data[1];
          const displayValue = latestVital ? getLatestValue(vitalSign, data) : "No data";
          const unit = latestVital ? getDisplayUnit(vitalSign) : "";
          const trend = latestVital && previousVital ? 
            calculateTrend(displayValue, getLatestValue(vitalSign, [previousVital]), vitalSign) : 
            { type: 'stable', text: 'No change' };
            
          // Use emoji-style icons like the original design
          let vitalIcon;
          switch(vitalSign) {
            case "Blood Pressure":
              vitalIcon = "❤️";
              break;
            case "Pulse":
              vitalIcon = "📈";
              break;
            case "Oxygen Saturation":
              vitalIcon = "🫁";
              break;
            case "Height":
              vitalIcon = "📏";
              break;
            case "Weight":
              vitalIcon = "⚖️";
              break;
            case "Body Mass Index":
              vitalIcon = "📊";
              break;
            default:
              vitalIcon = "📊";
          }

          return (
            <Card 
              key={vitalSign}
              className="vital-signs-card"
              onClick={() => handleCardClick(vitalSign)}
            >
              {!isMobile ? (
                // Desktop card layout
                <>
                  <div className="vital-card-header">
                    <div className="vital-title-wrapper">
                      <span className="vital-title-icon">
                        {vitalIcon}
                      </span>
                      <h3 className="vital-card-title">{vitalSign}</h3>
                    </div>
                    {latestVital && (
                      <div className="vital-date">
                        {formatDate(latestVital.date_taken)}
                      </div>
                    )}
                  </div>
                  <div className="vital-card-content">
                    <div className="vital-reading-container">
                      <div className="vital-measurement">
                        <div className="card-text">
                          {displayValue}
                        </div>
                      </div>
                      <div className="vital-unit">
                        {unit}
                      </div>
                    </div>
                  </div>
                  <div className="vital-card-footer">
                    <div className={`trend-container trend-${trend.type}`}>
                      <span className="trend-icon">
                        {trend.type === 'up' ? '▲' : trend.type === 'down' ? '▼' : '●'}
                      </span>
                      <span className="trend-text">
                        {trend.text}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                // Completely restructured mobile layout to match design
                <div className="mobile-card-wrapper">
                  <div className="mobile-card-row">
                    <div className="mobile-icon-wrapper">
                      {vitalIcon}
                    </div>
                    <div className="mobile-card-content">
                      <div className="mobile-title-row">
                        <div className="mobile-vital-name">{vitalSign}</div>
                        {latestVital && (
                          <div className="mobile-vital-date">
                            {formatDate(latestVital.date_taken)}
                          </div>
                        )}
                      </div>
                      <div className="mobile-reading-row">
                        <div className="mobile-reading-value">{displayValue}</div>
                        <div className="mobile-reading-unit">{unit}</div>
                      </div>
                      <div className={`mobile-trend trend-${trend.type}`}>
                        <span className="trend-icon">
                          {trend.type === 'up' ? '▲' : trend.type === 'down' ? '▼' : '●'}
                        </span>
                        <span className="trend-text">
                          {trend.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      
      {isLoading && (
        <div className="text-center py-4" id="loading-indicator">
          <div className="spinner-container">
            <Spinner animation="border" variant="primary" />
            <span className="loading-text">Loading</span>
          </div>
        </div>
      )}
      
      {selectedVital && selectedVital.length > 0 && !isLoading && (
        <div 
          className="selected-vital-details" 
          ref={detailsRef} 
          id="vital-details-section"
          tabIndex="-1"
        >
          {/* Unit selection for Height and Weight */}
          {(selectedVital[0].vital_sign === "Height" || selectedVital[0].vital_sign === "Weight") && (
            <div className="unit-selection-container">
              <div className="unit-selection-label">
                <FaExchangeAlt /> Display units in:
              </div>
              <ButtonGroup className="unit-toggle-group">
                {selectedVital[0].vital_sign === "Height" && (
                  <>
                    <ToggleButton
                      id="height-unit-in"
                      type="radio"
                      variant={displayUnit.Height === "in" ? "primary" : "outline-primary"}
                      name="height-unit"
                      value="in"
                      checked={displayUnit.Height === "in"}
                      onChange={() => handleUnitChange("Height", "in")}
                      onClick={() => handleUnitChange("Height", "in")} // Add onClick as backup
                    >
                      Inches (in)
                    </ToggleButton>
                    <ToggleButton
                      id="height-unit-cm"
                      type="radio"
                      variant={displayUnit.Height === "cm" ? "primary" : "outline-primary"}
                      name="height-unit"
                      value="cm"
                      checked={displayUnit.Height === "cm"}
                      onChange={() => handleUnitChange("Height", "cm")}
                      onClick={() => handleUnitChange("Height", "cm")} // Add onClick as backup
                    >
                      Centimeters (cm)
                    </ToggleButton>
                  </>
                )}
                {selectedVital[0].vital_sign === "Weight" && (
                  <>
                    <ToggleButton
                      id="weight-unit-lb"
                      type="radio"
                      variant={displayUnit.Weight === "lb" ? "primary" : "outline-primary"}
                      name="weight-unit"
                      value="lb"
                      checked={displayUnit.Weight === "lb"}
                      onChange={() => handleUnitChange("Weight", "lb")}
                      onClick={() => handleUnitChange("Weight", "lb")} // Add onClick as backup
                    >
                      Pounds (lb)
                    </ToggleButton>
                    <ToggleButton
                      id="weight-unit-kg"
                      type="radio"
                      variant={displayUnit.Weight === "kg" ? "primary" : "outline-primary"}
                      name="weight-unit"
                      value="kg"
                      checked={displayUnit.Weight === "kg"}
                      onChange={() => handleUnitChange("Weight", "kg")}
                      onClick={() => handleUnitChange("Weight", "kg")} // Add onClick as backup
                    >
                      Kilograms (kg)
                    </ToggleButton>
                  </>
                )}
              </ButtonGroup>
            </div>
          )}

          {/* Graph with converted values */}
          {convertedVitals && (
            <div className="graph-container" ref={graphRef}>
              <ObservationGraph
                data={{
                  observationName: selectedVital[0]?.vital_sign || '',
                  points: convertedVitals.map(v => ({
                    date: v.date_taken,
                    value: selectedVital[0]?.vital_sign === "Blood Pressure" ? 
                      v.converted_reading : // For BP, this will be the original string like "120/80"
                      v.converted_reading   // For other vitals, this will be a number
                  })),
                  uom: convertedVitals[0]?.display_unit || '',
                  referenceRange: selectedVital[0]?.reference_range || null,
                  explanation: selectedVital[0]?.explanation || ''
                }}
              />
            </div>
          )}
          
          {/* Desktop table view */}
          {!isMobile && (
            <div className="table-responsive">
              <Table striped bordered hover className="vital-table">
                <thead>
                  <tr>
                    <th>Vital Sign</th>
                    <th>Reading</th>
                    <th>Units</th>
                    {(selectedVital[0].vital_sign === "Height" || selectedVital[0].vital_sign === "Weight") && (
                      <>
                        <th>Converted Reading</th>
                        <th>Display Units</th>
                      </>
                    )}
                    <th>Date Taken</th>
                    <th>Source</th>
                    {/* Removed the Actions column */}
                  </tr>
                </thead>
                <tbody>
                  {selectedVital.map((vital, index) => {
                    const converted = convertedVitals ? convertedVitals[index] : null;
                    return (
                      <tr key={vital.id}>
                        <td>{vital.vital_sign}</td>
                        <td className="reading-cell">
                          {vital.reading}
                        </td>
                        <td>{vital.units_of_measure}</td>
                        {(vital.vital_sign === "Height" || vital.vital_sign === "Weight") && (
                          <>
                            <td>{converted ? converted.converted_reading : "-"}</td>
                            <td>{converted ? converted.display_unit : "-"}</td>
                          </>
                        )}
                        <td>{formatDate(vital.date_taken)}</td>
                        <td className="source-cell">
                          {vital.source}
                          {/* Add delete button with proper alignment for self-reported vitals */}
                          {vital.is_user_reported && (
                            <Button 
                              variant="danger" 
                              size="sm"
                              className="delete-vital-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVital(vital.id);
                              }}
                              disabled={deleteLoading === vital.id}
                              title="Delete this vital sign"
                            >
                              {deleteLoading === vital.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <FaTrashAlt />
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
          
          {/* Mobile card view */}
          {isMobile && (
            <div className="mobile-vital-cards">
              <h5 className="mobile-section-header">{selectedVital[0]?.vital_sign} History</h5>
              {selectedVital.map((vital, index) => {
                const converted = convertedVitals ? convertedVitals[index] : null;
                return (
                  <Card key={vital.id} className="mobile-vital-detail-card mb-3">
                    <Card.Body>
                      <div className="mobile-vital-header">
                        <div className="reading-value">
                          {vital.reading} <span className="units">{vital.units_of_measure}</span>
                          {(vital.vital_sign === "Height" || vital.vital_sign === "Weight") && converted && (
                            <span className="converted-reading">
                              ({converted.converted_reading} {converted.display_unit})
                            </span>
                          )}
                        </div>
                        {vital.is_user_reported && (
                          <Button 
                            variant="danger" 
                            size="sm"
                            className="delete-vital-btn"
                            onClick={() => handleDeleteVital(vital.id)}
                            disabled={deleteLoading === vital.id}
                          >
                            {deleteLoading === vital.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaTrashAlt />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="mobile-vital-details">
                        <div className="detail-item">
                          <FaCalendarAlt className="detail-icon" />
                          <span>{formatDate(vital.date_taken)}</span>
                        </div>
                        <div className="detail-item">
                          <FaHospital className="detail-icon" />
                          <span>{vital.source || "Unknown source"}</span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for adding a new vital sign */}
      <Modal show={showAddModal} onHide={handleCloseAddModal}>
        <Modal.Header closeButton>
          <Modal.Title>Record New Vital Sign</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError("")} dismissible>
              {error}
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Vital Sign Type</Form.Label>
              <Form.Control
                as="select"
                name="vital_sign"
                value={newVital.vital_sign}
                onChange={handleInputChange}
              >
                <option value="Blood Pressure">Blood Pressure</option>
                <option value="Pulse">Pulse</option>
                <option value="Oxygen Saturation">Oxygen Saturation</option>
                <option value="Height">Height</option>
                <option value="Weight">Weight</option>
                <option value="Body Mass Index">Body Mass Index</option>
              </Form.Control>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Reading</Form.Label>
              {newVital.vital_sign === "Blood Pressure" ? (
                <BloodPressureInput
                  formData={newVital}
                  handleInputChange={handleInputChange}
                  validated={false} // You can add form validation state if needed
                />
              ) : (
                <Form.Control
                  type="text"
                  name="reading"
                  placeholder="Enter reading value"
                  value={newVital.reading}
                  onChange={handleInputChange}
                />
              )}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Units</Form.Label>
              {newVital.vital_sign === "Height" ? (
                <Form.Control
                  as="select"
                  name="units_of_measure"
                  value={newVital.units_of_measure}
                  onChange={handleInputChange}
                >
                  <option value="cm">Centimeters (cm)</option>
                  <option value="in">Inches (in)</option>
                </Form.Control>
              ) : newVital.vital_sign === "Weight" ? (
                <Form.Control
                  as="select"
                  name="units_of_measure"
                  value={newVital.units_of_measure}
                  onChange={handleInputChange}
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                </Form.Control>
              ) : (
                <Form.Control
                  type="text"
                  name="units_of_measure"
                  value={newVital.units_of_measure}
                  onChange={handleInputChange}
                  readOnly
                />
              )}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date_taken"
                value={newVital.date_taken}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAddModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddVital}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default VitalSignsTab;
