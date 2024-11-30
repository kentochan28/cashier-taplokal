import Image from "next/image";
import { Item } from "../types/Types";
import { auth, fs } from "../utils/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, setDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";

const Popular = ({ item }: { item: Item }) => {

  const { id, imageURL, name, price, stock } = item;

  const addToCart = async () => {
    try {
      const customerId = auth.currentUser!.uid

      const cartsCollectionRef = collection(fs, 'carts');
      const q = query(cartsCollectionRef, where("customerId", "==", customerId), where("status", "==", "cart"));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cartDoc = querySnapshot.docs[0];
        const cartData = cartDoc.data();

        const existingItemIndex = cartData.items.findIndex((cartItem: { menuItemId: string; }) => cartItem.menuItemId === id);

        if (existingItemIndex >= 0) {
          const updatedItems = cartData.items.map((cartItem: { quantity: number; }, index: number) => {
            if (index === existingItemIndex) {
              return {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              };
            }
            return cartItem;
          });

          await updateDoc(cartDoc.ref, {
            items: updatedItems,
          });
        } else {
          await updateDoc(cartDoc.ref, {
            items: [
              ...cartData.items,
              {
                menuItemId: id,
                name: name,
                quantity: 1,
                price: price,
                imageURL: imageURL,
              },
            ],
          });
        }
      } else {
        const newCartRef = doc(cartsCollectionRef);

        await setDoc(newCartRef, {
          cartId: newCartRef.id,
          customerId: customerId,
          status: 'cart',
          items: [{
            menuItemId: id,
            name: name,
            quantity: 1,
            price: price,
            imageURL: imageURL,
          }],
        });
      }

      toast.success("Item added: " + name);
    } catch (error) {
      toast.error("Error adding item to cart: " + error);
    }
  };


  return (
    <div key={id} className='w-full bg-background hover:bg-foreground/20 border rounded-lg shadow-md overflow-hidden relative pb-16'>
      <div className="relative w-full h-0 pb-[100%]">
        {stock === 0 && <div className="absolute top-0 left-0 w-full h-full bg-black text-white bg-opacity-50 z-50 flex justify-center items-center">Out of Stock</div>}
        <Image src={imageURL} alt="logo" layout="fill" objectFit="cover" />
      </div>
      <div className="p-4">
        <h2 className="text-xl font-medium capitalize mb-2">{name}</h2>
        <div className="flex justify-between items-center absolute bottom-0 left-0 w-full px-4 py-3 bg-white bg-opacity-90">
          <h1 className="text-lg font-semibold">₱{price}.00</h1>
          <button disabled={stock == 0} onClick={addToCart} className="py-2 px-6 bg-foreground hover:bg-primary/90 rounded-lg text-sm font-medium text-background border">Add to Cart</button>
        </div>
      </div>
    </div>

  );
};

export default Popular;
