import React, { useState, useEffect } from "react";
import { CartDetails, ItemCart } from "../types/Types";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { fs } from "../utils/firebaseConfig";
import toast from "react-hot-toast";
import generateTransactionNumber from "../utils/generateTransactionNumber";
import handlePrint from "../utils/print";

const OrderItem = ({ cart }: { cart: CartDetails }) => {
  const {
    cartId,
    createdAt,
    customerId,
    dineInOrTakeout,
    items,
    orderNumber,
    status,
    tableNumber,
  } = cart;

  const [isDiscounted, setIsDiscounted] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");

  useEffect(() => {
    const fetchCustomerName = async () => {
      try {
        const customerDoc = await getDoc(doc(fs, "users", customerId));
        if (customerDoc.exists()) {
          setCustomerName(customerDoc.data().name || "Unknown Customer");
        } else {
          setCustomerName("Unknown Customer");
        }
      } catch (error) {
        console.error("Failed to fetch customer name:", error);
        setCustomerName("Error fetching name");
      }
    };

    fetchCustomerName();
  }, [customerId]);

  // Calculate discounted price per item, apply discount only if not applied yet
  const calculateDiscountedItems = () => {
    return items.map((item) => ({
      ...item,
      discountedPrice:
        discountApplied || !isDiscounted ? item.price : item.price * 0.8,
    }));
  };

  // Calculate total discounted price
  const calculateTotal = (discountedItems: ItemCart[]) => {
    return discountedItems.reduce(
      (acc, item) => acc + item.discountedPrice * item.quantity,
      0
    );
  };

  const discountedItems = calculateDiscountedItems();
  const totalDiscountedPrice = calculateTotal(discountedItems);

  const handleApprove = async () => {
    toast.dismiss();
    try {
      // Update status and items in Firebase
      await updateDoc(doc(fs, "checkouts", cartId), {
        status: "approved",
        items: discountedItems.map((item) => ({
          ...item,
          price: item.discountedPrice,
        })),
      });

      setDiscountApplied(true);

      // Notify user
      await updateDoc(doc(fs, "users", customerId), {
        notification: [
          "Checkout Update",
          "Your order has been approved",
          "success",
          false,
        ],
      });

      // Generate transaction and print
      const transactionNumber = generateTransactionNumber(orderNumber);
      const cashierName = localStorage.getItem("cashier");
      handlePrint(
        discountedItems,
        transactionNumber,
        tableNumber,
        dineInOrTakeout,
        orderNumber,
        cashierName
      );

      toast.success("Order approved: " + cartId);
    } catch (error) {
      toast.error("Failed to approve order.");
      console.error(error);
    }
  };

  const handleReject = async () => {
    try {
      if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
        const tableRef = doc(fs, "tables", `table_${tableNumber}`);
        await setDoc(tableRef, {
          tableNumber: tableNumber,
          status: "unoccupied",
        });
      }

      await updateDoc(doc(fs, "users", customerId), {
        notification: [
          "Checkout Update",
          "Your order has been rejected",
          "warning",
          false,
        ],
      });

      await updateDoc(doc(fs, "checkouts", cartId), {
        status: "rejected",
      });

      for (const item of items) {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentStock = itemDoc.data()?.stock || 0;
          await updateDoc(itemRef, {
            stock: currentStock + item.quantity,
          });
        }
      }

      toast.dismiss();
      toast.error("Order rejected: " + cartId);
    } catch (error) {
      toast.error("Failed to reject order.");
      console.error(error);
    }
  };

  const handleCompleted = async () => {
    try {
      await updateDoc(doc(fs, "checkouts", cartId), {
        status: "completed",
      });

      const stockChecks = items.map(async (item) => {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentSold = itemDoc.data()?.sold || 0;
          await updateDoc(itemRef, {
            sold: currentSold + item.quantity,
          });
        }
      });

      await Promise.all(stockChecks);

      toast.dismiss();
      toast.success("Order completed: " + cartId);
    } catch (error) {
      toast.error("Failed to mark order as completed.");
      console.error(error);
    }
  };

  const handleCancel = async () => {
    try {
      if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
        const tableRef = doc(fs, "tables", `table_${tableNumber}`);
        await setDoc(tableRef, {
          tableNumber: tableNumber,
          status: "unoccupied",
        });
      }

      await updateDoc(doc(fs, "users", customerId), {
        notification: [
          "Checkout Update",
          "Your order has been cancelled",
          "error",
        ],
      });

      await updateDoc(doc(fs, "checkouts", cartId), {
        status: "cancelled",
      });

      for (const item of items) {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentStock = itemDoc.data()?.stock || 0;
          await updateDoc(itemRef, {
            stock: currentStock + item.quantity,
          });
        }
      }

      toast.dismiss();
      toast.error("Order cancelled: " + cartId);
    } catch (error) {
      toast.error("Failed to cancel order.");
      console.error(error);
    }
  };

  return (
    <div className="w-full px-8 py-6 bg-white shadow-md rounded-lg text-sm">
      <div className="flex justify-between border-b pb-4 mb-4">
        <div className="space-y-2">
          <h1 className="text-xs font-semibold">Name: {customerName}</h1>
          <h1 className="text-xs font-semibold">Customer ID: {customerId}</h1>
          <h2 className="text-sm ">
            Order No: <strong>{orderNumber}</strong>
          </h2>
          <h2 className="text-sm">
            Table No: <strong>{tableNumber}</strong>
          </h2>
        </div>
        <div className="space-y-2 text-right">
          <h2 className="text-sm capitalize">
            <strong>{dineInOrTakeout}</strong>
          </h2>
          <h2 className="text-sm lowercase">
            <strong>
              {createdAt
                .toDate()
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </strong>
          </h2>
        </div>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          {discountedItems.map((item, index) => (
            <div key={index} className="flex gap-3">
              <h2 className="text-md font-semibold">{item.name}</h2>
              <h2 className="text-md">{item.quantity}x</h2>
              <h2 className="text-md">
                ₱{item.discountedPrice.toFixed(2)} (₱{item.price})
              </h2>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-right">
          <div>
            <label>
              <input
                type="checkbox"
                checked={isDiscounted}
                onChange={() => {
                  setIsDiscounted(!isDiscounted);
                  setDiscountApplied(false); // Reset discount status when checkbox is toggled
                }}
                className="mr-2"
              />
              Senior Citizen/PWD
            </label>
          </div>
          <h1 className="text-base">
            Total Order: <strong>₱{totalDiscountedPrice.toFixed(2)}</strong>
          </h1>
          {status === "pending" ? (
            <div className="flex space-x-4 mt-4 justify-end">
              <button
                onClick={handleApprove}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="flex space-x-4 mt-4 justify-end">
              <button
                onClick={handleCompleted}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Complete
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderItem;
