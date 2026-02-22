"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteBrandButtonProps {
  brandSpaceId: string;
  brandName: string;
}

export function DeleteBrandButton({ brandSpaceId, brandName }: DeleteBrandButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      router.push("/brand-spaces");
      router.refresh();
    } catch (error) {
      console.error("Error deleting brand:", error);
      alert("Failed to delete brand space. Please try again.");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
      >
        Delete brand
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !deleting && setShowConfirm(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-white/10 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">
              Delete &quot;{brandName}&quot;?
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              This will permanently delete this brand space, its brandbook, and all
              associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !deleting && setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
