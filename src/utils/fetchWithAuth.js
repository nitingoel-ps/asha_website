export async function fetchWithAuth(url, options = {}) {
    const baseURL = process.env.REACT_APP_API_BASE_URL; // Your API base URL
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
  
    // Set the Authorization header if access_token exists
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json", // Add other headers as needed
    };
  
    let response = await fetch(`${baseURL}${url}`, options);
  
    // Check if token has expired (401 Unauthorized)
    if (response.status === 401 && refreshToken) {
      // Try refreshing the token
      const tokenResponse = await fetch(`${baseURL}/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
  
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        const newAccessToken = tokenData.access;
  
        // Save the new token and retry the original request
        localStorage.setItem("access_token", newAccessToken);
        options.headers.Authorization = `Bearer ${newAccessToken}`;
  
        response = await fetch(`${baseURL}${url}`, options);
      } else {
        // Handle refresh failure: log the user out or redirect
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }
    }
  
    // Return the response after retry or success
    return response;
  }