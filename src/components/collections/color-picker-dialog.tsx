"use client";

import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getColorClass, type ColorValue, type ColorShade } from "@/lib/colors";

interface ColorPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColor: ColorValue;
  onSelectColor: (color: ColorValue) => void;
}

const PALETTES = [
  { name: "Neutral", value: "neutral" },
  { name: "Red", value: "red" },
  { name: "Amber", value: "amber" },
  { name: "Yellow", value: "yellow" },
  { name: "Lime", value: "lime" },
  { name: "Teal", value: "teal" },
  { name: "Cyan", value: "cyan" },
  { name: "Blue", value: "blue" },
  { name: "Indigo", value: "indigo" },
  { name: "Purple", value: "purple" },
  { name: "Fuchsia", value: "fuchsia" },
  { name: "Pink", value: "pink" },
] as const;

const SHADES: ColorShade[] = ["100", "300", "500", "700"];

export function ColorPickerDialog({
  open,
  onOpenChange,
  selectedColor,
  onSelectColor,
}: ColorPickerDialogProps) {
  const handleSelect = useCallback(
    (color: ColorValue) => {
      onSelectColor(color);
      onOpenChange(false);
    },
    [onSelectColor, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[400px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Color</DialogTitle>
          <DialogDescription>
            Select a color theme for your collection
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid gap-3">
            {PALETTES.map((palette) => (
              <div key={palette.value} className="space-y-1.5">
                <h3 className="text-xs font-medium text-muted-foreground">
                  {palette.name}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {SHADES.map((shade) => {
                    const colorValue = `${palette.value}-${shade}` as ColorValue;
                    const isSelected = colorValue === selectedColor;

                    return (
                      <button
                        key={colorValue}
                        type="button"
                        onClick={() => handleSelect(colorValue)}
                        className={cn(
                          "relative h-12 rounded-md transition-all hover:scale-105 hover:shadow-md",
                          getColorClass(colorValue, "bg"),
                          isSelected && "ring-2 ring-offset-2 ring-primary scale-105 shadow-md"
                        )}
                        title={`${palette.name} ${shade}`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-white p-0.5 shadow-sm">
                              <Check className="h-3 w-3 text-gray-900" />
                            </div>
                          </div>
                        )}
                        <span className="sr-only">
                          {palette.name} {shade}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
