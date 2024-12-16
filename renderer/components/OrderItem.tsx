import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { fs } from "../utils/firebaseConfig";
import toast from "react-hot-toast";
import generateTransactionNumber from "../utils/generateTransactionNumber";
import handlePrint from "../utils/print";

const OrderItem = ({ cart }) => {
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
  const [customerName, setCustomerName] = useState("Unknown Customer");

  const fetchCustomerName = useCallback(async () => {
    try {
      const customerDoc = await getDoc(doc(fs, "users", customerId));
      if (customerDoc.exists()) {
        setCustomerName(customerDoc.data()?.name || "Unknown Customer");
      }
    } catch (error) {
      console.error("Failed to fetch customer name:", error);
      setCustomerName("Error fetching name");
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerName();
  }, [fetchCustomerName]);

  const calculateDiscountedItems = useCallback(() => {
    return items.map((item) => {
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
  }, [items, isDiscounted, discountApplied]);

  const calculateTotal = useCallback((discountedItems) => {
    const totalPrice = discountedItems.reduce(
      (acc, item) => acc + item.discountedPrice * item.quantity,
      0
    );
    const totalDiscount = discountedItems.reduce(
      (acc, item) => acc + item.discountAmount * item.quantity,
      0
    );

    return { totalPrice, totalDiscount };
  }, []);

  const discountedItems = calculateDiscountedItems();
  const { totalPrice: totalDiscountedPrice, totalDiscount } =
    calculateTotal(discountedItems);

  const updateOrderStatus = async (status, additionalUpdates = {}) => {
    try {
      await updateDoc(doc(fs, "checkouts", cartId), {
        status,
        ...additionalUpdates,
      });
      toast.success(`Order ${status}: ${cartId}`);
    } catch (error) {
      toast.error(`Failed to update order status to ${status}.`);
      console.error(error);
    }
  };

  const handleApprove = async () => {
    toast.dismiss();
    try {
      const updatedItems = discountedItems.map((item) => ({
        ...item,
        price: item.discountedPrice,
      }));

      await updateOrderStatus("approved", { items: updatedItems });
      setDiscountApplied(true);

      await updateDoc(doc(fs, "users", customerId), {
        notification: [
          "Checkout Update",
          "Your order has been approved",
          "success",
          false,
        ],
      });

      const transactionNumber = generateTransactionNumber(orderNumber);
      const cashierName = localStorage.getItem("cashier");
      handlePrint(
        updatedItems,
        transactionNumber,
        tableNumber,
        dineInOrTakeout,
        orderNumber,
        cashierName,
        totalDiscount
      );
    } catch (error) {
      toast.error("Failed to approve order.");
      console.error(error);
    }
  };

  const handleRejectOrCancel = async (newStatus) => {
    try {
      if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
        await setDoc(doc(fs, "tables", `table_${tableNumber}`), {
          tableNumber,
          status: "unoccupied",
        });
      }

      await updateOrderStatus(newStatus);

      for (const item of items) {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentStock = itemDoc.data()?.stock || 0;
          await updateDoc(itemRef, { stock: currentStock + item.quantity });
        }
      }
    } catch (error) {
      toast.error(`Failed to ${newStatus} order.`);
      console.error(error);
    }
  };

  const handleCompleted = async () => {
    try {
      await updateOrderStatus("completed");

      const stockUpdates = items.map(async (item) => {
        const itemRef = doc(fs, "menu", item.menuItemId);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentSold = itemDoc.data()?.sold || 0;
          await updateDoc(itemRef, { sold: currentSold + item.quantity });
        }
      });

      await Promise.all(stockUpdates);
    } catch (error) {
      toast.error("Failed to mark order as completed.");
      console.error(error);
    }
  };

  return (
    <div className="w-full px-8 py-6 bg-white shadow-md rounded-lg text-sm">
      <div className="flex justify-between border-b pb-4 mb-4">
        <div className="space-y-2">
          <h1 className="text-xs font-semibold">Name: {customerName}</h1>
          <h1 className="text-xs font-semibold">Customer ID: {customerId}</h1>
          <h2 className="text-sm">
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
                ₱{item.discountedPrice.toFixed(2)}
                {isDiscounted && (
                  <span>(₱{item.originalPrice.toFixed(2)})</span>
                )}
              </h2>
              {isDiscounted && (
                <h2 className="text-md text-green-500">
                  Saved: ₱{(item.discountAmount * item.quantity).toFixed(2)}
                </h2>
              )}
            </div>
          ))}
          <div className="text-right">
            {isDiscounted && (
              <h2 className="text-sm text-green-500">
                Total Discount: ₱{totalDiscount.toFixed(2)}
              </h2>
            )}
            <h2 className="text-md font-bold">
              Total: ₱{totalDiscountedPrice.toFixed(2)}
            </h2>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div>
            <label>
              <input
                type="checkbox"
                checked={isDiscounted}
                onChange={() => {
                  setIsDiscounted(!isDiscounted);
                  setDiscountApplied(false);
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
                onClick={() => handleRejectOrCancel("rejected")}
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
                onClick={() => handleRejectOrCancel("cancelled")}
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

OrderItem.propTypes = {
  cart: PropTypes.shape({
    cartId: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    customerId: PropTypes.string.isRequired,
    dineInOrTakeout: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    orderNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      .isRequired,
    status: PropTypes.string.isRequired,
    tableNumber: PropTypes.number.isRequired,
  }).isRequired,
};

export default OrderItem;
