"use client"

import { useEffect, useState } from "react"
import { CldUploadButton } from "next-cloudinary"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw } from "lucide-react"

interface ImageUploadFormProps {
  value: string
  onChange: (src: string) => void
  disabled: boolean
}

export const ImageUpload = ({
  value,
  onChange,
  disabled,
}: ImageUploadFormProps) => {
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("random")
  const [previewUrl, setPreviewUrl] = useState<string>(
    value || "/placeholder.svg"
  )

  useEffect(() => {
    setIsMounted(true)
    // Generate a random avatar on initial mount if no value is provided
    if (!value) {
      generateRandomAvatar()
    } else {
      setPreviewUrl(value)
    }
  }, [value])

  const generateRandomAvatar = () => {
    // Using DiceBear API to generate random avatars
    // We're using the 'bottts' style which creates robot-like avatars with PNG format
    // Adding a random seed and timestamp to ensure we get a new image each time
    const seed = Math.random().toString(36).substring(2, 10)
    const timestamp = Date.now()
    // Using PNG instead of SVG for better compatibility with Next.js Image
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/png?seed=${seed}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9&t=${timestamp}`

    // Update both the preview and the form value
    setPreviewUrl(avatarUrl)
    onChange(avatarUrl)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {}

  if (!isMounted) return null

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <Tabs
        defaultValue="random"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="random">Random Avatar</TabsTrigger>
          <TabsTrigger value="upload">Upload Image</TabsTrigger>
        </TabsList>

        <TabsContent
          value="random"
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex flex-col items-center justify-center p-4 space-y-2 transition border-4 border-dashed rounded-lg border-primary/10">
            <div className="relative w-40 h-40">
              <Image
                fill
                alt="Bot Avatar"
                src={previewUrl}
                className="rounded-lg object-cover"
                unoptimized // This helps with external URLs
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={generateRandomAvatar}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Generate New Avatar
          </Button>
        </TabsContent>

        <TabsContent value="upload">
          <CldUploadButton
            onUpload={(result: any) => {
              const uploadedUrl = result.info.secure_url
              setPreviewUrl(uploadedUrl)
              onChange(uploadedUrl)
            }}
            options={{
              maxFiles: 1,
            }}
            uploadPreset="GroupChatBotBuilderai"
          >
            <div className="flex flex-col items-center justify-center p-4 space-y-2 transition border-4 border-dashed rounded-lg border-primary/10 hover:opacity-75">
              <div className="relative w-40 h-40">
                <Image
                  fill
                  alt="upload"
                  src={previewUrl}
                  className="rounded-lg object-cover"
                  unoptimized
                />
              </div>
            </div>
          </CldUploadButton>
        </TabsContent>
      </Tabs>
    </div>
  )
}
