"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Mail,
  Shield,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";

type UserProfile = {
  displayName: string;
  email: string;
  role: string;
  photoBase64: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 256;
const JPEG_QUALITY = 0.78;

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    role: "student",
    photoBase64: "",
  });

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewURL, setPreviewURL] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Keep a stable reference so TypeScript knows
    // the user is definitely available inside
    // the async function below.
    const currentUser = user;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const userRef = doc(db, "users", currentUser.uid);

        const userSnap = await getDoc(userRef);

        const firestoreData = userSnap.exists() ? userSnap.data() : {};

        const displayName =
          currentUser.displayName ||
          (typeof firestoreData.displayName === "string"
            ? firestoreData.displayName
            : "") ||
          (typeof firestoreData.name === "string" ? firestoreData.name : "");

        const role =
          typeof firestoreData.role === "string"
            ? firestoreData.role
            : "student";

        const photoBase64 =
          typeof firestoreData.photoBase64 === "string"
            ? firestoreData.photoBase64
            : "";

        setProfile({
          displayName,
          email: currentUser.email || "",
          role,
          photoBase64,
        });

        setName(displayName);
        setPreviewURL(photoBase64);
      } catch (err) {
        console.error("Profile loading error:", err);

        setError("Unable to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [authLoading, user, router]);

  function getInitials(displayName: string) {
    return (
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "ST"
    );
  }

  function openFilePicker() {
    if (uploadingPhoto || removingPhoto) return;

    fileInputRef.current?.click();
  }

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectURL = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectURL);

        let width = image.width;
        let height = image.height;

        const scale = Math.min(
          MAX_IMAGE_SIZE / width,
          MAX_IMAGE_SIZE / height,
          1,
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to process image."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

        resolve(base64);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectURL);
        reject(new Error("Unable to read the selected image."));
      };

      image.src = objectURL;
    });
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file || !user) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Profile pictures must be 5 MB or smaller.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setUploadProgress(10);

      // Resize and compress the image in the browser.
      setUploadProgress(30);

      const base64 = await compressImage(file);

      setUploadProgress(60);

      // Make sure the final Base64 data is reasonably small.
      const estimatedSize = (base64.length * 3) / 4;

      if (estimatedSize > 900 * 1024) {
        setError(
          "The processed profile picture is still too large. Please choose a smaller image.",
        );
        return;
      }

      setPreviewURL(base64);

      setUploadProgress(75);

      // Save the compressed image directly in Firestore.
      await setDoc(
        doc(db, "users", user.uid),
        {
          photoBase64: base64,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      setUploadProgress(90);

      setProfile((current) => ({
        ...current,
        photoBase64: base64,
      }));

      /*
       * Firebase Auth does not need to store the Base64 image.
       * The profile image is maintained in Firestore.
       */

      setUploadProgress(100);

      setSuccess("Your profile picture has been updated.");
    } catch (err) {
      console.error("Profile picture upload error:", err);

      setPreviewURL(profile.photoBase64 || "");

      setError("Unable to save your profile picture. Please try again.");
    } finally {
      setTimeout(() => {
        setUploadingPhoto(false);
        setUploadProgress(0);
      }, 400);
    }
  }

  async function handleRemovePhoto() {
    if (!user || !profile.photoBase64) return;

    const confirmed = window.confirm("Remove your profile picture?");

    if (!confirmed) return;

    try {
      setRemovingPhoto(true);
      setError("");
      setSuccess("");

      await setDoc(
        doc(db, "users", user.uid),
        {
          photoBase64: "",
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      setProfile((current) => ({
        ...current,
        photoBase64: "",
      }));

      setPreviewURL("");

      setSuccess("Your profile picture has been removed.");
    } catch (err) {
      console.error("Profile picture removal error:", err);

      setError("Unable to remove your profile picture. Please try again.");
    } finally {
      setRemovingPhoto(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Update Firebase Authentication display name.
      await updateProfile(user, {
        displayName: trimmedName,
      });

      // Update Firestore profile.
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: trimmedName,
          name: trimmedName,
          email: user.email || "",
          photoBase64: profile.photoBase64 || "",
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      setProfile((current) => ({
        ...current,
        displayName: trimmedName,
      }));

      setName(trimmedName);

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);

      setError("Unable to update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading profile...
        </div>
      </Shell>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile.displayName || "Student";

  const initials = getInitials(displayName);

  return (
    <Shell>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#1478bd] hover:text-[#0b4778]"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <h1 className="text-2xl font-bold text-[#062b4f]">My Profile</h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your account information and profile details.
        </p>
      </div>

      <section className="max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Profile header */}
        <div className="border-b border-slate-200 bg-[#f8fbfd] px-6 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#0b4778] text-2xl font-bold text-white ring-4 ring-white shadow-sm">
                {previewURL ? (
                  <img
                    src={previewURL}
                    alt={`${displayName}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}

                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 size={25} className="animate-spin text-white" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openFilePicker}
                disabled={uploadingPhoto || removingPhoto}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#168dcc] text-white shadow-sm transition hover:bg-[#0b4778] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Change profile picture"
              >
                <Camera size={15} />
              </button>
            </div>

            {/* Profile information */}
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#062b4f]">
                {displayName}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {profile.role === "admin" ? "Administrator" : "Cadet"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploadingPhoto || removingPhoto}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0b4778] transition hover:border-[#168dcc] hover:bg-[#f5faff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={14} />

                  {uploadingPhoto ? "Saving..." : "Change Photo"}
                </button>

                {profile.photoBase64 && (
                  <button
                    type="button"
                    onClick={() => void handleRemovePhoto()}
                    disabled={uploadingPhoto || removingPhoto}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingPhoto ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}

                    {removingPhoto ? "Removing..." : "Remove Photo"}
                  </button>
                )}
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                JPG, PNG, or WebP. Automatically resized and compressed.
              </p>
            </div>
          </div>

          {/* Upload progress */}
          {uploadingPhoto && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Saving profile picture...</span>

                <span className="font-semibold text-[#0b4778]">
                  {uploadProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#168dcc] transition-all duration-200"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="hidden"
        />

        {/* Profile form */}
        <div className="p-6">
          <div className="space-y-5">
            {/* Full name */}
            <div>
              <label
                htmlFor="displayName"
                className="text-xs font-semibold text-slate-600"
              >
                Full Name
              </label>

              <div className="relative mt-2">
                <User
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  id="displayName"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#168dcc] focus:ring-1 focus:ring-[#168dcc]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold text-slate-600"
              >
                Email Address
              </label>

              <div className="relative mt-2">
                <Mail
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-500 outline-none"
                />
              </div>

              <p className="mt-1.5 text-[11px] text-slate-400">
                Email changes require account re-authentication.
              </p>
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="text-xs font-semibold text-slate-600"
              >
                Account Role
              </label>

              <div className="relative mt-2">
                <Shield
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  id="role"
                  type="text"
                  value={profile.role === "admin" ? "Administrator" : "Cadet"}
                  disabled
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-500 outline-none"
                />
              </div>

              <p className="mt-1.5 text-[11px] text-slate-400">
                Your account role is managed by an administrator.
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
              <Check size={15} />
              {success}
            </div>
          )}

          {/* Save changes */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                saving ||
                uploadingPhoto ||
                removingPhoto ||
                !name.trim() ||
                name.trim() === profile.displayName
              }
              className="rounded-lg bg-[#0b4778] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#062b4f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <Sidebar />

      <div className="ml-[230px] min-h-screen">
        <Topbar />

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
