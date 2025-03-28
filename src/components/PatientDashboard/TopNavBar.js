const handleAddClick = () => {
  switch (activeTab) {
    case 'vitals':
      window.dispatchEvent(new Event('openAddVital'));
      break;
    case 'medications':
      window.dispatchEvent(new Event('openAddMedication'));
      break;
    case 'symptoms':
      window.dispatchEvent(new Event('openAddSymptom'));
      break;
    default:
      break;
  }
}; 