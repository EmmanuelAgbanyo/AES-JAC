import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For production environments, it is recommended to set the FIREBASE_API_KEY environment variable.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBonBAPtVrFpaEVZk4nU1-mD3di8qbmuC4",
  authDomain: "coffee-spark-sample-app-e38fd.firebaseapp.com",
  databaseURL: "https://coffee-spark-sample-app-e38fd-default-rtdb.firebaseio.com/",
  projectId: "coffee-spark-sample-app-e38fd",
  storageBucket: "coffee-spark-sample-app-e38fd.firebasestorage.app",
  messagingSenderId: "1051309352652",
  appId: "1:1051309352652:web:16b7d2915c719f421d0469"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);
