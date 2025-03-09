"use client"

import { useEffect, useState } from "react"
import { CldUploadButton } from "next-cloudinary"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploadFormProps {
  value: string
  onChange: (src: string) => void
  disabled: boolean
}

// Robot fallback image settings
const ROBOT_STYLES = ['bottts', 'avataaars', 'micah', 'notionists', 'pixel-art'];

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
  const [isError, setIsError] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    // Generate a random avatar on initial mount if no value is provided
    if (!value) {
      generateRandomAvatar()
    } else {
      setPreviewUrl(value)
      // Validate that existing image loads correctly
      checkImageValidity(value)
    }
  }, [value])

  // Check if an image URL is valid and can be loaded
  const checkImageValidity = (url: string) => {
    // Only check actual URLs, not data URLs or relative paths
    if (!url || url.startsWith('/') || url.startsWith('data:')) {
      return;
    }

    const img = new window.Image();
    img.onerror = () => {
      console.warn("Image failed to load:", url);
      setIsError(true);
      // Auto-fallback to a robot image
      applyFallbackImage("Image couldn't be loaded");
    };
    img.src = url;
  }

  const applyFallbackImage = (reason: string) => {
    // Create a deterministic seed from the current time to ensure uniqueness
    const seed = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    // Pick a random robot style
    const style = ROBOT_STYLES[Math.floor(Math.random() * ROBOT_STYLES.length)];
    // Generate the fallback URL
    const fallbackUrl = `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=200`;
    
    // Update preview and form value
    setPreviewUrl(fallbackUrl);
    onChange(fallbackUrl);
    
    // Reset error state
    setIsError(false);
    
    // Notify user with toast
    toast({
      title: "Using fallback image",
      description: reason,
      variant: "default"
    });
  }

  const generateRandomAvatar = () => {
    // Using DiceBear API to generate random avatars
    // Pick a random robot style
    const style = ROBOT_STYLES[Math.floor(Math.random() * ROBOT_STYLES.length)];
    // Adding a random seed and timestamp to ensure we get a new image each time
    const seed = Math.random().toString(36).substring(2, 10)
    const timestamp = Date.now()
    // Using PNG instead of SVG for better compatibility with Next.js Image
    const avatarUrl = `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9&t=${timestamp}`

    // Update both the preview and the form value
    setPreviewUrl(avatarUrl)
    onChange(avatarUrl)
    setIsError(false);
  }

  // Handle Cloudinary upload
  const handleCloudinaryUpload = (result: any) => {
    try {
      if (result.event !== "success" || !result.info) {
        throw new Error("Upload failed");
      }

      // Get the secure URL from the upload
      let uploadedUrl = result.info.secure_url;

      // Apply auto-formatting transformations if it's a Cloudinary URL
      if (uploadedUrl.includes('cloudinary.com')) {
        // Extract the base URL and add transformations:
        // c_fill: crop to fill
        // g_face: focus on face if detected
        // w_400,h_400: resize to 400x400
        // q_auto: automatic quality optimization
        const baseUrlParts = uploadedUrl.match(/(.*\/upload\/)(v\d+\/)?([^/]+)$/);
        
        if (baseUrlParts && baseUrlParts.length >= 3) {
          uploadedUrl = `${baseUrlParts[1]}c_fill,g_face,w_400,h_400,q_auto/${baseUrlParts[3]}`;
        }
      }

      setPreviewUrl(uploadedUrl);
      onChange(uploadedUrl);
      setIsError(false);
    } catch (error) {
      console.error("Error during upload:", error);
      applyFallbackImage("Image upload failed");
    }
  };

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
                sizes="(max-width: 768px) 120px, 160px"
                alt="Bot Avatar"
                src={previewUrl}
                className={`rounded-lg object-cover ${isError ? 'opacity-50' : ''}`}
                unoptimized // This helps with external URLs
                onError={() => {
                  setIsError(true);
                  applyFallbackImage("Failed to load image");
                }}
              />
              {isError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <AlertTriangle className="h-10 w-10 text-yellow-500" />
                </div>
              )}
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
            onUpload={handleCloudinaryUpload}
            options={{
              maxFiles: 1,
              maxFileSize: 5000000, // 5MB max
              resourceType: 'image',
              clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
              sources: ['local', 'url'], // Allow upload from device and URL
            }}
            uploadPreset="GroupChatBotBuilderai"
          >
            <div className="flex flex-col items-center justify-center p-4 space-y-2 transition border-4 border-dashed rounded-lg border-primary/10 hover:opacity-75">
              <div className="relative w-40 h-40">
                <Image
                  fill
                  sizes="(max-width: 768px) 120px, 160px"
                  alt="upload"
                  src={previewUrl}
                  className={`rounded-lg object-cover ${isError ? 'opacity-50' : ''}`}
                  unoptimized
                  onError={() => {
                    setIsError(true);
                    applyFallbackImage("Failed to load image");
                  }}
                />
                {isError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <AlertTriangle className="h-10 w-10 text-yellow-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Click to upload an image (max 5MB)
              </p>
            </div>
          </CldUploadButton>
        </TabsContent>
      </Tabs>
    </div>
  )
}
