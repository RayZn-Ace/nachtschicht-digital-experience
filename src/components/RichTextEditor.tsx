import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Palette, Undo, Redo } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const COLORS = ["#ffffff", "#f8fafc", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const FONT_FAMILIES = ["inherit", "Arial", "Georgia", "Verdana", "Trebuchet MS", "Courier New"];

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

const ToolbarButton = ({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSize,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily.configure({ types: ["textStyle"] }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "min-h-[220px] w-full px-4 py-3 text-sm text-foreground focus:outline-none",
      },
    },
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "<p></p>");
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/70 p-2">
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          defaultValue="inherit"
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>{font === "inherit" ? "Schriftart" : font}</option>
          ))}
        </select>

        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            editor.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run();
          }}
        >
          <option value="">Größe</option>
          <option value="14px">Klein</option>
          <option value="16px">Normal</option>
          <option value="18px">Mittel</option>
          <option value="22px">Groß</option>
          <option value="28px">XL</option>
        </select>

        <div className="h-6 w-px bg-border" />
        <ToolbarButton title="Fett" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold size={14} /></ToolbarButton>
        <ToolbarButton title="Kursiv" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic size={14} /></ToolbarButton>
        <ToolbarButton title="Unterstrichen" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}><UnderlineIcon size={14} /></ToolbarButton>
        <ToolbarButton title="Durchgestrichen" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough size={14} /></ToolbarButton>
        <ToolbarButton title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}><Heading1 size={14} /></ToolbarButton>
        <ToolbarButton title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 size={14} /></ToolbarButton>
        <ToolbarButton title="Liste" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List size={14} /></ToolbarButton>
        <ToolbarButton title="Nummeriert" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered size={14} /></ToolbarButton>
        <ToolbarButton title="Links" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}><AlignLeft size={14} /></ToolbarButton>
        <ToolbarButton title="Zentriert" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}><AlignCenter size={14} /></ToolbarButton>
        <ToolbarButton title="Rechts" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}><AlignRight size={14} /></ToolbarButton>
        <ToolbarButton title="Rückgängig" onClick={() => editor.chain().focus().undo().run()}><Undo size={14} /></ToolbarButton>
        <ToolbarButton title="Wiederholen" onClick={() => editor.chain().focus().redo().run()}><Redo size={14} /></ToolbarButton>

        <div className="ml-auto flex items-center gap-1">
          <Palette size={14} className="text-muted-foreground" />
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => editor.chain().focus().setColor(color).run()}
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="resize-y overflow-auto bg-background min-h-[220px] max-h-[640px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
