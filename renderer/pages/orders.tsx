"use client"
import React, { useEffect, useState } from 'react';
import OrderItem from '../components/OrderItem';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { fs } from '../utils/firebaseConfig';
import { CartDetails } from '../types/Types';
import { useRouter } from 'next/navigation';

const Page = () => {
    const router = useRouter(); 
    const [cartDetails, setCartDetails] = useState<Array<CartDetails>>([]);

    useEffect(() => {
        let unsubscribe = () => {};
        const cartsCollectionRef = collection(fs, 'checkouts');
        const q = query(cartsCollectionRef, where("status", "in", ["pending", "approved"]), orderBy("orderNumber", "desc"));

        unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const pendingCheckouts = querySnapshot.docs.map(cartDoc => {
                    const details = cartDoc.data();
                    return {
                        branch: details.branch,
                        cartId: cartDoc.id,
                        createdAt: details.createdAt,
                        customerId: details.customerId,
                        dineInOrTakeout: details.dineInOrTakeout,
                        items: details.items,
                        orderNumber: details.orderNumber,
                        status: details.status,
                        tableNumber: details.tableNumber
                    };
                });

                setCartDetails(pendingCheckouts);
            } else {
                setCartDetails([]);
            }
        }, (error) => {
            console.error("Error fetching cart items: ", error);
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="py-5 px-40 grid grid-cols-2 gap-3">
            {cartDetails.length != 0 ? (
                cartDetails.map((cart, index) => (
                    <OrderItem key={index} cart={cart} />
                ))
            ):
                <p className='text-3xl font-bold w-full items-center col-span-2'>No pending orders</p>
            }
        </div>
    );
};

export default Page;
