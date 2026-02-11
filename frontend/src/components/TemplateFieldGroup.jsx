export default function TemplateFieldGroup({
  title,
  fields,
  selected,
  onToggle
}) {
  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h3 className="font-semibold mb-3">{title}</h3>

      {fields.map(field => (
        <label
          key={field.key}
          className="flex items-center gap-2 mb-2"
        >
          <input
            type="checkbox"
            checked={!!selected[field.key]}
            disabled={field.mandatory}
            onChange={() => onToggle(field.key)}
          />

          <span>
            {field.label}
            {field.mandatory && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
