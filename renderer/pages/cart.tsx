"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import CartItem from '../components/CartItem'
import { auth, fs as firestore } from '../utils/firebaseConfig'
import { addDoc, collection, doc, getDoc, increment, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore'
import { ItemCart } from '../types/Types'
import toast from 'react-hot-toast'
import { onAuthStateChanged, User } from 'firebase/auth';
import generateTransactionNumber from '../utils/generateTransactionNumber';
import handlePrint from '../utils/print';

const Page = () => {
    const router = useRouter();
    const [dineInOrTakeout, setDineInOrTakeOut] = useState<string | null>("dinein")
    const [cartItems, setCartItems] = useState<Array<ItemCart>>([]);
    const [user, setUser] = useState<User | null>(null);
    const [cartId, setCartId] = useState<string>('');
    const [tableNumber, setTableNumber] = useState<number>(0);

    useEffect(() => {
        const tableNumber = localStorage.getItem('tableNumber');
        const method = localStorage.getItem('method');
        setTableNumber(Number(tableNumber))
        setDineInOrTakeOut(method)

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let unsubscribe = () => { };
        if (!user) return;
        const cartsCollectionRef = collection(firestore, 'carts');
        const q = query(cartsCollectionRef, where("customerId", "==", user.uid));

        unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const cartDoc = querySnapshot.docs[0];
                setCartId(cartDoc.id);
                const items = cartDoc.data().items.map((item: ItemCart, index: number) => {
                    return {
                        id: index,
                        name: item.name,
                        price: item.price,
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        imageURL: item.imageURL || ''
                    };
                });
                setCartItems(items);
            } else {
                setCartItems([]);
            }
        }, (error) => {
            console.error("Error fetching cart item count: ", error);
        });

        return () => unsubscribe();
    }, [user, router]);

    const handleCheckout = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        toast.dismiss();
        const button = e.currentTarget;
        button.disabled = true;

        if (dineInOrTakeout === "dine in" && tableNumber !== 0) {
            const tableRef = doc(firestore, 'tables', `table_${tableNumber}`);
            const tableDoc = await getDoc(tableRef);
            if (tableDoc.data()?.status === "occupied") {
                toast.error("Table is already occupied");
                return;
            }

            await setDoc(tableRef, {
                tableNumber: tableNumber,
                status: "occupied"
            });
        }
    
        if (!user) return;
        if (cartItems.length === 0) {
            toast.dismiss();
            toast.error('No items in cart');
            button.disabled = false;
            return;
        }
    
        try {
            const stockChecks = cartItems.map(async (item: ItemCart) => {
                const itemRef = doc(firestore, "menu", item.menuItemId);
                const itemDoc = await getDoc(itemRef);
            
                if (!itemDoc.exists()) {
                    throw new Error(`Item ${item.name} does not exist`);
                }
            
                const currentStock = itemDoc.data()?.stock || 0;
                if (currentStock < item.quantity) {
                    throw new Error(`Available stock for ${item.name} is ${currentStock}`);
                }
            
                await updateDoc(itemRef, {
                    stock: currentStock - item.quantity
                });
            });
            
    
            await Promise.all(stockChecks);
    
            await runTransaction(firestore, async (transaction) => {
                const counterRef = doc(firestore, 'counters', 'checkoutCounter');
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
    
                const checkoutsCollectionRef = collection(firestore, 'checkouts');
                const transactionNumber = generateTransactionNumber(newOrderNumber);
                await addDoc(checkoutsCollectionRef, {
                    customerId: user.uid,
                    items: cartItems,
                    status: 'approved',
                    tableNumber: tableNumber,
                    transactionNumber: transactionNumber,
                    dineInOrTakeout: dineInOrTakeout,
                    createdAt: new Date(),
                    orderNumber: newOrderNumber
                });
    
                const cartRef = doc(firestore, 'carts', cartId);
                transaction.update(cartRef, { items: [] });
                toast.success('Checkout successful!');

                const cashierName = localStorage.getItem('cashier');
                handlePrint(cartItems, transactionNumber, tableNumber, dineInOrTakeout, newOrderNumber, cashierName);
            });
    
        } catch (error) {
            toast.error('Checkout failed. Please try again. ' + error.message);
        } finally {
            toast.success('Checkout successful!');
            button.disabled = false;
        }
    };

    return (
        <div className="py-5 px-40">
            <h2 className='text-lg lg:text-3xl font-bold uppercase'>My Order</h2>
            {cartItems.length > 0 ? (
                cartItems.map((item, index) => (
                    <CartItem key={index} items={item} cartId={cartId} />
                ))
            ) : (
                <p className="text-center mt-5 text-lg">No items in cart</p>
            )}
            <div>
                <div className='flex justify-between mt-5'>
                    <h2 className='text-lg lg:text-3xl font-bold uppercase'>Total</h2>
                    <h2 className='text-lg lg:text-3xl font-bold uppercase'>₱{cartItems.reduce((total, item) => total + item.price * item.quantity, 0)}.00</h2>
                </div>
                <button onClick={(e) => handleCheckout(e)} className='bg-foreground border border-foreground hover:bg-foreground/20 hover:text-foreground text-white px-5 py-2 rounded-lg w-full mt-5'>Checkout</button>
            </div>
        </div>
    )
}

export default Page;