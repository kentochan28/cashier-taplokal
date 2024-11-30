"use client";
import { User } from 'firebase/auth';
import { auth, fs, storage } from '../utils/firebaseConfig';
import { toast } from 'react-hot-toast';
import blankProfile from '../public/images/blankProfile.jpg';
import Image, { StaticImageData } from 'next/image';
import { getDownloadURL, uploadBytes, ref } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { collection, doc, updateDoc } from 'firebase/firestore';

interface UserDropdownProps {
    onClose: () => void;
    onUploadComplete?: (downloadURL: string) => void;
}

const UserDropdown = ({ onClose, onUploadComplete }: UserDropdownProps) => {
    const [profile, setProfile] = useState<string | StaticImageData>(blankProfile);
    const [email, setEmail] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user != null) {
            setProfile(user.photoURL || blankProfile);
            setEmail(user.email);
            setName(user.displayName);
            setUser(user);
        }
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem("branch");
        auth.signOut();
        toast.success("Logged out successfully");
        onClose();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const storageRef = ref(storage, `profileImages/${user!.uid}`);

            try {
                toast.loading("Uploading file");
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                await updateProfile(user!, { photoURL: downloadURL });
                const userRef = collection(fs, 'users');
                await updateDoc(doc(userRef, user!.uid), {
                    imageURL: downloadURL,
                    updatedAt: new Date()
                });

                toast.dismiss();
                toast.success("File uploaded");
                setProfile(downloadURL);
                if (onUploadComplete) {
                    onUploadComplete(downloadURL);
                    onClose();
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                toast.error("Error uploading file");
            }
        }
    };

    return (
        <div className="absolute right-0 top-16 w-64 lg:w-full bg-white text-foreground border rounded-lg shadow-lg z-20">
            <div className="p-4 w-full flex flex-col items-center rounded-xl">
                <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-black rounded-full h-32 w-32 relative overflow-hidden">
                        <Image
                            src={profile}
                            alt="photo"
                            layout="fill"
                            className=" object-cover"
                        />
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>
                <h3 className="font-bold text-sm text-center capitalize">{name || "User"}</h3>
                <p className="text-xs text-gray-500">{email}</p>
            </div>
            <button
                onClick={handleLogout}
                className="border-t p-2 flex w-full items-center gap-5 hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>

                <div
                    className="w-full text-sm text-left p-2"
                >
                    Logout
                </div>
            </button>
        </div>
    );
};

export default UserDropdown;
