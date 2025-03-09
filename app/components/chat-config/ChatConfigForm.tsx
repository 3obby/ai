"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  ChatConfigManifest,
  ResponseOrderingStrategy,
  SessionPersistenceType,
  InputVisibilityType,
  ComputeIntensityLevel,
  ExternalToolAccess,
  chatConfigManifestSchema,
  defaultChatConfig
} from "./ChatConfigTypes";
import { ComputeIntensitySlider } from "./ComputeIntensitySlider";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

                  <FormField
                    control={form.control}
                    name="executionRules.computeIntensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compute Intensity</FormLabel>
                        <FormControl>
                          <ComputeIntensitySlider 
                            value={field.value}
                            onChange={field.onChange}
                            showTokenCost={true}
                          />
                        </FormControl>
                        <FormDescription>
                          Balance between token usage and response quality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> 