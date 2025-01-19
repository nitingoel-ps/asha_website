import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format } from 'date-fns';
import {
  faStethoscope,
  faPhone,
  faHospital,
  faVideo,
  faUserNurse,
  faBookMedical,
  faUserMd,
  faClinicMedical,
  faSearchPlus,
  faSearchMinus,
  faFlask,
  faHospitalAlt,
  faUndo,
  faChevronLeft,
  faBook,
  faProcedures,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import './HorizontalTimeline.css';

const PRIORITY_ENCOUNTER_TYPES = [
  'Surgery',
  'Urgent Care Office Visit',
  'Emergency Department Visit',
  'Hospital Encounter',
  'Outpatient Ambulatory Surgery',
];

const encounterTypeIcons = {
  'Office Visit': { icon: faStethoscope, color: '#4CAF50', priority: false },
  'Telephone': { icon: faPhone, color: '#2196F3', priority: false },
  'Urgent Care Office Visit': { icon: faHospitalAlt, color: '#FF5722', priority: true },
  'Video Visit': { icon: faVideo, color: '#9C27B0', priority: false },
  'AACC Telephone': { icon: faPhone, color: '#2196F3', priority: false },
  'Telephone Appointment Visit': { icon: faPhone, color: '#2196F3', priority: false },
  'AACC Member Call History': { icon: faPhone, color: '#2196F3', priority: false },
  'Clinical Documentation': { icon: faBookMedical, color: '#607D8B', priority: false },
  'Allied Health/Nurse Visit': { icon: faUserNurse, color: '#00BCD4', priority: false },
  'Ancillary Visit': { icon: faFlask, color: '#795548', priority: false },
  'Education': { icon: faBook, color: '#009688', priority: false },
  'Surgery': { icon: faProcedures, color: '#FF5722', priority: true },
  'Outpatient Ambulatory Surgery': { icon: faProcedures, color: '#FF5722', priority: true },
};

const providerColors = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFF5', '#FF8C33', '#8CFF33', '#338CFF'
];

