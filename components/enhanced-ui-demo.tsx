"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface Transaction {
  id: string
  date: Date
  amount: number
  status: "completed" | "pending" | "failed"
  description: string
}

export function EnhancedUIDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  
  // Dummy data
  const transactions: Transaction[] = [
    {
      id: "728ed52f",
      date: new Date(2023, 3, 15),
      amount: 100,
      status: "completed",
      description: "Subscription payment"
    },
    {
      id: "489e1d42",
      date: new Date(2023, 4, 15),
      amount: 100,
      status: "completed",
      description: "Subscription payment"
    },
    {
      id: "62f5fe12",
      date: new Date(2023, 5, 15),
      amount: 100,
      status: "pending",
      description: "Subscription payment"
    }
  ]

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500"
      case "pending":
        return "text-yellow-500"
      case "failed":
        return "text-red-500"
    }
  }

  const handleLoadData = () => {
    setIsLoading(true)
    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-10 text-center">
        UI Component Showcase
      </h1>

      <Tabs defaultValue="dashboard" className="w-full mb-10">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Account Balance</CardTitle>
                <CardDescription>
                  Your current available tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    "3,500 Tokens"
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleLoadData}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh Balance"}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>
                  Your daily token usage
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[220px]" />
                  </div>
                ) : (
                  <div className="h-[150px] w-full bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                    Chart Goes Here
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>
                  Pick a date to view history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your recent payments and token purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your recent transactions.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">
                                {transaction.id}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold">Transaction Details</h4>
                                <p className="text-sm">
                                  Full ID: {transaction.id}-{Math.floor(Math.random() * 1000)}
                                </p>
                                <p className="text-sm">
                                  Processed via: Stripe
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        <TableCell>
                          {transaction.date.toLocaleDateString()}
                        </TableCell>
                        <TableCell>${transaction.amount}.00</TableCell>
                        <TableCell className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Your email address"
                  defaultValue="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  defaultValue="John Doe"
                />
              </div>
              <Separator className="my-4" />
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="password">
                  <AccordionTrigger>Change Password</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                      <Button>Update Password</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="subscription">
                  <AccordionTrigger>Subscription Plans</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        You are currently on the <span className="font-semibold">Pro Plan</span>.
                        Your next billing date is June 15, 2023.
                      </p>
                      <Button variant="outline">Manage Subscription</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Manage application preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">Light</Button>
                  <Button variant="outline" size="sm">Dark</Button>
                  <Button variant="outline" size="sm">System</Button>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Email Notifications</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">On</Button>
                  <Button variant="outline" size="sm">Off</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 