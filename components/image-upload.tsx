"use client"

import { useEffect, useState } from "react"
import { CldUploadButton } from "next-cloudinary"
import Image from "next/image"

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
  const [src, setSrc] = useState(value)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {}

  if (!isMounted) return null

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
      <CldUploadButton
        onUpload={(result: any) => onChange(result.info.secure_url)}
        options={{
          maxFiles: 1,
        }}
        uploadPreset="GroupChatBotBuilderai"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-2 transition border-4 border-dashed rounded-lg border-primary/10 hover:opacity-75">
          <div className="relative w-40 h-40">
            <Image fill alt="upload" src={value || "/placeholder.svg"} />
          </div>
        </div>
      </CldUploadButton>
    </div>
  )
}
