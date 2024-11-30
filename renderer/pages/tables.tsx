"use client"
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { fs } from '../utils/firebaseConfig';
import React, { useEffect } from 'react'

interface Table {
  tableNumber: number;
  status: string;
}

const Tables = () => {
  const router = useRouter();
  const [tableOccupied, setTableOccupied] = React.useState<Table[]>([])
  
  useEffect(() => {
    let unsubscribe = () => { };
    const retrieveTableOccupied = async () => {
      const tablesCollection = collection(fs, "tables");
      const q = query(tablesCollection, where("status", "==", "occupied"));
      onSnapshot(q, (querySnapshot) => {
        const tables = querySnapshot.docs.map(doc => doc.data());
        setTableOccupied(tables as Table[]);
      });
    }

    retrieveTableOccupied()

    return () => unsubscribe()
  }, [])

  const changeStatus = (tableNumber: number, status: string) => {
    const tableRef = doc(fs, 'tables', `table_${tableNumber}`);
    setDoc(tableRef, {
      tableNumber: tableNumber,
      status: status
    });
  }
  
  return (
    <div className="py-10 mx-auto container px-40">
      <div className='text-center'>
        <h1 className="font-bold text-4xl text-black/70">Table Management</h1>
        <p className="text-black/50">Click on the table to change status</p>
        <div className='grid grid-cols-5 gap-5 mt-16 text-2xl font-bold'>
          {Array.from({ length: 25 }, (_, i) => (
            tableOccupied.some((table: Table) => table.tableNumber === i + 1) ? (
              <p key={i} onClick={()=> changeStatus(i+1, "unoccupied")} className='p-2 rounded-xl bg-foreground text-white h-40 content-center cursor-pointer'>Occupied</p>
            ) : (
              <button key={i} onClick={()=> changeStatus(i+1, "occupied")} className="p-2 h-40 content-center rounded-xl bg-foreground/10 text-foreground hover:bg-foreground hover:text-white">
              {i + 1}
            </button>
            )
          ))}
        </div>
      </div>
    </div>
  )
}

export default Tables