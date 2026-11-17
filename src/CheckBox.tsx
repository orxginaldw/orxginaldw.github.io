export default function CheckBox({ checked, onChange }: { checked: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className={"inline-grid place-items-center " + (onChange ? "cursor-pointer" : "pointer-events-none")}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(event) => onChange?.(event.target.checked)} readOnly={!onChange} />
      <span className={"relative inline-block h-[18px] w-[18px] rounded border transition-colors duration-[110ms] " + (checked ? "border-primary bg-primary" : "border-border bg-secondary")}>
        <svg viewBox="0 0 16 16" className="absolute inset-0 m-auto h-4 w-4 fill-none stroke-[#141418] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            style={{
              strokeDasharray: "16px",
              strokeDashoffset: checked ? 0 : "16px",
              transition: "stroke-dashoffset .22s ease",
              transitionDelay: checked ? ".06s" : "0s",
            }}
          />
        </svg>
      </span>
    </label>
  );
}
