import { AdminInput, AdminTextarea, AdminSelect } from "./AdminPageHeader.jsx";

export default function FieldEditor({ field, value, onChange, forms, collections }) {
  switch (field.type) {
    case "text":
      return <AdminInput label={field.label} value={value} onChange={onChange} required={field.required} />;

    case "textarea":
      return <AdminTextarea label={field.label} value={value} onChange={onChange} />;

    case "richtext":
      return <AdminTextarea label={field.label} value={value} onChange={onChange} rows={8} help="Supports HTML: h2, p, strong, em, ul, ol, a, etc." />;

    case "number":
      return <AdminInput label={field.label} type="number" value={value} onChange={(v) => onChange(Number(v))} />;

    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-white">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );

    case "select":
      return (
        <AdminSelect
          label={field.label}
          value={value}
          onChange={onChange}
          options={(field.options || []).map((o) => ({ value: o, label: o }))}
        />
      );

    case "color":
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-1">{field.label}</label>
          <div className="flex gap-2">
            <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
            <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-xl bg-[#0B1220] border border-[#1E293B] px-3 py-2 text-white text-sm" />
          </div>
        </div>
      );

    case "media":
      return <AdminInput label={field.label} value={value} onChange={onChange} placeholder="/assets/image.png or URL" help="Enter image URL or upload via Media Library" />;

    case "link":
      return <AdminInput label={field.label} value={value} onChange={onChange} placeholder="/page or https://..." />;

    case "form":
      return (
        <AdminSelect
          label={field.label}
          value={value}
          onChange={onChange}
          options={[{ value: "", label: "Select form..." }, ...(forms || []).map((f) => ({ value: f.id, label: f.name }))]}
        />
      );

    case "collection":
      return (
        <AdminSelect
          label={field.label}
          value={value}
          onChange={onChange}
          options={[{ value: "", label: "Select collection..." }, ...(collections || []).map((c) => ({ value: c.id, label: c.name }))]}
        />
      );

    case "code":
      return <AdminTextarea label={field.label} value={value} onChange={onChange} rows={10} help="Custom HTML — sanitized on render" />;

    case "list":
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-1">{field.label}</label>
          <AdminTextarea value={(value || []).join("\n")} onChange={(v) => onChange(v.split("\n").filter(Boolean))} rows={4} help="One item per line" />
        </div>
      );

    case "buttons":
      return <ButtonsEditor label={field.label} value={value} onChange={onChange} />;

    case "cards":
      return <CardsEditor label={field.label} value={value} onChange={onChange} />;

    default:
      return <AdminInput label={field.label} value={typeof value === "object" ? JSON.stringify(value) : value} onChange={onChange} />;
  }
}

function ButtonsEditor({ label, value = [], onChange }) {
  const add = () => onChange([...value, { label: "Button", href: "/", style: "primary", newTab: false }]);
  const update = (i, key, val) => {
    const next = [...value];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      {value.map((btn, i) => (
        <div key={i} className="mb-3 p-3 rounded-xl border border-[#1E293B] space-y-2">
          <AdminInput label="Label" value={btn.label} onChange={(v) => update(i, "label", v)} />
          <AdminInput label="Link" value={btn.href} onChange={(v) => update(i, "href", v)} />
          <AdminSelect label="Style" value={btn.style} onChange={(v) => update(i, "style", v)} options={["primary", "secondary", "outline", "ghost"]} />
          <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <input type="checkbox" checked={btn.newTab} onChange={(e) => update(i, "newTab", e.target.checked)} /> Open in new tab
          </label>
          <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-[#F97316] hover:underline">+ Add button</button>
    </div>
  );
}

function CardsEditor({ label, value = [], onChange }) {
  const add = () => onChange([...value, { title: "Card Title", description: "Description" }]);
  const update = (i, key, val) => {
    const next = [...value];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      {value.map((card, i) => (
        <div key={i} className="mb-3 p-3 rounded-xl border border-[#1E293B] space-y-2">
          <AdminInput label="Title" value={card.title || card.name} onChange={(v) => update(i, card.name !== undefined ? "name" : "title", v)} />
          <AdminInput label="Subtitle" value={card.subtitle} onChange={(v) => update(i, "subtitle", v)} />
          <AdminTextarea label="Description" value={card.description || card.copy} onChange={(v) => update(i, card.copy !== undefined ? "copy" : "description", v)} rows={2} />
          <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-[#F97316] hover:underline">+ Add card</button>
    </div>
  );
}