const HorizontalTimeline = ({ encounters, onPointClick, title }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const timelineRef = useRef(null);
  
  console.log('Unique encounter types:', 
    [...new Set(encounters.map(e => e.type))]
  );

  const sortedEncounters = [...encounters].sort((a, b) => 
    new Date(a.start) - new Date(b.start)
  );

  const oldestDate = new Date(sortedEncounters[0]?.start || new Date());
  const today = new Date();
  const timelineWidth = 100; // percentage

  const getPositionOnTimeline = (date) => {
    // First convert date to percentage position on the full timeline
    const totalDays = (today - oldestDate) / (1000 * 60 * 60 * 24);
    const daysFromStart = (new Date(date) - oldestDate) / (1000 * 60 * 60 * 24);
    const basePosition = (daysFromStart / totalDays) * 100;
    
    // If not zoomed, return the base position
    if (zoomLevel === 1) return basePosition;

    // For zoomed view, calculate position relative to zoom window
    if (basePosition < zoomRange.start) return 0;
    if (basePosition > zoomRange.end) return 100;
    
    // Calculate position within zoom window
    const zoomedPosition = ((basePosition - zoomRange.start) / (zoomRange.end - zoomRange.start)) * 100;
    return zoomedPosition;
  };

  const handleMouseDown = (e) => {
    // Ignore if clicking directly on an icon
    if (e.target.closest('.timeline-point-icon')) {
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    setIsDragging(true);
    setDragStart(position);
    setDragEnd(position);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const rect = timelineRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;
      setDragEnd(Math.max(0, Math.min(100, position)));
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart !== dragEnd) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      
      // Only zoom if selection is at least 5% of timeline
      if (end - start >= 5) {
        // Calculate precise zoom range based on current view
        const currentWidth = zoomRange.end - zoomRange.start;
        const newStart = zoomRange.start + (start * currentWidth / 100);
        const newEnd = zoomRange.start + (end * currentWidth / 100);
        
        setZoomRange({ 
          start: Math.max(0, newStart),
          end: Math.min(100, newEnd)
        });
        setZoomLevel(100 / (end - start));
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleReset = () => {
    setZoomLevel(1);
    setZoomRange({ start: 0, end: 100 });
  };

  const generateTimelineLabels = () => {
    const MAX_LABELS = 24;
    
    const totalDays = (today - oldestDate) / (1000 * 60 * 60 * 24);
    const zoomStartDate = new Date(oldestDate.getTime() + (totalDays * zoomRange.start / 100) * 86400000);
    const zoomEndDate = new Date(oldestDate.getTime() + (totalDays * zoomRange.end / 100) * 86400000);
    
    const monthDiff = (zoomEndDate.getFullYear() - zoomStartDate.getFullYear()) * 12 
                     + (zoomEndDate.getMonth() - zoomStartDate.getMonth());
    
    const stepSize = Math.max(Math.ceil(monthDiff / MAX_LABELS), 1);
    
    const labels = [];
    let currentDate = new Date(zoomStartDate);
    currentDate.setDate(1); // Ensure we start at beginning of month
    
    while (currentDate <= zoomEndDate) {
      const position = getPositionOnTimeline(currentDate);
      if (position >= 0 && position <= 100) {
        labels.push({
          date: new Date(currentDate),
          position
        });
      }
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + stepSize));
    }

    return labels;
  };

  const generateTimelineTicks = () => {
    const totalDays = (today - oldestDate) / (1000 * 60 * 60 * 24);
    const zoomStartDate = new Date(oldestDate.getTime() + (totalDays * zoomRange.start / 100) * 86400000);
    const zoomEndDate = new Date(oldestDate.getTime() + (totalDays * zoomRange.end / 100) * 86400000);
    
    const ticks = [];
    let currentDate = new Date(zoomStartDate);
    currentDate.setDate(1); // Start at beginning of month
    
    while (currentDate <= zoomEndDate) {
      const position = getPositionOnTimeline(currentDate);
      if (position >= 0 && position <= 100) {
        ticks.push({
          date: new Date(currentDate),
          position
        });
      }
      // Move to next month
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    
    return ticks;
  };

  const handleScroll = (direction) => {
    const scrollAmount = 20; // Percentage to scroll
    const currentStart = zoomRange.start;
    const currentEnd = zoomRange.end;
    const rangeWidth = currentEnd - currentStart;
    
    if (direction === 'left' && currentStart > 0) {
      const newStart = Math.max(0, currentStart - scrollAmount);
      const newEnd = newStart + rangeWidth;
      setZoomRange({ start: newStart, end: newEnd });
    } else if (direction === 'right' && currentEnd < 100) {
      const newEnd = Math.min(100, currentEnd + scrollAmount);
      const newStart = newEnd - rangeWidth;
      setZoomRange({ start: newStart, end: newEnd });
    }
  };

  const handleProviderChange = (e) => {
    const { value, checked } = e.target;
    setSelectedProviders((prevSelected) =>
      checked ? [...prevSelected, value] : prevSelected.filter((provider) => provider !== value)
    );
  };

  const uniqueProviders = [...new Set(encounters.map((e) => e.provider_name))];

  return (
    <div className="horizontal-timeline">
      {title && <h3 className="timeline-header">{title}</h3>}
      
      <div className="provider-filter">
        <h4 style={{ fontSize: '14px' }}>Filter by Provider</h4>
        {uniqueProviders.map((provider, index) => (
          <label key={provider}>
            <input
              type="checkbox"
              value={provider}
              checked={selectedProviders.includes(provider)}
              onChange={handleProviderChange}
            />
            <span style={{ color: providerColors[index % providerColors.length] }}>
              {provider}
            </span>
          </label>
        ))}
      </div>
      
      {zoomLevel > 1 && (
        <>
          <button onClick={handleReset} className="reset-button">
            <FontAwesomeIcon icon={faUndo} /> Reset Zoom
          </button>
          {zoomRange.start > 0 && (
            <button 
              className="scroll-button scroll-left"
              onClick={() => handleScroll('left')}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
          )}
          {zoomRange.end < 100 && (
            <button 
              className="scroll-button scroll-right"
              onClick={() => handleScroll('right')}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          )}
        </>
      )}
      <div 
        className="timeline-container"
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="timeline-line">
          {isDragging && dragStart !== null && dragEnd !== null && (
            <div 
              className="selection-overlay"
              style={{
                left: `${Math.min(dragStart, dragEnd)}%`,
                width: `${Math.abs(dragEnd - dragStart)}%`
              }}
            />
          )}
          {generateTimelineTicks().map((tick, index, array) => (
            <div
              key={`tick-${index}`}
              className={`timeline-tick ${
                index === 0 || index === array.length - 1 ? 'tick-edge' : ''
              }`}
              style={{ left: `${tick.position}%` }}
            />
          ))}
          {sortedEncounters
            .filter((encounter) => selectedProviders.length === 0 || selectedProviders.includes(encounter.provider_name))
            .map((encounter) => {
              const position = getPositionOnTimeline(encounter.start);
              const iconConfig = encounterTypeIcons[encounter.type] || 
                { icon: faClinicMedical, color: '#666', priority: false };
              
              const isPriority = iconConfig.priority || PRIORITY_ENCOUNTER_TYPES.includes(encounter.type);
              const providerColor = providerColors[uniqueProviders.indexOf(encounter.provider_name) % providerColors.length];

              return (
                <div
                  key={encounter.id}
                  className={`timeline-point ${isPriority ? 'priority-point' : ''}`}
                  style={{ 
                    left: `${position}%`,
                  }}
                  data-tip
                  data-for={`encounter-${encounter.id}`}
                >
                  <div className="tooltip-content">
                    <div>{format(new Date(encounter.start), 'MMM dd, yyyy')}</div>
                    <div>{encounter.type}</div>
                    <div>{encounter.provider_name}</div>
                  </div>
                  <div 
                    className={`timeline-point-icon ${isPriority ? 'priority-icon' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPointClick(encounter.id);
                    }}
                  >
                    <FontAwesomeIcon 
                      icon={iconConfig.icon} 
                      style={{ 
                        color: providerColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
        <div className="timeline-labels">
          {generateTimelineLabels().map((label, index) => (
            <div
              key={index}
              className="timeline-label"
              style={{ left: `${label.position}%` }}
            >
              {format(label.date, 'MMM yyyy')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalTimeline;
