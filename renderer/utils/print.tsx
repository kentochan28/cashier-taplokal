import { ItemCart } from "../types/Types";
import { IpcHandler } from '../../main/preload';

declare global {
    interface Window {
      ipc: IpcHandler
    }
  }

const handlePrint = async (items: ItemCart[], transactionNumber: string, tableNumber: number, dineInOrTakeout: string, newOrderNumber: any, cashierName: string) => {
    window.ipc.send('print-receipt', {items, transactionNumber, tableNumber, dineInOrTakeout, newOrderNumber, cashierName});
};

export default handlePrint;