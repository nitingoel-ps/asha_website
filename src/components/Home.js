// src/components/Home.js
import React from "react";
import { useAuth } from "../context/AuthContext"; // Use authentication context
import LoggedInHome from "./Home/LoggedInHome";
// import LoggedOutHome from "./Home/LoggedOutHome"; // We will hide this
import ExternalWebsiteViewer from "./ExternalWebsiteViewer"; // Import the new component

function Home() {
  const { isAuthenticated } = useAuth(); // Check if the user is logged in

  return isAuthenticated ? <LoggedInHome /> : <ExternalWebsiteViewer />;
}

export default Home;