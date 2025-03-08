"use client"

import { useState, useEffect, Suspense } from "react"
import { GroupCards } from "@/components/group-cards"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { PageSkeleton } from "@/components/ui/page-skeleton"

const GroupPage = () => {
  const [groupChats, setGroupChats] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const itemsPerPage = 10 // Number of groups to display per page

  useEffect(() => {
    const fetchGroupChats = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/group-chat`)
        const data = await response.json()

        // Set the total number of pages based on the actual number of group chats
        const totalPagesCount = Math.max(
          1,
          Math.ceil(data.length / itemsPerPage)
        )
        setTotalPages(totalPagesCount)

        // Instead of displaying all groups, slice the array to show only the current page
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const paginatedData = data.slice(startIndex, endIndex)

        setGroupChats(paginatedData)
      } catch (error) {
        console.error("Error fetching group chats:", error)
      } finally {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }

    fetchGroupChats()
  }, [currentPage])

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Suspense fallback={<PageSkeleton type="grid" items={6} />}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Group Chats</h1>
        
        {isInitialLoad || loading ? (
          <PageSkeleton type="grid" items={6} />
        ) : (
          <>
            {groupChats.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  You don&apos;t have any group chats yet.
                </p>
              </div>
            ) : (
              <GroupCards data={groupChats} />
            )}
          </>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-4 pt-4">
            {currentPage > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full w-10 h-10 p-2 bg-[#C0C1C3] hover:bg-[#B0B1B3] dark:bg-[#505052] dark:hover:bg-[#606062]"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    className="rounded-full w-10 h-10 p-0"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </Button>
                )
              )}
            </div>
            {currentPage < totalPages && (
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full w-10 h-10 p-2 bg-[#C0C1C3] hover:bg-[#B0B1B3] dark:bg-[#505052] dark:hover:bg-[#606062]"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Suspense>
  )
}

export default GroupPage
