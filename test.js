import { db } from './firebase-config';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Test write
async function testWrite() {
  try {
    const docRef = await addDoc(collection(db, "test"), {
      message: "Hello Firestore!",
      timestamp: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// Test read
async function testRead() {
  try {
    const querySnapshot = await getDocs(collection(db, "test"));
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
    });
  } catch (e) {
    console.error("Error reading documents: ", e);
  }
}