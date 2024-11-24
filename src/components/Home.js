// src/components/Home.js
import React from "react";
import { useAuth } from "../context/AuthContext"; // Use authentication context
import LoggedInHome from "./Home/LoggedInHome";
import LoggedOutHome from "./Home/LoggedOutHome";

function Home() {
  const { isAuthenticated } = useAuth(); // Check if the user is logged in

  return isAuthenticated ? <LoggedInHome /> : <LoggedOutHome />;
}

export default Home;