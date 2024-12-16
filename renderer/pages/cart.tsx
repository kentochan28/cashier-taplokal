"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fs, auth } from "../utils/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  updateDoc,
  where,
  onSnapshot,
  addDoc,
  increment,
} from "firebase/firestore";
import { ItemCart } from "../types/Types";
import toast from "react-hot-toast";
import { onAuthStateChanged, User } from "firebase/auth";
import generateTransactionNumber from "../utils/generateTransactionNumber";
import handlePrint from "../utils/print";
import Image from "next/image";
import { query } from "firebase/firestore";

const Page = () => {
  const router = useRouter();
  const [dineInOrTakeout, setDineInOrTakeOut] = useState<string | null>(
    "dinein"
  );
  const [cartItems, setCartItems] = useState<Array<ItemCart>>([]);
  const [user, setUser] = useState<User | null>(null);
  const [cartId, setCartId] = useState<string>("");
  const [tableNumber, setTableNumber] = useState<number>(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isDiscounted, setIsDiscounted] = useState(false);

  useEffect(() => {
    const tableNumber = localStorage.getItem("tableNumber");
    const method = localStorage.getItem("method");
    setTableNumber(Number(tableNumber));
    setDineInOrTakeOut(method);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) =>
      setUser(currentUser)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    if (!user) return;
    const cartsCollectionRef = collection(fs, "carts");
    const q = query(cartsCollectionRef, where("customerId", "==", user.uid));

    unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const cartDoc = querySnapshot.docs[0];
          setCartId(cartDoc.id);
          const items = cartDoc
            .data()
            .items.map((item: ItemCart, index: number) => ({
              id: index,
              name: item.name,
              price: item.price,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              imageURL: item.imageURL || "",
            }));
          setCartItems(items);
        } else {
          setCartItems([]);
        }
      },
      (error) => {
        console.error("Error fetching cart item count: ", error);
      }
    );

    return () => unsubscribe();
  }, [user, router]);

  const calculateDiscountedItems = () => {
    return cartItems.map((item) => {
      const originalPrice = item.price;
      const discountedPrice =
        isDiscounted && !discountApplied ? item.price * 0.8 : item.price;
      const discountAmount =
        isDiscounted && !discountApplied ? item.price * 0.2 : 0;

      return {
        ...item,
        originalPrice,
        discountedPrice,
        discountAmount,
      };
    });
  };

  const calculateTotal = (discountedItems: any) => {
    const totalPrice = discountedItems.reduce(
      (acc: number, item: any) => acc + item.discountedPrice * item.quantity,
      0
    );
    const totalDiscount = discountedItems.reduce(
      (acc: number, item: any) => acc + item.discountAmount * item.quantity,
      0
    );

    return { totalPrice, totalDiscount };
  };

  const discountedItems = calculateDiscountedItems();
  const { totalPrice: totalDiscountedPrice, totalDiscount } =
    calculateTotal(discountedItems);

  const handleCheckout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    toast.dismiss();
    const button = e.currentTarget;
    button.disabled = true;

    if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
      const tableRef = doc(fs, "tables", `table_${tableNumber}`);
      const tableDoc = await getDoc(tableRef);
      if (tableDoc.data()?.status === "occupied") {
        toast.error("Table is already occupied");
        return;
      }

      await setDoc(tableRef, {
        tableNumber: tableNumber,
        status: "occupied",
      });
    }

    if (!user) return;
    if (cartItems.length === 0) {
      toast.dismiss();
      toast.error("No items in cart");
      button.disabled = false;
      return;
    }

    try {
      const stockChecks = cartItems.map(async (item: ItemCart) => {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
          throw new Error(`Item ${item.name} does not exist`);
        }

        const currentStock = itemDoc.data()?.stock || 0;
        if (currentStock < item.quantity) {
          throw new Error(
            `Available stock for ${item.name} is ${currentStock}`
          );
        }

        await updateDoc(itemRef, {
          stock: currentStock - item.quantity,
        });
      });

      await Promise.all(stockChecks);

      const updatedItems = discountedItems.map((item) => ({
        ...item,
        price: item.discountedPrice,
      }));

      await runTransaction(fs, async (transaction) => {
        const counterRef = doc(fs, "counters", "checkoutCounter");
        const counterDoc = await transaction.get(counterRef);
        let newOrderNumber;

        if (counterDoc.exists()) {
          const currentCount = counterDoc.data().count;
          newOrderNumber = currentCount + 1;
          transaction.update(counterRef, { count: increment(1) });
        } else {
          newOrderNumber = 1000;
          transaction.set(counterRef, { count: 1000 });
        }

        const checkoutsCollectionRef = collection(fs, "checkouts");
        const transactionNumber = generateTransactionNumber(newOrderNumber);
        await addDoc(checkoutsCollectionRef, {
          customerId: user.uid,
          items: updatedItems,
          status: "approved",
          tableNumber: tableNumber,
          transactionNumber: transactionNumber,
          dineInOrTakeout: dineInOrTakeout,
          createdAt: new Date(),
          orderNumber: newOrderNumber,
        });

        const cartRef = doc(fs, "carts", cartId);
        transaction.update(cartRef, { items: [] });
        toast.success("Checkout successful!");

        const cashierName = localStorage.getItem("cashier");
        handlePrint(
          updatedItems,
          transactionNumber,
          tableNumber,
          dineInOrTakeout,
          newOrderNumber,
          cashierName,
          totalDiscount
        );
      });
    } catch (error) {
      toast.error("Checkout failed.");
      console.error(error);
    }
  };

  const handleIncrement = async (item: ItemCart) => {
    const updatedItem = { ...item, quantity: item.quantity + 1 };
    await updateItemInFirestore(updatedItem);
  };

  const handleDecrement = async (item: ItemCart) => {
    if (item.quantity > 1) {
      const updatedItem = { ...item, quantity: item.quantity - 1 };
      await updateItemInFirestore(updatedItem);
    } else {
      await removeItemFromFirestore(item);
    }
  };

  const updateItemInFirestore = async (updatedItem: ItemCart) => {
    const cartRef = doc(fs, "carts", cartId);
    const cartDoc = await getDoc(cartRef);
    const cartData = cartDoc.data();
    if (!cartData) {
      console.error("Cart data is undefined");
      return;
    }
    const updatedItems = cartData.items.map((i: ItemCart) =>
      i.menuItemId === updatedItem.menuItemId ? updatedItem : i
    );
    await updateDoc(cartRef, { items: updatedItems.filter(Boolean) });
  };

  const removeItemFromFirestore = async (item: ItemCart) => {
    const cartRef = doc(fs, "carts", cartId);
    const cartDoc = await getDoc(cartRef);
    const cartData = cartDoc.data();
    if (!cartData) {
      console.error("Cart data is undefined");
      return;
    }

    const updatedItems = cartData.items.filter(
      (i: ItemCart) => i.menuItemId !== item.menuItemId
    );
    await updateDoc(cartRef, { items: updatedItems.filter(Boolean) });
  };

  return (
    <div className="w-full px-8 py-8 bg-white shadow-lg rounded-xl text-sm max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold text-left mb-8">My Order</h2>

      {/* Senior Citizen/PWD Discount Toggle */}
      <div className="flex items-center justify-start mb-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isDiscounted}
            onChange={() => {
              setIsDiscounted(!isDiscounted);
              setDiscountApplied(false);
            }}
            className="mr-4"
          />
          <label className="text-lg">Senior Citizen/PWD</label>
        </div>
      </div>

      {cartItems.length > 0 ? (
        <div className="space-y-8">
          {/* Cart Items */}
          <div className="space-y-6">
            {discountedItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-5 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                {/* Item Image */}
                <div className="flex items-center space-x-5">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg relative">
                    <Image
                      src={item.imageURL}
                      alt={item.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="ml-6">
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      Rice, anchovies, peanuts, egg, cucumber, sambal
                    </p>
                    <p className="text-sm text-gray-600">x{item.quantity}</p>
                  </div>
                </div>

                {/* Item Price and Quantity */}
                <div className="flex flex-col items-end space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl font-semibold text-gray-700">
                      ₱{item.discountedPrice.toFixed(2)}
                    </span>
                    {isDiscounted && (
                      <span className="text-xs text-red-500 line-through">
                        ₱{item.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Quantity Buttons */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleDecrement(item)}
                      className="text-2xl font-bold text-gray-600 hover:text-gray-800 transition-colors duration-150"
                    >
                      -
                    </button>
                    <span className="text-xl font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(item)}
                      className="text-2xl font-bold text-foreground-600 hover:text-foreground-800 transition-colors duration-150"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Section */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <p className="font-semibold text-2xl text-gray-700">
              Total:{" "}
              <span className="text-primary text-xl">
                ₱{totalDiscountedPrice.toFixed(2)}
              </span>
            </p>
            <button
              onClick={handleCheckout}
              className="bg-foreground text-white px-10 py-4 rounded-md font-semibold shadow-md hover:shadow-xl transition-all duration-200"
            >
              Checkout
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-full text-gray-400">
          <p>Your cart is empty</p>
        </div>
      )}
    </div>
  );
};

export default Page;
