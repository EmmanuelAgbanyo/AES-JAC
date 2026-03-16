import { ref, onValue, set, remove, update, type Unsubscribe } from "firebase/database";
import { db } from './firebaseService';
import type { Entrepreneur, Transaction, User, InventoryItem } from '../types';

const ENTREPRENEURS_KEY = 'entrepreneurs';
const TRANSACTIONS_KEY = 'transactions';
const USERS_KEY = 'users';
const CLIENTS_KEY = 'clients';
const INVENTORY_KEY = 'inventory';
const INVENTORY_LOGS_KEY = 'inventory_logs';
const SUPPLIERS_KEY = 'suppliers';

const entrepreneursRef = ref(db, ENTREPRENEURS_KEY);
const transactionsRef = ref(db, TRANSACTIONS_KEY);
const usersRef = ref(db, USERS_KEY);
export const clientsRef = ref(db, CLIENTS_KEY);
export const inventoryRef = ref(db, INVENTORY_KEY);
export const inventoryLogsRef = ref(db, INVENTORY_LOGS_KEY);
export const suppliersRef = ref(db, SUPPLIERS_KEY);

// --- LISTENERS ---
// These functions listen for changes and convert the Firebase object to an array for the app state
const createListener = <T>(dbRef: any, callback: (data: T[]) => void): Unsubscribe => {
    return onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        // Firebase returns null for empty paths, and an object of items if they exist
        // This also handles legacy data that might have been stored as an array.
        if (data) {
            callback(Array.isArray(data) ? data.filter(Boolean) : Object.values(data));
        } else {
            callback([]);
        }
    });
};

export const listenToEntrepreneurs = (callback: (data: Entrepreneur[]) => void): Unsubscribe => createListener<Entrepreneur>(entrepreneursRef, callback);
export const listenToTransactions = (callback: (data: Transaction[]) => void): Unsubscribe => createListener<Transaction>(transactionsRef, callback);
export const listenToUsers = (callback: (data: User[]) => void): Unsubscribe => createListener<User>(usersRef, callback);
export const listenToClients = (callback: (data: any[]) => void): Unsubscribe => createListener<any>(clientsRef, callback);
export const listenToInventory = (callback: (data: any[]) => void): Unsubscribe => createListener<any>(inventoryRef, callback);


// --- WRITERS (for individual items) ---
export const writeEntrepreneur = (entrepreneur: Entrepreneur): Promise<void> => {
    return set(ref(db, `${ENTREPRENEURS_KEY}/${entrepreneur.id}`), entrepreneur);
};

export const deleteEntrepreneur = (id: string): Promise<void> => {
    return remove(ref(db, `${ENTREPRENEURS_KEY}/${id}`));
};

export const writeTransaction = (transaction: Transaction): Promise<void> => {
    return set(ref(db, `${TRANSACTIONS_KEY}/${transaction.id}`), transaction);
};

export const deleteTransaction = (id: string): Promise<void> => {
    return remove(ref(db, `${TRANSACTIONS_KEY}/${id}`));
};

export const writeUser = (user: User): Promise<void> => {
    return set(ref(db, `${USERS_KEY}/${user.id}`), user);
};

export const deleteUser = (id: string): Promise<void> => {
    return remove(ref(db, `${USERS_KEY}/${id}`));
};

export const writeClient = (client: any): Promise<void> => {
    return set(ref(db, `${CLIENTS_KEY}/${client.id}`), client);
};

export const deleteClient = (id: string): Promise<void> => {
    return remove(ref(db, `${CLIENTS_KEY}/${id}`));
};

export const writeInventoryItem = (item: InventoryItem): Promise<void> => set(ref(db, `${INVENTORY_KEY}/${item.id}`), item);
export const deleteInventoryItem = (id: string): Promise<void> => remove(ref(db, `${INVENTORY_KEY}/${id}`));

export const listenToInventoryLogs = (callback: (logs: any[]) => void): Unsubscribe => {
    return onValue(inventoryLogsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const logsArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            callback(logsArray);
        } else {
            callback([]);
        }
    });
};

export const writeInventoryLog = (log: any): Promise<void> => set(ref(db, `${INVENTORY_LOGS_KEY}/${log.id}`), log);

export const listenToSuppliers = (callback: (suppliers: any[]) => void): Unsubscribe => {
    return onValue(suppliersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const suppliersArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            callback(suppliersArray);
        } else {
            callback([]);
        }
    });
};

export const writeSupplier = (supplier: any): Promise<void> => set(ref(db, `${SUPPLIERS_KEY}/${supplier.id}`), supplier);
export const deleteSupplier = (id: string): Promise<void> => remove(ref(db, `${SUPPLIERS_KEY}/${id}`));


// --- OVERWRITE (for seeding and import) ---
const arrayToObject = <T extends { id: string }>(arr: T[]): { [id: string]: T } => {
    return arr.reduce((acc, item) => {
        if (item && item.id) { // Ensure item has an ID
            acc[item.id] = item;
        }
        return acc;
    }, {} as { [id: string]: T });
};

export const overwriteEntrepreneurs = (entrepreneurs: Entrepreneur[]): Promise<void> => set(entrepreneursRef, arrayToObject(entrepreneurs));
export const overwriteTransactions = (transactions: Transaction[]): Promise<void> => set(transactionsRef, arrayToObject(transactions));
export const overwriteUsers = (users: User[]): Promise<void> => set(usersRef, arrayToObject(users));

// --- ATOMIC UPDATES ---
export const performAtomicUpdate = (updates: Record<string, any>): Promise<void> => {
    return update(ref(db), updates);
};