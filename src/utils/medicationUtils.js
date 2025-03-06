/**
 * Retrieves the latest value of a field from past_medications if it doesn't exist at the medication level
 * @param {Object} medication - The medication object
 * @param {String} fieldName - The name of the field to retrieve
 * @returns {*} - The value of the field, or null if not found
 */
export const getLatestFromPastMedications = (medication, fieldName) => {
  if (medication[fieldName]) {
    return medication[fieldName];
  }
  
  if (!medication.past_medications || medication.past_medications.length === 0) {
    return null;
  }
  
  // Sort past_medications by authoredOn date in descending order
  const sortedPastMeds = [...medication.past_medications].sort((a, b) => {
    const dateA = new Date(a.authoredOn || 0);
    const dateB = new Date(b.authoredOn || 0);
    return dateB - dateA;
  });
  
  // Return the field from the most recent record
  return sortedPastMeds[0][fieldName];
};

/**
 * Formats a date string to a readable format
 * @param {String} dateString - The date string to format
 * @returns {String} - The formatted date string
 */
export const formatMedicationDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { day: "numeric", month: "short", year: "numeric" };
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", options);
};
