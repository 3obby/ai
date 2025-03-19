"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useProModal } from "@/hooks/use-pro-modal";

export const SubscriptionButton = ({
  isPro = false,
  subscription
}: {
  isPro: boolean;
  subscription? : any;
}) => {
  const proModal = useProModal();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const manageSubscription = async () => {
    try {
      setLoading(true);
      
      if (!isPro) {
        proModal.onOpen();
        return;
      }

      if (!subscription?.stripeCustomerId) {
        proModal.onOpen();
        return;
      }

      const response = await axios.get("/api/stripe/manage");
      window.location.href = response.data.url;
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      size="sm" 
      variant={isPro ? "default" : "premium"} 
      onClick={manageSubscription}
      disabled={loading}
    >
      {isPro ? "Manage Subscription" : "Upgrade"}
      {!isPro && <Sparkles className="w-4 h-4 ml-2 fill-white" />}
    </Button>
  )
};
