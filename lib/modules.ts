import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "./firebase";
import { Module } from "./types";

export async function getModules(): Promise<Module[]> {
  const modulesRef = collection(db, "modules");

  const modulesQuery = query(
    modulesRef,
    where("published", "==", true),
    orderBy("order", "asc"),
  );

  const snapshot = await getDocs(modulesQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Module[];
}
