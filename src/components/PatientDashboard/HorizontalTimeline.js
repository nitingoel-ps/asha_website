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
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import './HorizontalTimeline.css';

const encounterTypeIcons = {
  'Office Visit': { icon: faStethoscope, color: '#4CAF50' },
  'Telephone': { icon: faPhone, color: '#2196F3' },
  'Urgent Care Office Visit': { icon: faHospitalAlt, color: '#FF5722' },
  'Video Visit': { icon: faVideo, color: '#9C27B0' },
  'AACC Telephone': { icon: faPhone, color: '#2196F3' },
  'Telephone Appointment Visit': { icon: faPhone, color: '#2196F3' },
  'AACC Member Call History': { icon: faPhone, color: '#2196F3' },
  'Clinical Documentation': { icon: faBookMedical, color: '#607D8B' },
  'Allied Health/Nurse Visit': { icon: faUserNurse, color: '#00BCD4' },
  'Ancillary Visit': { icon: faFlask, color: '#795548' },
  'Education': { icon: faBook, color: '#009688' }
};

const HorizontalTimeline = ({ encounters, onPointClick, title }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const timelineRef = useRef(null);
  
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
      
      // Only zoom if selection is at least 10% of timeline
      if (end - start >= 10) {
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

  return (
    <div className="horizontal-timeline">
      {title && <h3 className="timeline-header">{title}</h3>}
      
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
        {isDragging && dragStart !== null && dragEnd !== null && (
          <div 
            className="selection-overlay"
            style={{
              left: `${Math.min(dragStart, dragEnd)}%`,
              width: `${Math.abs(dragEnd - dragStart)}%`
            }}
          />
        )}
        <div className="timeline-line">
          {generateTimelineTicks().map((tick, index, array) => (
            <div
              key={`tick-${index}`}
              className={`timeline-tick ${
                index === 0 || index === array.length - 1 ? 'tick-edge' : ''
              }`}
              style={{ left: `${tick.position}%` }}
            />
          ))}
          {sortedEncounters.map((encounter) => {
            const position = getPositionOnTimeline(encounter.start);
            const iconConfig = encounterTypeIcons[encounter.type] || 
              { icon: faClinicMedical, color: '#666' };

            return (
              <div
                key={encounter.id}
                className="timeline-point"
                style={{ left: `${position}%` }}
                onClick={() => onPointClick(encounter.id)}
                data-tip
                data-for={`encounter-${encounter.id}`}
              >
                <div className="tooltip-content">
                  <div>{format(new Date(encounter.start), 'MMM dd, yyyy')}</div>
                  <div>{encounter.type}</div>
                </div>
                <FontAwesomeIcon 
                  icon={iconConfig.icon} 
                  style={{ color: iconConfig.color }}
                />
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
