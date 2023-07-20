// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHrkmu7aBMn-UaCC6LYeIZrd2gn6iefoc",
  authDomain: "budget-app-9134f.firebaseapp.com",
  projectId: "budget-app-9134f",
  storageBucket: "budget-app-9134f.appspot.com",
  messagingSenderId: "571780527004",
  appId: "1:571780527004:web:375c6412329457ad8c4e59",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

export default database;
