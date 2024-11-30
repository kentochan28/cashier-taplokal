import React from 'react';
import { CartDetails, ItemCart } from '../types/Types';
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { fs } from "../utils/firebaseConfig";
import toast from 'react-hot-toast';
import generateTransactionNumber from '../utils/generateTransactionNumber';
import handlePrint from '../utils/print';

const OrderItem = ({ cart }: { cart: CartDetails }) => {
    const { cartId, createdAt, customerId, dineInOrTakeout, items, orderNumber, status, tableNumber } = cart;
    console.log(customerId)
    const total = items.reduce((acc: number, item: ItemCart) => acc + item.price * item.quantity, 0);
    const orderRef = doc(fs, "checkouts", cartId);

    const handleApprove = async () => {
        toast.dismiss();
        const orderRef = doc(fs, "checkouts", cartId);
        updateDoc(orderRef, {
            status: "approved"
        });
        const userRef = doc(fs, "users", customerId);
        updateDoc(userRef, {
            notification: ["Checkout Update", "Your order has been approved", "success", false]
        });
        toast.success("Approve order: " + cartId);
        const transactionNumber = generateTransactionNumber(orderNumber);
        const cashierName = localStorage.getItem("cashier")
        handlePrint(items, transactionNumber, tableNumber, dineInOrTakeout, orderNumber, cashierName)
    };

    const handleReject = async () => {
        if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
            const tableRef = doc(fs, 'tables', `table_${tableNumber}`);

            await setDoc(tableRef, {
                tableNumber: tableNumber,
                status: "unoccupied"
            });
        }
        const userRef = doc(fs, "users", customerId);
        updateDoc(userRef, {
            notification: ["Checkout Update", "Your order has been rejected", "warning", false]
        });
        toast.dismiss();
        toast.error("Reject order: " + cartId);

        updateDoc(orderRef, {
            status: "rejected"
        });

        items.forEach(async (item: ItemCart) => {
            const itemRef = doc(fs, "menu", item.menuItemId);
            const itemDoc = await getDoc(itemRef);
            const currentStock = itemDoc.data()?.stock || 0;
            await updateDoc(itemRef, {
                stock: currentStock + item.quantity
            });
        });
    }

    const handleCompleted = async () => {
        toast.dismiss();
        toast.success("Order completed: " + cartId);

        await updateDoc(orderRef, {
            status: "completed"
        });

        const stockChecks = items.map(async (item: ItemCart) => {
            const itemRef = doc(fs, "menu", item.menuItemId);
            const itemDoc = await getDoc(itemRef);
            const currentSold = itemDoc.data()?.sold || 0;

            await updateDoc(itemRef, {
                sold: currentSold + item.quantity
            });
        });


        await Promise.all(stockChecks);
    }

    const handleCancel = async () => {
        if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
            const tableRef = doc(fs, 'tables', `table_${tableNumber}`);

            await setDoc(tableRef, {
                tableNumber: tableNumber,
                status: "unoccupied"
            });
        }

        const userRef = doc(fs, "users", customerId);
        updateDoc(userRef, {
            notification: ["Checkout Update", "Your order has been cancelled", "error"]
        });

        toast.dismiss();
        toast.error("Order cancelled: " + cartId);

        updateDoc(orderRef, {
            status: "cancelled"
        });

        items.forEach(async (item: ItemCart) => {
            const itemRef = doc(fs, "menu", item.menuItemId);
            const itemDoc = await getDoc(itemRef);
            const currentSold = itemDoc.data()?.sold || 0;
            const currentStock = itemDoc.data()?.stock || 0;
            await updateDoc(itemRef, {
                stock: currentStock + item.quantity
            });
        });
    }

    return (
        <div className="w-full px-8 py-6 bg-white shadow-md rounded-lg text-sm">
            <div className="flex justify-between border-b pb-4 mb-4">
                <div className="space-y-2">
                    <h1 className="text-xs font-semibold">Customer ID: {customerId}</h1>
                    <h2 className="text-sm">Order No: <strong>{orderNumber}</strong></h2>
                    <h2 className="text-sm">Table No: <strong>{tableNumber}</strong></h2>
                </div>
                <div className="space-y-2 text-right">
                    <h2 className="text-sm capitalize"><strong>{dineInOrTakeout}</strong></h2>
                    <h2 className="text-sm lowercase"><strong>{createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></h2>
                </div>
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    {items.map((item: ItemCart, index: number) => (
                        <div key={index} className="flex gap-3">
                            <h2 className="text-md font-semibold">{item.name}</h2>
                            <h2 className="text-md">{item.quantity}x</h2>
                            <h2 className="text-md">₱{item.price}</h2>
                        </div>
                    ))}
                </div>
                <div className="space-y-2 text-right ">
                    <h1 className="text-base">Total Order: <strong>{total.toLocaleString('en-US', { style: "currency", currency: "PHP" })}</strong></h1>
                    {status == "pending" ?
                        <div className="flex space-x-4 mt-4 justify-end">
                            <button onClick={handleApprove} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                                Approve
                            </button>
                            <button onClick={handleReject} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                                Reject
                            </button>
                        </div> :
                        <div className="flex space-x-4 mt-4 justify-end">
                            <button onClick={handleCompleted} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                                Complete
                            </button>
                            <button onClick={handleCancel} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                                Cancel
                            </button>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}

export default OrderItem;
