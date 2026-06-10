import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { imagesApi } from "../../lib/api";

export type UploadedImage = {
  localId: string;
  file: File;
  previewUrl: string;
  caption: string;

  // set after Cloudinary upload
  url?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  uploaded?: boolean;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — matches backend CloudinaryOptions

type Props = {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  // publicIds that already belong to a saved listing (edit mode). Removing one of
  // these must NOT delete it from Cloudinary right away — the deletion is deferred
  // to the backend on save, so abandoning the edit keeps the live listing intact.
  keepPublicIds?: Set<string>;
};

function uid() { return Math.random().toString(36).slice(2, 9); }

async function uploadImageToCloudinary(file: File) {
  const { data: signed } = await imagesApi.signUpload();
  const result = await imagesApi.uploadToCloudinary(file, signed);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export default function ImageUploadStep({ images, onChange, keepPublicIds }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep a ref that always holds the latest images array so async upload
  // callbacks can read and update it without stale closure problems.
  const imagesRef = useRef<UploadedImage[]>(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Add files → create previews → upload each sequentially to avoid stale state
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_FILE_SIZE_BYTES
    );
    if (!validFiles.length) return;

    // Create local preview entries immediately
    const newImages: UploadedImage[] = validFiles.map((file) => ({
      localId:    uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      caption:    "",
      uploaded:   false,
    }));

    // Add all to the list first so they appear in the grid right away
    const withNew = [...imagesRef.current, ...newImages];
    imagesRef.current = withNew;
    onChange(withNew);

    // Upload one at a time, updating the shared ref after each
    for (const img of newImages) {
      setUploading((prev) => new Set(prev).add(img.localId));
      try {
        const result = await uploadImageToCloudinary(img.file);
        const updated = imagesRef.current.map((i) =>
          i.localId === img.localId
            ? {
                ...i,
                url: result.url,
                publicId: result.publicId,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
                uploaded: true,
              }
            : i
        );
        imagesRef.current = updated;
        onChange(updated);
      } catch {
        const updated = imagesRef.current.map((i) =>
          i.localId === img.localId ? { ...i, uploaded: false } : i
        );
        imagesRef.current = updated;
        onChange(updated);
      } finally {
        setUploading((prev) => {
          const next = new Set(prev);
          next.delete(img.localId);
          return next;
        });
      }
    }
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  function removeImage(localId: string) {
    const img = images.find((i) => i.localId === localId);
    if (img) {
      // Only revoke object URLs we created locally (blob:); listing photos use a
      // real Cloudinary https URL as their preview and must not be revoked.
      if (img.previewUrl.startsWith("blob:")) URL.revokeObjectURL(img.previewUrl);
      // Delete from Cloudinary now ONLY if this is a fresh upload from this session.
      // Photos that already belong to the saved listing (keepPublicIds) are left
      // alone — the backend removes them on save, so abandoning the edit is safe.
      const isExisting = img.publicId != null && keepPublicIds?.has(img.publicId);
      if (img.uploaded && img.publicId && !isExisting) {
        imagesApi.cleanup([img.publicId]).catch(() => {});
      }
    }
    onChange(images.filter((i) => i.localId !== localId));
  }

  function updateCaption(localId: string, caption: string) {
    onChange(images.map((i) => i.localId === localId ? { ...i, caption } : i));
  }

  function moveImage(localId: string, dir: -1 | 1) {
    const idx = images.findIndex((i) => i.localId === localId);
    if (idx < 0) return;
    const next = [...images];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-all duration-200"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border)",
          background:  dragging ? "var(--accent-light)" : "var(--surface2)",
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {isAr ? "اسحب الصور هنا أو اضغط للتصفح" : "Drop photos here or click to browse"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            JPG, PNG, WEBP · {isAr ? "حجم أقصى 5 ميجا · 20 صورة كحد أقصى" : "Max 5MB each · Up to 20 photos"}
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl px-5 py-2 text-sm font-semibold transition"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          {isAr ? "اختر صوراً" : "Choose Photos"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Photo count hint */}
      {images.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          {images.length} {isAr ? "صورة مضافة" : `photo${images.length !== 1 ? "s" : ""} added`}
          {images.length > 0 && (isAr ? " · الصورة الأولى هي صورة الغلاف" : " · First photo is the cover")}
          {images.filter((i) => !i.uploaded).length > 0 && uploading.size === 0 && (
            <span style={{ color: "var(--danger)" }}>{isAr ? " · فشل رفع بعض الصور" : " · Some photos failed to upload"}</span>
          )}
        </p>
      )}

      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.localId}
              className="relative rounded-xl overflow-hidden group"
              style={{
                border: idx === 0 ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: "var(--surface2)",
                aspectRatio: "4/3",
              }}
            >
              {/* Image preview */}
              <img
                src={img.previewUrl}
                alt={img.caption || `Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Cover badge */}
              {idx === 0 && (
                <div
                  className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  Cover
                </div>
              )}

              {/* Upload spinner */}
              {uploading.has(img.localId) && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.5)" }}>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* Upload failed */}
              {!uploading.has(img.localId) && !img.uploaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <span className="text-lg">⚠️</span>
                  <span className="text-[10px] font-semibold" style={{ color:"white" }}>
                    {document.documentElement.lang === "ar" ? "فشل الرفع" : "Upload failed"}
                  </span>
                </div>
              )}

              {/* Hover controls */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                style={{ background: "rgba(0,0,0,0.5)" }}>
                {/* Top: remove */}
                <div className="flex justify-end">
                  <button
                    onClick={() => removeImage(img.localId)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition"
                    style={{ background: "var(--danger)", color: "white" }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Bottom: reorder arrows */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => moveImage(img.localId, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                  >
                    ‹
                  </button>
                  <span className="text-[10px] text-white/80 font-medium">{idx + 1}/{images.length}</span>
                  <button
                    onClick={() => moveImage(img.localId, 1)}
                    disabled={idx === images.length - 1}
                    className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caption inputs — only shown if images exist */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Photo captions (optional)
          </p>
          {images.map((img, idx) => (
            <div key={img.localId} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                style={{ border: "1px solid var(--border)" }}>
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <input
                type="text"
                value={img.caption}
                onChange={(e) => updateCaption(img.localId, e.target.value)}
                placeholder={idx === 0 ? "Cover photo caption…" : `Photo ${idx + 1} caption…`}
                maxLength={255}
                className="flex-1 rounded-xl text-sm outline-none transition px-3 py-2"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface2)",
                  color: "var(--text)",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}