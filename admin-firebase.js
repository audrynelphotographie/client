import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPw-3ApKeXuLZM2TULUVKeuM4ZbL0nWGU",
  authDomain: "clientaudrynel-44785.firebaseapp.com",
  databaseURL: "https://clientaudrynel-44785-default-rtdb.firebaseio.com",
  projectId: "clientaudrynel-44785",
  storageBucket: "clientaudrynel-44785.firebasestorage.app",
  messagingSenderId: "159483195754",
  appId: "1:159483195754:web:95e5dd56c326c0d4937513",
  measurementId: "G-BDNXVS3FHH"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, getDocs, getDoc, doc };