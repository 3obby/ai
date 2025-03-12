"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { Categories } from "@/components/categories"
import { Companions } from "@/components/companions"
import { SearchInput } from "@/components/search-input"
import { useRouter, useSearchParams } from "next/navigation"
import { useCurrentUser } from "@/lib/hooks/use-current-user" 
import useClientAuth from "@/lib/hooks/use-client-auth"
import { useProModal } from "@/hooks/use-pro-modal"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { ClipLoader } from "react-spinners"
import { toast } from "react-hot-toast"

// Client-side comment about caching (not an actual directive)
// We achieve caching through the useDashboardData hook for client components

interface DashboardPageProps {
  searchParams: {
    categoryId?: string
    name?: string
    page?: string
  }
}

// Client component dashboard with optimized data loading
const Dashboard = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Use both authentication methods for smoother transition
  const { user: sessionUser, isLoading: sessionLoading } = useCurrentUser()
  const { authenticated, user: edgeUser, loading: edgeAuthLoading } = useClientAuth()
  
  // Prefer session user but fall back to edge auth user
  const user = sessionUser || edgeUser
  const isLoading = sessionLoading || edgeAuthLoading
  
  const proModal = useProModal()
  const [companions, setCompanions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [totalCompanions, setTotalCompanions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loadTime, setLoadTime] = useState(0)
  
  // userId can be undefined for anonymous users
  const userId = user?.id;
  
  // Use dashboard data hook which now supports anonymous users
  const { 
    messageCount, 
    userProgress, 
    isAnonymous,
    refreshData,
    isLoading: isDashboardLoading 
  } = useDashboardData({ userId });

  // Show a refresh button if loading takes too long
  const handleManualRefresh = useCallback(() => {
    fetchDashboardData();
    toast.success('Refreshing dashboard data');
  }, []);

  // Fetch all dashboard data in a single request
  const fetchDashboardData = useCallback(async () => {
    const startTime = performance.now();
    setLoading(true);
    
    try {
      // Get current params - handle null searchParams
      const page = searchParams?.get('page') || '1';
      const categoryId = searchParams?.get('categoryId') || '';
      
      // Build URL with search params
      const url = new URL('/api/dashboard/prefetch', window.location.origin);
      url.searchParams.set('page', page);
      if (categoryId) url.searchParams.set('categoryId', categoryId);
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      
      // Update all state at once
      setCompanions(data.companions);
      setCategories(data.categories);
      setTotalCompanions(data.totalCompanions);
      setCurrentPage(data.currentPage);
      setPageSize(data.pageSize);
      
      const endTime = performance.now();
      setLoadTime(Math.round(endTime - startTime));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Fetch data when component mounts or params change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, searchParams]);

  return (
    <div className="h-full p-4 space-y-2">
      {loading && (
        <div className="text-blue-500 text-sm p-2 rounded bg-blue-100/10 dark:bg-blue-900/10 flex justify-between items-center">
          <span>Loading dashboard...</span>
        </div>
      )}
      
      {loadTime > 1000 && !loading && (
        <div className="text-amber-500 text-xs p-1 rounded bg-amber-100/10 text-right">
          Loaded in {loadTime}ms
          {loadTime > 3000 && (
            <span className="ml-2 text-amber-300 cursor-pointer" onClick={handleManualRefresh}>
              ↻ Refresh
            </span>
          )}
        </div>
      )}
      
      <SearchInput />
      
      <Categories data={categories || []} />
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <ClipLoader color="#888" size={30} />
        </div>
      ) : (
        <Companions 
          userId={userId || ""} 
          data={companions} 
          currentPage={currentPage} 
          totalCompanions={totalCompanions} 
          pageSize={pageSize} 
        />
      )}
    </div>
  )
}

export default Dashboard 