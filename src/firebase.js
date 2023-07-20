// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { apiKey, projectId, appId, messagingSenderId } from "./keys";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: "budget-app-9134f.firebaseapp.com",
  projectId: projectId,
  storageBucket: "budget-app-9134f.appspot.com",
  messagingSenderId: messagingSenderId,
  appId: appId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

export default database;
