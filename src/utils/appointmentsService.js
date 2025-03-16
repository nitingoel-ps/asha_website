import axiosInstance from './axiosInstance';

/**
 * Fetches all appointments for the current user
 * @returns {Promise} Promise that resolves to an array of appointments
 */
export const fetchAppointments = async () => {
  try {
    const response = await axiosInstance.get('/appointments/');
    
    // Extract the appointments array from the response
    // The API returns { "appointments": [] } instead of the array directly
    if (response.data && response.data.appointments) {
      return response.data.appointments;
    }
    
    // Fallback to ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Fetches a specific appointment by ID
 * @param {number} appointmentId - The ID of the appointment to fetch
 * @returns {Promise} Promise that resolves to the appointment data
 */
export const fetchAppointmentById = async (appointmentId) => {
  try {
    const response = await axiosInstance.get(`/appointments/${appointmentId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching appointment ${appointmentId}:`, error);
    throw error;
  }
};

/**
 * Updates the status of an appointment
 * @param {number} appointmentId - The ID of the appointment to update
 * @param {string} status - The new status value
 * @returns {Promise} Promise that resolves to the updated appointment data
 */
export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const response = await axiosInstance.patch(`/appointments/${appointmentId}/status/`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating appointment ${appointmentId} status:`, error);
    throw error;
  }
};

/**
 * Creates a new appointment
 * @param {Object} appointmentData - The appointment data to create
 * @returns {Promise} Promise that resolves to the created appointment data
 */
export const createAppointment = async (appointmentData) => {
  try {
    const response = await axiosInstance.post('/appointments/', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

/**
 * Updates an existing appointment
 * @param {number} appointmentId - The ID of the appointment to update
 * @param {Object} appointmentData - The updated appointment data
 * @returns {Promise} Promise that resolves to the updated appointment data
 */
export const updateAppointment = async (appointmentId, appointmentData) => {
  try {
    const response = await axiosInstance.put(`/appointments/${appointmentId}/`, appointmentData);
    return response.data;
  } catch (error) {
    console.error(`Error updating appointment ${appointmentId}:`, error);
    throw error;
  }
}; 