"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { UserUsage } from "@prisma/client";
import { Companion } from "@prisma/client";
import { Input } from "@/components/ui/input";

export default function AdminDashboard() {
  const [originalBots, setOriginalBots] = useState<Companion[]>([]);
  const [originalUsers, setOriginalUsers] = useState<UserUsage[]>([]);
  const [displayBots, setDisplayBots] = useState<Companion[]>([]);
  const [displayUsers, setDisplayUsers] = useState<UserUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortType, setSortType] = useState<"none" | "highXP" | "lowXP">("none");
  const [userSortType, setUserSortType] = useState<
    "none" | "highSpend" | "lowSpend"
  >("none");
  const [delayUpdateId, setDelayUpdateId] = useState<string | null>(null);
  const [newDelay, setNewDelay] = useState<number>(0);
  const [chatRateId, setChatRateId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [sendMultipleMessages, setSendMultipleMessages] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if admin is authenticated
    const isAuthenticated = localStorage.getItem("isAdminAuthenticated");
    if (!isAuthenticated) {
      router.push("/admin/login");
      return;
    }

    // Fetch data
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [botsRes, usersRes] = await Promise.all([
          fetch("/api/admin/bots"),
          fetch("/api/admin/users"),
        ]);

        if (!botsRes.ok || !usersRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const botsData = await botsRes.json();
        const usersData = await usersRes.json();

        console.log("Bots data:", botsData); // Debug log
        console.log("Users data:", usersData); // Debug log

        setOriginalBots(botsData);
        setOriginalUsers(usersData);
        setDisplayBots(botsData);
        setDisplayUsers(usersData);
      } catch (e) {
        console.error("Error fetching data:", e);
        setError("Error fetching data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("isAdminAuthenticated");
    router.push("/admin/login");
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    await fetch(`/api/admin/bots/${deleteId}`, {
      method: "DELETE",
    });
    setDeleteId(null);
    window.location.reload();
  };

  const handleBotSort = (type: "highXP" | "lowXP") => {
    const sorted = [...originalBots].sort((a, b) => 
      type === "highXP" ? b.xpEarned - a.xpEarned : a.xpEarned - b.xpEarned
    );
    setDisplayBots(sorted);
    setSortType(type);
  };

  const handleUserSort = (type: "highSpend" | "lowSpend") => {
    const sorted = [...originalUsers].sort((a, b) => 
      type === "highSpend" 
        ? b.totalMoneySpent - a.totalMoneySpent 
        : a.totalMoneySpent - b.totalMoneySpent
    );
    setDisplayUsers(sorted);
    setUserSortType(type);
  };

  const handleDelayUpdate = async () => {
    if (!delayUpdateId) return;

    try {
      const response = await fetch(`/api/admin/bots/${delayUpdateId}/delay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageDelay: newDelay }),
      });

      if (!response.ok) throw new Error('Failed to update delay');

      setDelayUpdateId(null);
      window.location.reload();
    } catch (error) {
      console.error('Error updating delay:', error);
    }
  };

  const handleChatRateUpdate = async () => {
    console.log("chatRateId", chatRateId);
    if (!chatRateId) return;

    setIsApplying(true);
    try {
      const response = await fetch(`/api/admin/bots/${chatRateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sendMultipleMessages }),
      });

      if (!response.ok) throw new Error('Failed to update chat rate');

      setChatRateId(null);
      window.location.reload();
    } catch (error) {
      console.error('Error updating chat rate:', error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="p-8 bg-background min-h-[calc(100vh-80px)]">
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Bot"
        description="Are you sure you want to delete this bot? This action cannot be undone."
      />
      <Modal
        isOpen={!!delayUpdateId}
        onClose={() => setDelayUpdateId(null)}
        onConfirm={handleDelayUpdate}
        title="Update Message Delay"
        description="Set the delay (in seconds) before the bot responds to messages."
        isLoading={isLoading}
      >
        <div className="mt-4">
          <Input
            type="number"
            min="0"
            value={newDelay}
            onChange={(e) => setNewDelay(parseInt(e.target.value) || 0)}
            placeholder="Delay in seconds"
            disabled={isLoading}
          />
        </div>
      </Modal>
      <Modal  
        isOpen={!!chatRateId}
        onClose={() => setChatRateId(null)}
        onConfirm={handleChatRateUpdate}
        title="Adjust Chat Rate"
        description="Toggle to adjust the chat rate."
        isLoading={isApplying}
      >
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={sendMultipleMessages}
              onChange={(e) => setSendMultipleMessages(e.target.checked)}
              disabled={isApplying}
            />
            <span className="ml-2">Send Multiple Messages</span>
          </label>
        </div>
      </Modal>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <Tabs defaultValue="bots" className="w-full min-h-[600px]">
          <TabsList>
            <TabsTrigger value="bots">Companions/Bots</TabsTrigger>
            <TabsTrigger value="users">Users Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="bots">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => handleBotSort("highXP")}
                className={`px-3 py-1 rounded-md text-sm hover:opacity-90 transition ${
                  sortType === "highXP"
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Sort by Highest XP
              </button>
              <button
                onClick={() => handleBotSort("lowXP")}
                className={`px-3 py-1 rounded-md text-sm hover:opacity-90 transition ${
                  sortType === "lowXP"
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Sort by Lowest XP
              </button>
            </div>
            <DataTable
              columns={[
                { accessorKey: "name", header: "Name", sortable: true },
                { accessorKey: "userName", header: "Creator", sortable: true },
                {
                  accessorKey: "private",
                  header: "Private",
                  cell: ({ row }) => {
                    const bot = row.original as unknown as Companion;
                    return (
                      <span>
                        {bot.private ? "✔️" : "❌"}
                      </span>
                    );
                  },
                },
                {
                  accessorKey: "xpEarned",
                  header: "Tokens Burned",
                  sortable: true,
                  cell: ({ row }) => {
                    const bot = row.original as unknown as Companion;
                    return (
                      <Badge variant="secondary">
                        {bot.xpEarned.toLocaleString()} tokens
                      </Badge>
                    );
                  },
                },
                {
                  accessorKey: "createdAt",
                  header: "Created",
                  cell: ({ row }) =>
                    new Date(row.original.createdAt).toLocaleDateString(),
                },
                {
                  accessorKey: "messageDelay",
                  header: "Message Delay",
                  cell: ({ row }) => {
                    const bot = row.original as unknown as Companion;
                    return (
                      <Badge variant="secondary">
                        {bot.messageDelay}s
                      </Badge>
                    );
                  },
                },
                {
                  accessorKey: "sendMultipleMessages",
                  header: "Multiple Messages",
                  cell: ({ row }) => {
                    const bot = row.original as unknown as Companion;
                    return (
                      <span>
                        {bot.sendMultipleMessages ? "✔️" : "❌"}
                      </span>
                    );
                  },
                },
                {
                  accessorKey: "actions",
                  header: "Actions",
                  cell: ({ row }) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          router.push(`/companion/${row.original.id}`)
                        }
                        className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm hover:opacity-90 transition"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => {
                          setNewDelay(row.original.messageDelay);
                          setDelayUpdateId(row.original.id);
                        }}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm hover:opacity-90 transition"
                      >
                        Set Delay
                      </button>
                      <button
                        onClick={() => setDeleteId(row.original.id)}
                        className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm hover:opacity-90 transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setChatRateId(row.original.id);
                          setSendMultipleMessages(row.original.sendMultipleMessages);
                        }}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm hover:opacity-90 transition"
                      >
                        Multiple Messages
                      </button>
                    </div>
                  ),
                },
              ]}
              data={displayBots.map(bot => ({
                ...bot,
                createdAt: bot.createdAt.toString(),
                updatedAt: bot.updatedAt.toString()
              }))}
              pageSize={10}
            />
          </TabsContent>

          <TabsContent value="users">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => handleUserSort("highSpend")}
                className={`px-3 py-1 rounded-md text-sm hover:opacity-90 transition ${
                  userSortType === "highSpend"
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Sort by Highest Spending
              </button>
              <button
                onClick={() => handleUserSort("lowSpend")}
                className={`px-3 py-1 rounded-md text-sm hover:opacity-90 transition ${
                  userSortType === "lowSpend"
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                Sort by Lowest Spending
              </button>
            </div>
            <DataTable
              columns={[
                { accessorKey: "email", header: "Email", sortable: true },
                {
                  accessorKey: "totalMoneySpent",
                  header: "Total Money Spent",
                  sortable: true,
                  cell: ({ row }) => {
                    const user = row.original as unknown as UserUsage;
                    return `$${user.totalMoneySpent.toFixed(2)}`;
                  },
                },
                {
                  accessorKey: "totalSpent",
                  header: "Total Spent",
                  sortable: true,
                  cell: ({ row }) => {
                    const user = row.original as unknown as UserUsage;
                    return `${user.totalSpent} XP`;
                  },
                },
                {
                  accessorKey: "availableTokens",
                  header: "Available Tokens",
                  sortable: true,
                  cell: ({ row }) => {
                    const user = row.original as unknown as UserUsage;
                    return `${user.availableTokens.toLocaleString()} XP`;
                  },
                },
                {
                  accessorKey: "createdAt",
                  header: "Join Date",
                  cell: ({ row }) =>
                    new Date(row.original.createdAt).toLocaleDateString(),
                },
              ]}
              data={displayUsers.map(user => ({
                ...user,
                createdAt: user.createdAt.toString(),
                updatedAt: user.updatedAt.toString()
              }))}
              pageSize={10}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
