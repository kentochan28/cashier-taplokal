"use client"
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import removeTemporaryId from "../utils/removeCart";
import Modal from "../components/Modal";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, fs } from "../utils/firebaseConfig";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import UserDropdown from "./UserDropDown";
import icon from "../public/images/icon.png";


const Nav = () => {
    const [time, setTime] = useState("");
    const pathName = usePathname();
    const router = useRouter();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [user, setUser] = useState<User | null>(null)
    const [cartItemCount, setCartItemCount] = useState(0);
    const [orderCount, setOrderCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const toggleDropdown = () => {
        if (user) {
            setDropdownVisible(!isDropdownVisible);
        } else {
            router.push("/login");
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                localStorage.setItem("cashier", currentUser.displayName);
            } else {
                localStorage.removeItem("cashier");
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && !isLoading) {
            const userDocRef = doc(fs, 'users', user.uid);

            const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    if (userData.role !== 'cashier') {
                        auth.signOut().then(() => {
                            router.push("/login");
                        });
                    }
                } else {
                    auth.signOut().then(() => {
                        router.push("/login");
                    });
                }
            });

            return () => unsubscribe();
        } else if (!isLoading) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        let unsubscribe = () => { };

        if (user != null) {
            const cartsCollectionRef = collection(fs, 'carts');
            const q = query(cartsCollectionRef, where("customerId", "==", user.uid), where("status", "==", "cart"));

            unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const cartDoc = querySnapshot.docs[0];
                    const items = cartDoc.data().items || [];

                    const totalQuantity: number = items.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0);
                    setCartItemCount(totalQuantity);
                } else {
                    setCartItemCount(0);
                }
            }, (error) => {
                console.error("Error fetching cart item count: ", error);
            });
        } else if (!isLoading) {
            setCartItemCount(0);
            router.push("/login");
        }

        return () => unsubscribe();
    }, [user, isLoading, router]);

    useEffect(() => {
        let unsubscribe = () => { }

        if (user != null) {
            const checkoutsCollectionRef = collection(fs, 'checkouts');
            const q = query(checkoutsCollectionRef, where("status", "==", "pending"));

            unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!querySnapshot.empty) {
                    const items = querySnapshot.docs.length;
                    setOrderCount(items);
                } else {
                    setOrderCount(0);
                }
            });
        }
        return () => unsubscribe();
    }, [user, isLoading]);

    useEffect(() => {
        setTime(new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());

        const intervalId = setInterval(() => {
            setTime(new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);


    const handleBack = () => {
        if (pathName != "/home/") {
            router.back();
        }
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleConfirm = () => {
        if (user != null) {
            removeTemporaryId(user.uid).then(() => {
                router.push("/home");
                setIsModalOpen(false);
            });
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    return (
        <nav className="mx-auto container px-20">
            <ul className="flex w-full justify-between items-center py-4 px-2 text-3xl text-foreground ">
                <Link href={"?"} onClick={handleBack}>{pathName == "/home/" ? time : <div className="flex gap-2 items-center text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    <p>Back</p>
                </div>}</Link>
                <div className="cursor-pointer font-bold hover:drop-shadow-lg" onClick={() => setIsModalOpen(pathName != "/home/")}>
                    <Image src={icon} width={75} height={75} alt={"logo"} />
                </div>
                <div className="flex gap-4 relative">
                    <div onClick={toggleDropdown} className={`${isDropdownVisible && "bg-foreground text-white"} cursor-pointer hover:bg-foreground rounded-lg hover:text-white p-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {isDropdownVisible && user && (
                            <UserDropdown onClose={toggleDropdown} />
                        )}
                    </div>
                    <Link href={"/orders"} className={`${pathName == "/orders" && "bg-foreground text-white"} relative hover:bg-foreground rounded-lg hover:text-white p-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        <p className="absolute top-0 right-0 bg-red-400 rounded-full text-background text-xs px-1">{orderCount}</p>
                    </Link>
                    <Link href={"/cart"} className={`${pathName == "/cart" && "bg-foreground text-white"} relative hover:bg-foreground rounded-lg hover:text-white p-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                        <p className="absolute top-0 right-0 bg-red-400 rounded-full text-background text-xs px-1">{cartItemCount}</p>
                    </Link>
                    <Link href={"/tables"} className={`${pathName == "/tables" && "bg-foreground text-white"} relative hover:bg-foreground rounded-lg hover:text-white p-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-10" fill={"none"}>
                            <path d="M21 4L20.496 4.96113C19.8115 6.2666 18.8831 7 17.9151 7H7.0849C6.11686 7 5.18847 6.2666 4.50396 4.96113L4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 4H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 20H5.86863C6.16649 20 6.31542 20 6.4578 19.9794C6.78821 19.9316 7.10141 19.8019 7.36884 19.602C7.48407 19.5159 7.58938 19.4106 7.8 19.2C8.11593 18.8841 8.2739 18.7261 8.44674 18.5969C8.84788 18.2971 9.31768 18.1025 9.81331 18.0309C10.0269 18 10.2503 18 10.6971 18H13.3029C13.7497 18 13.9731 18 14.1867 18.0309C14.6823 18.1025 15.1521 18.2971 15.5533 18.5969C15.7261 18.7261 15.8841 18.8841 16.2 19.2C16.4106 19.4106 16.5159 19.5159 16.6312 19.602C16.8986 19.8019 17.2118 19.9316 17.5422 19.9794C17.6846 20 17.8335 20 18.1314 20H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 18L10.2058 16.9709C10.333 16.3348 10.3967 16.0167 10.5999 15.8059C10.6541 15.7497 10.7147 15.7001 10.7804 15.658C11.027 15.5 11.3513 15.5 12 15.5C12.6487 15.5 12.973 15.5 13.2196 15.658C13.2853 15.7001 13.3459 15.7497 13.4001 15.8059C13.6033 16.0167 13.667 16.3348 13.7942 16.9709L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 7L10.2058 8.02913C10.333 8.66523 10.3967 8.98327 10.5999 9.19409C10.6541 9.25028 10.7147 9.29993 10.7804 9.34203C11.027 9.5 11.3513 9.5 12 9.5C12.6487 9.5 12.973 9.5 13.2196 9.34203C13.2853 9.29993 13.3459 9.25028 13.4001 9.19409C13.6033 8.98327 13.667 8.66523 13.7942 8.02913L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 15.5L12 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                    </Link>
                </div>
            </ul>
            <Modal isOpen={isModalOpen} onConfirm={handleConfirm} onCancel={handleCancel} />
        </nav>
    )
}

export default Nav