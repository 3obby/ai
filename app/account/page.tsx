import { redirect } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

// Add type for transaction
interface UsageTransaction {
  id: string;
  userId: string;
  amount: number;
  createdAt: Date;
}

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
  // Get the session using NextAuth
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { userSubscription, userUsage, transactions } = await getAccountData(session.user.id);

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
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.length > 0 ? (
                    transactions.map((transaction: UsageTransaction, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                        <span className={transaction.amount > 0 ? "text-green-500" : "text-red-500"}>
                          {transaction.amount > 0 ? "+" : ""}{transaction.amount} tokens
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent transactions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="subscription" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your subscription details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {userSubscription ? (
                      userSubscription.subscriptionType === "standard" ? "Standard Plan" : 
                      userSubscription.subscriptionType === "pro" ? "Pro Plan" : 
                      userSubscription.subscriptionType === "ultimate" ? "Ultimate Plan" : 
                      "Free Plan"
                    ) : "Free Plan"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {userSubscription ? (
                      `$${userSubscription.price.toFixed(2)} per month`
                    ) : "No active subscription"}
                  </div>
                </div>
                
                {subscriptionDate && (
                  <div className="space-y-1">
                    <div className="font-semibold">Next Billing Date</div>
                    <div className="text-sm">
                      {subscriptionDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="font-semibold">Included Tokens</div>
                  <div className="text-sm">
                    {userSubscription?.includeBaseTokens?.toLocaleString() || 0} tokens per month
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">
                  Manage Subscription
                </Button>
                {userSubscription && (
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                )}
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Billing Calendar</CardTitle>
                <CardDescription>
                  View your billing cycle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={subscriptionDate || undefined}
                  className="rounded-md border"
                  disabled={(date) => {
                    // Disable all dates except subscription dates
                    return !subscriptionDates.some(
                      (subDate) => 
                        date.getDate() === subDate.getDate() && 
                        date.getMonth() === subDate.getMonth() && 
                        date.getFullYear() === subDate.getFullYear()
                    );
                  }}
                />
              </CardContent>
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
                  
                  <div className="border rounded-md p-4 hover:bg-accent cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Standard Plan</h3>
                        <p className="text-sm text-muted-foreground">For regular users</p>
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
                  </div>
                  
                  <div className="border rounded-md p-4 bg-accent cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Pro Plan</h3>
                        <p className="text-sm text-muted-foreground">For power users</p>
                        <div className="inline-block bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded mt-1">
                          POPULAR
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">$19.99</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <ul className="space-y-1">
                        <li>• 3,000,000 tokens included</li>
                        <li>• All features + advanced tools</li>
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
                  defaultValue={session.user.email || ""}
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
                  defaultValue={session.user.name || ""}
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