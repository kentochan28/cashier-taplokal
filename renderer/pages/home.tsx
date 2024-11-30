import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [isDineIn, setIsDineIn] = useState(false);

  const handleMethod = (method: string) => {
    localStorage.setItem("method", method);
    router.push("/table");
  };

  // Function to toggle between Dine In and Take Out
  const toggleMethod = (method: string) => {
    setIsDineIn(method === "dine in");
    handleMethod(method);
  };

  return (
    <React.Fragment>
      <div className="py-10 mx-auto container px-40">
        <div className="text-center">
          <h1 className="font-bold text-4xl text-black/70">
            Where will you be <br /> eating today?
          </h1>
          <div className="grid grid-cols-2 gap-10 mt-16">
            <div
              onClick={() => toggleMethod("dine in")}
              className="flex-col cursor-pointer flex rounded-2xl gap-10 items-center py-36 bg-foreground text-white hover:bg-foreground/20 hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-16"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                />
              </svg>
              <p className="text-2xl font-semibold">Dine in</p>
            </div>
            <div
              onClick={() => toggleMethod("takeout")}
              className="flex-col cursor-pointer flex rounded-2xl gap-10 items-center py-40 bg-foreground/20 text-foreground hover:bg-foreground hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-16"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
              <p className="text-2xl font-semibold">Take out</p>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
