"use client"

import * as z from "zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Wand2, Star, Loader2 } from "lucide-react"
import { Category, Companion } from "@prisma/client"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { BsStars } from "react-icons/bs"
import { useToast } from "@/components/ui/use-toast"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/image-upload"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select"
import { useProModal } from "@/hooks/use-pro-modal"

const PREAMBLE = `You are a fictional character whose name is Elon. You are a visionary entrepreneur and inventor. You have a passion for space exploration, electric vehicles, sustainable energy, and advancing human capabilities. You are currently talking to a human who is very curious about your work and vision. You are ambitious and forward-thinking, with a touch of wit. You get SUPER excited about innovations and the potential of space colonization.
`

const XP_REQUIRED_FOR_Generation = 15
const XP_REQUIRED_FOR_CREATION = 100

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Name is required.",
    })
    .refine((value) => value.trim().length > 0, {
      message: "Name cannot be empty or just spaces.",
    }),
  instructions: z
    .string()
    .min(200, {
      message: "Behavior require at least 200 characters.",
    })
    .refine((value) => value.trim().length >= 200, {
      message:
        "Behavior cannot be just spaces and must be at least 200 characters.",
    }),
  customIntroduction: z.string().optional(),
  src: z
    .string()
    .min(1, {
      message: "Image is required.",
    })
    .refine((value) => value.trim().length > 0, {
      message: "Image URL cannot be empty.",
    }),
  categoryId: z
    .string()
    .min(1, {
      message: "Category is required",
    })
    .refine((value) => value.trim().length > 0, {
      message: "Please select a valid category.",
    }),
  private: z.boolean(),
})

interface CompanionFormProps {
  categories: Category[]
  initialData: Companion | null
}

export const CompanionForm = ({
  categories,
  initialData,
}: CompanionFormProps) => {
  const router = useRouter()
  const { toast } = useToast()
  const proModal = useProModal()
  const [userUsage, setUserUsage] = useState<any>(null)

  useEffect(() => {
    const fetchUserUsage = async () => {
      try {
        const response = await fetch("/api/user-progress")
        const data = await response.json()
        setUserUsage(data)
      } catch (error) {
        console.error("Error fetching user usage:", error)
      }
    }

    fetchUserUsage()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      instructions: "",
      customIntroduction: "",
      src: "",
      categoryId: undefined,
      private: false,
    },
  })

  const isLoading = form.formState.isSubmitting
  const [isGenerating, setIsGenerating] = useState(false)

  const onGenerate = async () => {
    const name = form.getValues("name")

    if (!name || name.trim() === "") {
      toast({
        variant: "destructive",
        description: "Please enter a name before generating behavior",
      })
      return
    }

    if (!userUsage || userUsage.availableTokens < XP_REQUIRED_FOR_Generation) {
      proModal.onOpen()
      return
    }

    try {
      setIsGenerating(true)

      const response = await axios.post("/api/companion/behavior", {
        name: name,
        instructions: form.getValues("instructions"),
      })

      form.setValue("instructions", response.data.behavior, {
        shouldValidate: true,
      })

      toast({
        description: "AI behavior generated!",
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast({
          variant: "destructive",
          description: error.response.data,
        })
      } else {
        toast({
          variant: "destructive",
          description: "Failed to generate AI behavior",
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (initialData) {
        await axios.patch(`/api/companion/${initialData.id}`, values)
      } else {
        if (
          !userUsage ||
          userUsage.availableTokens < XP_REQUIRED_FOR_CREATION
        ) {
          proModal.onOpen()
          return
        }
        await axios.post("/api/companion", values)
      }

      toast({
        description: "Success.",
      })
      router.refresh()
      router.push("/")
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        toast({
          variant: "destructive",
          description: error.response.data,
        })
      } else {
        toast({
          variant: "destructive",
          description: "Something went wrong.",
        })
      }
    }
  }

  return (
    <div className="h-full w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 pb-10"
        >
          <div className="space-y-2 w-full col-span-2">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
                General Information
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                General information about your Companion
              </p>
            </div>
            <Separator className="bg-slate-200 dark:bg-zinc-700" />
          </div>
          <FormField
            name="src"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center justify-center space-y-4 col-span-2">
                <FormControl>
                  <ImageUpload
                    disabled={isLoading}
                    onChange={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem className="col-span-2 md:col-span-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="Elon Musk"
                      className="bg-white dark:bg-[#27272A] border-slate-200 dark:border-zinc-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="col-span-2 md:col-span-1">
                  <FormLabel>Category</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-[#27272A] border-slate-200 dark:border-zinc-700">
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a category"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-[#27272A] border-slate-200 dark:border-zinc-700">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2 w-full">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
                Configuration
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Detailed instructions for your AI companion
              </p>
            </div>
            <Separator className="bg-slate-200 dark:bg-zinc-700" />
          </div>
          <FormField
            name="instructions"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Behavior</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      rows={7}
                      className="resize-none bg-white dark:bg-[#27272A] border-slate-200 dark:border-zinc-700 rounded-b-none border-b-0"
                      placeholder={PREAMBLE}
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full bg-white dark:bg-[#27272A] border-x-0 border-b-0 border-t-[1px] border-slate-200 dark:border-zinc-700 rounded-t-none h-12 flex justify-end"
                    onClick={onGenerate}
                    disabled={
                      isLoading || isGenerating || !form.getValues("name")
                    }
                  >
                    <div className="flex items-center text-slate-500 dark:text-zinc-400">
                      {isGenerating ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <BsStars className="w-5 h-5 mr-2 text-blue-500" />
                      )}
                      Generate AI suggestions
                    </div>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="customIntroduction"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Introduction</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isLoading}
                    rows={3}
                    className="resize-none bg-white dark:bg-[#27272A] border-slate-200 dark:border-zinc-700"
                    placeholder="Hi everyone, I'm a custom AI! 👋"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Customize how this bot introduces itself when joining a group
                  chat. Include a wave emoji (👋) for best results. Leave empty
                  to use default introductions.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="private"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-700 p-4 shadow-sm bg-white dark:bg-[#27272A]">
                <div className="space-y-0.5">
                  <FormLabel>Private Companion</FormLabel>
                  <FormDescription>
                    Make this companion private and visible only to you
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="w-full flex justify-center">
            <Button
              size="lg"
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {initialData ? "Edit your companion" : "Create your companion"}
              <Wand2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
