"use client";

import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  BoldIcon,
  DownloadIcon,
  FileTextIcon,
  ImageIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  StrikethroughIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { attachments } from "@/lib/types";

const MAX_SIZE = 4 * 1024 * 1024; // core's and the bucket's limit

// Re-encoding drops the photo's EXIF (GPS location included) and keeps phone photos well under
// the limit. White first: JPEG has no transparency.
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return new File([blob!], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

async function upload(file: File) {
  if (file.size > MAX_SIZE) throw new Error("El archivo pesa más de 4 MB.");
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/attachments", { method: "POST", body });
  if (res.status === 413) throw new Error("El archivo pesa más de 4 MB.");
  if (res.status === 415) throw new Error("Solo se pueden adjuntar imágenes o PDF.");
  if (!res.ok) throw new Error("No se pudo subir el archivo. Intenta de nuevo.");
  const { name } = (await res.json()) as { name: string };
  return `/attachments/${name}`;
}

// Notes with formatting, images and PDFs, kept as Markdown so plain-text notes, search and the CSV
// export keep working. Files live behind /attachments, only readable by their owner.
export default function NotesEditor({
  defaultValue,
  onChange,
}: {
  defaultValue: string;
  onChange: (markdown: string) => void;
}) {
  const [markdown, setMarkdown] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        underline: false, // Markdown has no underline
        link: { openOnClick: false },
      }),
      // Only our own files: a pasted <img> from another site would load (and track) from there.
      Image.extend({ parseHTML: () => [{ tag: 'img[src^="/attachments/"]' }] }),
      Markdown,
      Placeholder.configure({ placeholder: "Opcional" }),
    ],
    content: defaultValue,
    contentType: "markdown",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Notas",
        class: "min-h-16 px-2.5 py-2 outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown();
      setMarkdown(md);
      onChange(md);
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      strike: editor?.isActive("strike"),
      bulletList: editor?.isActive("bulletList"),
      orderedList: editor?.isActive("orderedList"),
    }),
  });

  const attach = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const image = file.type.startsWith("image/");
      if (image)
        file = await shrink(file).catch(() => Promise.reject(Error("No se pudo leer la imagen.")));
      const src = await upload(file);
      // Followed by a paragraph or a space so the cursor ends up past the file: left on it, the
      // next attachment would replace it.
      editor
        .chain()
        .focus()
        .insertContent(
          image
            ? [{ type: "image", attrs: { src, alt: file.name } }, { type: "paragraph" }]
            : [
                { type: "text", text: file.name, marks: [{ type: "link", attrs: { href: src } }] },
                { type: "text", text: " " },
              ],
        )
        .run();
    } catch (e) {
      toast.add({ title: (e as Error).message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const tool = (
    label: string,
    Icon: typeof BoldIcon,
    pressed: boolean | undefined,
    run: () => void,
  ) => (
    <Button
      type="button"
      variant={pressed ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={run}
    >
      <Icon />
    </Button>
  );
  const files = attachments(markdown);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-input bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-accent dark:bg-input/30">
        <div className="flex items-center gap-0.5 border-b border-input p-1">
          {tool("Negritas", BoldIcon, active?.bold, () =>
            editor?.chain().focus().toggleBold().run(),
          )}
          {tool("Cursivas", ItalicIcon, active?.italic, () =>
            editor?.chain().focus().toggleItalic().run(),
          )}
          {tool("Tachado", StrikethroughIcon, active?.strike, () =>
            editor?.chain().focus().toggleStrike().run(),
          )}
          {tool("Lista", ListIcon, active?.bulletList, () =>
            editor?.chain().focus().toggleBulletList().run(),
          )}
          {tool("Lista numerada", ListOrderedIcon, active?.orderedList, () =>
            editor?.chain().focus().toggleOrderedList().run(),
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            disabled={uploading || !editor}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? <LoaderCircleIcon className="animate-spin" /> : <PaperclipIcon />}
            Adjuntar
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) attach(file);
            }}
          />
        </div>
        <EditorContent
          editor={editor}
          className="text-base md:text-sm [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_img]:my-1 [&_img]:max-h-48 [&_img]:rounded-md [&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-ring [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((f) => {
            const Icon = f.image ? ImageIcon : FileTextIcon;
            return (
              <li
                key={f.src}
                className="flex h-7 max-w-full items-center rounded-md bg-secondary text-xs text-sidebar-foreground"
              >
                <a
                  href={f.src}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-1.5 pl-2"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{f.label}</span>
                </a>
                <a
                  href={`${f.src}?download=${encodeURIComponent(f.label)}`}
                  download
                  aria-label={`Descargar ${f.label}`}
                  title="Descargar"
                  className="flex h-full items-center px-2 text-muted-foreground hover:text-foreground"
                >
                  <DownloadIcon className="size-3.5" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
