"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SettingsModalContextType {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}

const SettingsModalContext = createContext<
  SettingsModalContextType | undefined
>(undefined)

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)

  return (
    <SettingsModalContext.Provider value={{ isOpen, onOpen, onClose }}>
      {children}
    </SettingsModalContext.Provider>
  )
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext)

  if (context === undefined) {
    throw new Error(
      "useSettingsModal must be used within a SettingsModalProvider"
    )
  }

  return context
}
