"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, BrainCircuit, Zap, Coins } from "lucide-react";
import { ComputeIntensityLevel } from "./ChatConfigTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComputeIntensitySliderProps {
  value: ComputeIntensityLevel;
  onChange: (value: ComputeIntensityLevel) => void;
  showTokenCost?: boolean;
  sessionBudget?: number;
  onBudgetChange?: (budget: number) => void;
}

const INTENSITY_LEVELS = [
  { value: ComputeIntensityLevel.ECONOMY, label: "Economy", multiplier: 0.75, color: "bg-green-500" },
  { value: ComputeIntensityLevel.BALANCED, label: "Balanced", multiplier: 1.0, color: "bg-blue-500" },
  { value: ComputeIntensityLevel.ENHANCED, label: "Enhanced", multiplier: 1.5, color: "bg-purple-500" },
  { value: ComputeIntensityLevel.MAXIMUM, label: "Maximum", multiplier: 2.0, color: "bg-red-500" }
];

export const ComputeIntensitySlider = ({
  value,
  onChange,
  showTokenCost = true,
  sessionBudget,
  onBudgetChange
}: ComputeIntensitySliderProps) => {
  const [sliderValue, setSliderValue] = useState<number>(
    INTENSITY_LEVELS.findIndex(level => level.value === value)
  );
  
  const [budget, setBudget] = useState<number>(sessionBudget || 5000);

  useEffect(() => {
    setSliderValue(INTENSITY_LEVELS.findIndex(level => level.value === value));
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    const index = newValue[0];
    setSliderValue(index);
    onChange(INTENSITY_LEVELS[index].value);
  };

  const handleBudgetChange = (newValue: number[]) => {
    const newBudget = newValue[0];
    setBudget(newBudget);
    if (onBudgetChange) {
      onBudgetChange(newBudget);
    }
  };

  const currentLevel = INTENSITY_LEVELS[sliderValue];
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <Label className="text-lg font-medium">Thinking Power</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Adjust the compute intensity to control how deeply the AI thinks about responses. Higher settings use more tokens but produce more thoughtful, creative, and detailed responses.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge className={`${currentLevel.color} px-3 py-1`}>
            {currentLevel.label}
          </Badge>
        </div>

        <Slider
          value={[sliderValue]}
          min={0}
          max={INTENSITY_LEVELS.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="py-4"
        />

        <div className="grid grid-cols-4 text-xs text-muted-foreground">
          {INTENSITY_LEVELS.map((level, index) => (
            <div key={level.value} className={`text-center ${index === sliderValue ? 'font-bold text-primary' : ''}`}>
              {level.label}
            </div>
          ))}
        </div>

        {showTokenCost && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Coins className="h-4 w-4" />
              Token Multiplier:
            </span>
            <span className="font-medium">
              {currentLevel.multiplier}x
            </span>
          </div>
        )}
      </div>

      {onBudgetChange && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <Label className="text-lg font-medium">Session Budget</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Set a maximum token budget for this chat session. The chat will stop once this budget is reached.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {budget.toLocaleString()} tokens
            </Badge>
          </div>

          <Slider
            value={[budget]}
            min={1000}
            max={20000}
            step={1000}
            onValueChange={handleBudgetChange}
            className="py-4"
          />

          <div className="grid grid-cols-3 text-xs text-muted-foreground">
            <div className="text-left">Economy</div>
            <div className="text-center">Standard</div>
            <div className="text-right">Premium</div>
          </div>
        </div>
      )}
    </div>
  );
}; 