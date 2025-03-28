const handleAddClick = () => {
  if (activeTab === 'vitals') {
    // Dispatch custom event for vital signs
    window.dispatchEvent(new Event('openAddVital'));
  } else if (activeTab === 'medications') {
    // Handle medications add click
    window.dispatchEvent(new Event('openAddMedication'));
  }
}; 