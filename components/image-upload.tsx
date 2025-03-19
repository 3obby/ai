"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, RefreshCw, Upload } from "lucide-react"
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
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

    const img = document.createElement('img');
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

  // Process image file uploads
  const processImageFile = (file: File) => {
    setIsUploading(true);
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      setIsUploading(false);
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      setIsUploading(false);
      return;
    }
    
    // Create a FileReader to read the file
    const reader = new FileReader();
    
    reader.onload = (event) => {
      // Get the data URL from the event result
      const dataUrl = event.target?.result as string;
      
      // Process the image - resize it to max 500x500
      const img = document.createElement('img');
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate the new dimensions, maintaining aspect ratio
        if (width > height) {
          if (width > 500) {
            height = Math.round((height * 500) / width);
            width = 500;
          }
        } else {
          if (height > 500) {
            width = Math.round((width * 500) / height);
            height = 500;
          }
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw the resized image on the canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get the resized image as a data URL
          const resizedDataUrl = canvas.toDataURL(file.type, 0.92); // 0.92 quality
          
          // Create a thumbnail version (200x200)
          const thumbCanvas = document.createElement('canvas');
          let thumbWidth = width;
          let thumbHeight = height;
          
          // Calculate thumbnail dimensions
          if (thumbWidth > thumbHeight) {
            if (thumbWidth > 200) {
              thumbHeight = Math.round((thumbHeight * 200) / thumbWidth);
              thumbWidth = 200;
            }
          } else {
            if (thumbHeight > 200) {
              thumbWidth = Math.round((thumbWidth * 200) / thumbHeight);
              thumbHeight = 200;
            }
          }
          
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          
          // Draw the thumbnail
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
            
            // Log the thumbnail URL for potential use elsewhere
            console.log("Thumbnail available as separate image");
          }
          
          // Update the UI with the resized image
          setPreviewUrl(resizedDataUrl);
          onChange(resizedDataUrl);
          setIsError(false);
        }
        setIsUploading(false);
      };
      
      img.onerror = () => {
        toast({
          title: "Image processing failed",
          description: "Could not process the selected image",
          variant: "destructive"
        });
        setIsUploading(false);
        applyFallbackImage("Image processing failed");
      };
      
      img.src = dataUrl;
    };
    
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Could not read the selected file",
        variant: "destructive"
      });
      setIsUploading(false);
      applyFallbackImage("Error reading file");
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Handle file drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
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
          <TabsTrigger value="random">Random</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
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
            New Random
          </Button>
        </TabsContent>

        <TabsContent value="upload">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            disabled={disabled || isUploading}
          />
          
          <div 
            className="flex flex-col items-center justify-center p-4 space-y-2 transition border-4 border-dashed rounded-lg border-primary/10 hover:border-primary/30 cursor-pointer"
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="relative w-40 h-40">
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
            
            <div className="flex flex-col items-center">
              <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
              <p className="text-xs text-center text-muted-foreground">
                Click or drag to upload<br />(max 5MB)
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
