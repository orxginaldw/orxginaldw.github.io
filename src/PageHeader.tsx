import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function PageHeader({ icon, title, lede }: { icon: ReactNode; title: string; lede: string }) {
  return (
    <>
      <div className="mb-[18px] flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight size={12} className="opacity-55" />
        <span>{title}</span>
      </div>
      <div className="mb-[18px] flex items-center gap-3.5">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-border bg-card [&>svg]:h-[22px] [&>svg]:w-[22px]">{icon}</div>
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.03em]">{title}</h1>
          <p className="m-0 mt-1 text-muted-foreground">{lede}</p>
        </div>
      </div>
    </>
  );
}
