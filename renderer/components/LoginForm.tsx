"use client"
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React from 'react'
import toast from 'react-hot-toast';
import { auth, fs } from '../utils/firebaseConfig';
import { useRouter } from 'next/navigation';

const LoginForm = () => {
    const router = useRouter();
    localStorage.removeItem("branch");
    console.log(localStorage.getItem("branch"));
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        const email = (event.currentTarget as HTMLFormElement).email.value;
        const password = (event.currentTarget as HTMLFormElement).password.value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDoc = await getDoc(doc(fs, "users", user.uid));
            if (userDoc.exists()) {
                if (userDoc.data().role === "cashier") {
                    localStorage.setItem("branch", userDoc.data().branch);
                    toast.success("Logged in successfully!")
                    router.push("/home");
                }else {
                    toast.error("You are not authorized to login as cashier");
                }
            } else {
                toast.error("You are not authorized to login as cashier");
            }
        } catch (error) {
            if ((error as { code: string }).code === "auth/invalid-credential") {
                toast.error("Invalid email or password");
            } else {
                toast.error("An error occurred. Please try again later");
            }
        }
    };
    return (
        <form onSubmit={handleLogin} className="w-full max-w-md mx-auto p-8 shadow-md rounded-lg text-black bg-background">
            <h2 className="text-2xl font-semibold mb-6 text-center uppercase">Cashier</h2>
            
            <div className="mb-4">
                <label htmlFor="email" className="block text-base font-medium">Email</label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                />
            </div>

            <div className="mb-6">
                <label htmlFor="password" className="block text-base font-medium">Password</label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    required
                    className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                />
            </div>

            <button
                type="submit"
                className="w-full bg-foreground text-background py-2 px-4 rounded-md hover:bg-foreground/70">
                Login
            </button>
        </form>
    );
}

export default LoginForm