import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

async function ensureUserProfile(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
}) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Student",
      email: user.email || "",
      role: "student",
      createdAt: new Date(),
    });
    return;
  }

  await setDoc(
    userRef,
    {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Student",
      email: user.email || "",
    },
    { merge: true },
  );
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await updateProfile(userCredential.user, {
    displayName: name,
  });

  await ensureUserProfile({
    uid: userCredential.user.uid,
    displayName: name,
    email: userCredential.user.email,
  });

  return userCredential.user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await ensureUserProfile(userCredential.user);

  return userCredential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  const userCredential = await signInWithPopup(auth, provider);
  await ensureUserProfile(userCredential.user);

  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}
