"use client"
import { fs } from '../../utils/firebaseConfig';
import { Item } from '../../types/Types';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react';
import Popular from '../../components/Popular';

const Page = () => {
    const router = useRouter();
    const category = router.query.category as string;

    const [popularItems, setPopularItems] = useState<Array<Item>>([])


    useEffect(() => {
        const normalizeCategory = (category: string) => {
            return category.replace(/-/g, ' ');
        };
        const fetchData = async () => {
            const normalizedCategory = normalizeCategory(category);
            console.log(normalizedCategory);
            const menuCollection = collection(fs, "menu");
            const querySnapshot = await getDocs(query(menuCollection, where("category", "==", normalizedCategory), orderBy("sold", "desc")));
            const topSoldItems = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    sold: data.sold,
                    stock: data.stock,
                    name: data.name,
                    description: data.description,
                    imageURL: data.imageURL,
                    price: data.price
                } as Item;
            });
            setPopularItems(topSoldItems);
        }

        fetchData()
    }, [category])
    return (
        <div className="py-5 mx-auto container px-20">
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-5 mt-5 px-6 lg:px-0'>
                {popularItems.map((item, index) => (
                    <Popular key={index} item={item} />
                ))}
            </div>
        </div>
    );
};

export default Page;
