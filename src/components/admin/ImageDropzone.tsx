"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { compressImageFile, ImageTooLargeError } from "@/lib/image-compression";

export interface ExistingImage {
  id: string;
  url: string;
}

export function ImageDropzone({
  existingImages,
  onRemoveExisting,
  newFiles,
  onNewFilesChange,
}: {
  existingImages: ExistingImage[];
  onRemoveExisting: (id: string) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
}) {
  const t = useTranslations("admin.form");
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setError(null);
      setIsCompressing(true);
      try {
        const compressed = await Promise.all(
          accepted.map(async (file) => {
            try {
              return await compressImageFile(file);
            } catch (err) {
              if (err instanceof ImageTooLargeError) {
                setError(t("imageTooLarge", { name: err.fileName }));
                return null;
              }
              throw err;
            }
          })
        );
        const successful = compressed.filter((f): f is File => f !== null);
        if (successful.length > 0) {
          onNewFilesChange([...newFiles, ...successful]);
        }
      } finally {
        setIsCompressing(false);
      }
    },
    [newFiles, onNewFilesChange, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    disabled: isCompressing,
  });

  const previews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function removeNewFile(index: number) {
    onNewFilesChange(newFiles.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-300",
          isDragActive
            ? "border-terracotta bg-terracotta/5"
            : "border-cream/20 hover:border-cream/40",
          isCompressing && "cursor-wait opacity-70"
        )}
      >
        <input {...getInputProps()} />
        {isCompressing ? (
          <Loader2 size={28} className="animate-spin text-cream-secondary/50" />
        ) : (
          <UploadCloud size={28} className="text-cream-secondary/50" />
        )}
        <p className="font-inter text-sm text-cream-secondary/70">
          {isCompressing ? t("compressingImages") : t("imagesHint")}
        </p>
      </div>

      {error && <p className="mt-3 font-inter text-sm text-terracotta-deep">{error}</p>}

      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-bg-secondary">
              <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => onRemoveExisting(img.id)}
                aria-label="Remove image"
                className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg-primary/80 text-cream opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={p.url} className="group relative aspect-square overflow-hidden rounded-2xl bg-bg-secondary">
              <Image src={p.url} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeNewFile(i)}
                aria-label="Remove image"
                className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg-primary/80 text-cream opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
