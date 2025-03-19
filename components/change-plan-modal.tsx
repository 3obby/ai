"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'starter' | 'pro' | 'ultimate';
}

export const ChangePlanModal = ({ 
  isOpen, 
  onClose, 
  currentPlan 
}: ChangePlanModalProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'ultimate' | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setSelectedPlan(currentPlan);
  }, [currentPlan]);

  const PRICE_IDS = {
    starter: process.env.NEXT_PUBLIC_STARTER_PRICE_ID,
    pro: process.env.NEXT_PUBLIC_PRO_PRICE_ID,
    ultimate: process.env.NEXT_PUBLIC_ULTIMATE_PRICE_ID
  } as const;

  const prices = {
    starter: 999,
    pro: 2999,
    ultimate: 4999
  };

  const planFeatures = {
    starter: [
      "✨ Access to all prebuilt bots",
      "✨ 50 chat messages per day",
      "✨ 1 personal bot"
    ],
    pro: [
      "🔥 Everything in Starter, plus:",
      "🔥 100 chat messages per day",
      "🔥 Up to 10 personal bots",
    ],
    ultimate: [
      "⚡ Everything in Pro, plus:",
      "⚡ Unlimited chat messages",
      "⚡ Unlimited personal bots"
    ]
  };

  const onSubscriptionChange = async () => {
    if (!selectedPlan) return;

    try {
      setLoading(true);
      const priceId = PRICE_IDS[selectedPlan];
      const price = prices[selectedPlan];
      
      if (!priceId) {
        toast({
          description: "Invalid plan selected",
          variant: "destructive",
        });
        return;
      }

      const response = await axios.post("/api/stripe/change-subscription", {
        newPriceId: priceId,
        newPrice: price
      });

      if (response.data?.url) {
        // Redirect to payment page for upgrades
        window.location.href = response.data.url;
      } else if (response.data?.success) {
        // Handle successful downgrade
        toast({
          description: response.data.message,
          variant: "default",
        });
        onClose();
        window.location.reload();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data || "Something went wrong with the subscription change";
      toast({
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isMounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center">
            Change Your Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Select a new plan to change your subscription
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(prices).map(([plan, price]) => (
            <div 
              key={plan}
              onClick={() => setSelectedPlan(plan as 'starter' | 'pro' | 'ultimate')}
              className={`p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md
                ${selectedPlan === plan 
                  ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/20' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-sky-500/50'
                }`}
            >
              <div className="flex flex-col items-center mb-4">
                <h3 className="font-semibold text-lg text-foreground">
                  {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                </h3>
                <Button 
                  variant={selectedPlan === plan ? "premium" : "outline"}
                  className="w-full mt-2 pointer-events-none"
                >
                  ${(price/100).toFixed(2)}/mo
                </Button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {planFeatures[plan as keyof typeof planFeatures].map((feature, index) => (
                  <p key={index}>{feature}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 bg-background pt-4">
          <Separator className="mb-4" />
          <Button 
            onClick={onSubscriptionChange} 
            disabled={loading || !selectedPlan} 
            variant="premium" 
            className="w-full"
          >
            {loading 
              ? "Processing..." 
              : selectedPlan 
                ? `Change to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan`
                : "Select a plan"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 