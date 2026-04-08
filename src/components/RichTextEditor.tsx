import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, Undo, Redo, Palette, Highlighter, Minus } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MenuButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    {children}
  </button>
);

const COLORS = ["#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const FONT_SIZES = [
  { label: "Klein", value: "0.875em" },
  { label: "Normal", value: "1em" },
  { label: "Groß", value: "1.25em" },
  { label: "Sehr groß", value: "1.5em" },
  { label: "Riesig", value: "2em" },
];

const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-foreground",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-border rounded-md bg-muted overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/80">
        {/* Font size */}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run();
            }
          }}
          className="h-7 px-1.5 text-xs bg-background border border-border rounded text-foreground focus:outline-none"
        >
          <option value="">Größe</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-border mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett">
          <Bold size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv">
          <Italic size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen">
          <UnderlineIcon size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Durchgestrichen">
          <Strikethrough size={14} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1">
          <Heading1 size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2">
          <Heading2 size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Überschrift 3">
          <Heading3 size={14} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung">
          <List size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierung">
          <ListOrdered size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Trennlinie">
          <Minus size={14} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        <MenuButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Links">
          <AlignLeft size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Zentriert">
          <AlignCenter size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechts">
          <AlignRight size={14} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Color picker */}
        <div className="relative group">
          <MenuButton onClick={() => {}} title="Textfarbe">
            <Palette size={14} />
          </MenuButton>
          <div className="absolute top-full left-0 mt-1 p-1.5 bg-background border border-border rounded-md shadow-lg hidden group-hover:flex gap-1 z-50">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => editor.chain().focus().setColor(c).run()}
                className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Highlight */}
        <div className="relative group">
          <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Markieren">
            <Highlighter size={14} />
          </MenuButton>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Rückgängig">
          <Undo size={14} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Wiederholen">
          <Redo size={14} />
        </MenuButton>
      </div>

      {/* Editor */}
      <div className="resize-y overflow-auto min-h-[150px] max-h-[600px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
