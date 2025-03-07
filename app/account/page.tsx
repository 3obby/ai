import { redirect } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCurrentUser } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getAccountData(userId: string) {
  // Get user data, subscription and usage information
  const [userSubscription, userUsage] = await Promise.all([
    prismadb.userSubscription.findUnique({
      where: { userId },
    }),
    prismadb.userUsage.findUnique({
      where: { userId },
    }),
  ]);

  // Get transaction history
  const transactions = await prismadb.usageTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return { userSubscription, userUsage, transactions };
}

export default async function AccountPage() {
  // Check if user is authenticated using the server-side cookies API
  const cookieStore = cookies();
  const authToken = cookieStore.get("auth-token")?.value;
  
  // Create a mock request with the auth token
  const request = {
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "cookie") {
          return authToken ? `auth-token=${authToken}` : "";
        }
        return null;
      }
    }
  } as Request;
  
  const user = await getCurrentUser(request);
  
  if (!user) {
    redirect("/login");
  }

  const { userSubscription, userUsage, transactions } = await getAccountData(user.id);

  // Get subscription renewal date (if available)
  const subscriptionDate = userSubscription?.stripeCurrentPeriodEnd 
    ? new Date(userSubscription.stripeCurrentPeriodEnd) 
    : null;
  
  // Get last 3 months of subscription dates for the calendar
  const subscriptionDates: Date[] = [];
  
  if (subscriptionDate) {
    // Add the next renewal date
    subscriptionDates.push(new Date(subscriptionDate));
    
    // Add previous months (assuming monthly subscription)
    for (let i = 1; i <= 2; i++) {
      const prevDate = new Date(subscriptionDate);
      prevDate.setMonth(prevDate.getMonth() - i);
      subscriptionDates.push(prevDate);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-10 text-center">
        Account Dashboard
      </h1>

      <Tabs defaultValue="overview" className="w-full mb-10">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-6">
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
                  {userUsage?.availableTokens?.toLocaleString() || 0} Tokens
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="mt-2">
                  Purchase More
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Lifetime Usage</CardTitle>
                <CardDescription>
                  Total tokens used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {userUsage?.totalSpent?.toLocaleString() || 0} Tokens
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total spent: ${userUsage?.totalMoneySpent?.toFixed(2) || "0.00"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>
                  Your current plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">
                  {userSubscription 
                    ? (userSubscription.subscriptionType 
                        ? userSubscription.subscriptionType.charAt(0).toUpperCase() + userSubscription.subscriptionType.slice(1) 
                        : "Standard") 
                    : "Free"} Plan
                </div>
                {subscriptionDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Renews: {subscriptionDate.toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="mt-2">
                  Manage Plan
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your recent token transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No transactions found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium p-2">Date</th>
                        <th className="text-left font-medium p-2">Transaction ID</th>
                        <th className="text-left font-medium p-2">Type</th>
                        <th className="text-right font-medium p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 text-sm">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-sm font-mono text-xs">
                            {transaction.id.substring(0, 8)}...
                          </td>
                          <td className="p-2 text-sm">
                            {transaction.amount > 0 ? "Credit" : "Debit"}
                          </td>
                          <td className="p-2 text-sm text-right">
                            <span className={transaction.amount > 0 ? "text-green-500" : "text-red-500"}>
                              {transaction.amount > 0 ? "+" : ""}{transaction.amount} tokens
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>
                  Manage your subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Current Plan</Label>
                  <div className="font-medium">
                    {userSubscription 
                      ? (userSubscription.subscriptionType 
                          ? userSubscription.subscriptionType.charAt(0).toUpperCase() + userSubscription.subscriptionType.slice(1) 
                          : "Standard") 
                      : "Free"} Plan
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label>Price</Label>
                  <div className="font-medium">
                    ${userSubscription?.price?.toFixed(2) || "0.00"} / month
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label>Included Tokens</Label>
                  <div className="font-medium">
                    {userSubscription?.includeBaseTokens?.toLocaleString() || "0"} tokens / month
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label>Next Billing Date</Label>
                  <div className="font-medium">
                    {subscriptionDate ? subscriptionDate.toLocaleDateString() : "N/A"}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Subscription Calendar</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Calendar
                      mode="single"
                      selected={subscriptionDate || undefined}
                      classNames={{
                        day_selected: "bg-green-500 text-primary-foreground hover:bg-green-500 hover:text-primary-foreground focus:bg-green-500 focus:text-primary-foreground",
                      }}
                      modifiers={{
                        subscription: subscriptionDates,
                      }}
                      modifiersStyles={{
                        subscription: {
                          backgroundColor: "rgba(34, 197, 94, 0.2)",
                          fontWeight: "bold",
                          borderRadius: "0",
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Green dates indicate subscription renewals
                  </p>
                </div>
              </CardContent>
              <CardFooter className="space-x-2">
                <Button variant="outline">Cancel Plan</Button>
                <Button>Upgrade Plan</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  Choose the right plan for your needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Free Plan</h3>
                        <p className="text-sm text-muted-foreground">For casual users</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">$0</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <ul className="space-y-1">
                        <li>• 100 tokens included</li>
                        <li>• Basic features</li>
                        <li>• Standard support</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4 hover:bg-accent cursor-pointer bg-accent/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Standard Plan</h3>
                        <p className="text-sm text-muted-foreground">Popular choice</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">$9.99</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <ul className="space-y-1">
                        <li>• 1,000,000 tokens included</li>
                        <li>• All features</li>
                        <li>• Priority support</li>
                      </ul>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full">Current Plan</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Pro Plan</h3>
                        <p className="text-sm text-muted-foreground">For power users</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">$19.99</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <ul className="space-y-1">
                        <li>• 3,000,000 tokens included</li>
                        <li>• All features + exclusive content</li>
                        <li>• Premium support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Your email address"
                  defaultValue={user.email}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Your email is used for authentication and cannot be changed.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  defaultValue={user.name || ""}
                />
              </div>
              
              <Separator className="my-4" />
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="preferences">
                  <AccordionTrigger>Notification Preferences</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="marketing-emails">Marketing Emails</Label>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">Yes</Button>
                          <Button variant="outline" size="sm">No</Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="transaction-emails">Transaction Emails</Label>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">Yes</Button>
                          <Button variant="outline" size="sm">No</Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="danger">
                  <AccordionTrigger>Danger Zone</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        These actions are permanent and cannot be undone.
                      </p>
                      <Button variant="destructive">Delete Account</Button>
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
      </Tabs>
    </div>
  );
} 