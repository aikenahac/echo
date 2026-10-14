import { Cover } from "@/components/echo/cover";
import { Stamp } from "@/components/echo/stamp";
import { cn } from "@/lib/utils";

/** Three covers fanned out, the last one stamped FINISHED. */
export function CoverFan({
  className,
  width = 150,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative flex items-end justify-center", className)}
      style={{ height: width * 1.62 }}
    >
      <div
        className="absolute"
        style={{ transform: `translateX(-${width * 0.62}px) rotate(-8deg)`, top: width * 0.18 }}
      >
        <Cover src="/welcome/pachinko.jpg" title="Pachinko" width={width * 0.92} />
      </div>
      <div
        className="absolute"
        style={{ transform: `translateX(${width * 0.62}px) rotate(7deg)`, top: width * 0.12 }}
      >
        <Cover src="/welcome/james.jpg" title="James" width={width * 0.92} />
      </div>
      <div
        className="absolute z-20"
        style={{ transform: `translateX(${width * 0.66}px)`, top: width * 1.3 }}
      >
        <Stamp size={width >= 140 ? "md" : "sm"} rotate={-6}>
          Finished
        </Stamp>
      </div>
      <div className="absolute top-0 z-10">
        <Cover src="/welcome/piranesi.jpg" title="Piranesi" width={width} priority />
      </div>
    </div>
  );
}
