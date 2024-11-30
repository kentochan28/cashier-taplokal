import { collection, query, getDocs, updateDoc, where } from "firebase/firestore";
import { fs } from "./firebaseConfig";

const removeTemporaryId = async (kioskId: string) => {
  try {
    const cartsCollectionRef = collection(fs, "carts");
    const q = query(cartsCollectionRef, where("customerId", "==", kioskId));

    const querySnapshot = await getDocs(q);

    // Update each document that matches the query
    querySnapshot.forEach(async (doc) => {
      const docRef = doc.ref;
      await updateDoc(docRef, {
        items: [],
      });
    });

    console.log("Temporary ID removed successfully.");
  } catch (error) {
    console.error("Error removing temporary ID:", error);
  }
};

export default removeTemporaryId;