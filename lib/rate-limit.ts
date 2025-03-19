import prismadb from "./prismadb";

export async function rateLimit(userId: string) {
  // Get today's date (reset at midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get user's subscription
  const userSubscription = await prismadb.userSubscription.findUnique({
    where: { userId }
  });

  // If no subscription record exists, user is on free tier
  // If subscription exists, check the price tier
  let dailyLimit = 15; // Default free tier
  if (userSubscription?.price) {
    switch (userSubscription.price) {
      case 999:
        dailyLimit = 50;
        break;
      case 2999:
        dailyLimit = 100;
        break;
      case 4999:
        return { success: true }; // Unlimited for ultimate tier
    }
  }

  // Clean up old daily counts for this user (older than today)
  await prismadb.dailyMessageCount.deleteMany({
    where: {
      userId,
      date: {
        lt: today
      }
    }
  });

  // Get or create today's message count
  let dailyCount = await prismadb.dailyMessageCount.findUnique({
    where: {
      userId_date: {
        userId,
        date: today
      }
    }
  });

  if (!dailyCount) {
    dailyCount = await prismadb.dailyMessageCount.create({
      data: {
        userId,
        date: today,
        count: 0
      }
    });
  }

  // Check if user has exceeded their daily limit
  if (dailyCount.count >= dailyLimit) {
    return {
      success: false,
      limit: dailyLimit,
      remaining: 0,
      reset: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next midnight
    };
  }

  // Increment the count
  await prismadb.dailyMessageCount.update({
    where: {
      id: dailyCount.id
    },
    data: {
      count: dailyCount.count + 1
    }
  });

  return {
    success: true,
    limit: dailyLimit,
    remaining: dailyLimit - (dailyCount.count + 1),
    reset: new Date(today.getTime() + 24 * 60 * 60 * 1000)
  };
}

export async function getUserMessageLimit(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userSubscription = await prismadb.userSubscription.findUnique({
    where: { userId }
  });

  // If user has ultimate subscription, return null to indicate unlimited messages
  if (userSubscription?.price === 4999) {
    return null;
  }

  // Determine daily limit based on subscription
  let dailyLimit = 15; // Default free tier
  if (userSubscription?.price) {
    switch (userSubscription.price) {
      case 999:
        dailyLimit = 50;
        break;
      case 2999:
        dailyLimit = 100;
        break;
    }
  }

  // Get today's message count
  const dailyCount = await prismadb.dailyMessageCount.findUnique({
    where: {
      userId_date: {
        userId,
        date: today
      }
    }
  });

  return {
    limit: dailyLimit,
    remaining: dailyLimit - (dailyCount?.count ?? 0),
    used: dailyCount?.count ?? 0,
    reset: new Date(today.getTime() + 24 * 60 * 60 * 1000)
  };
}
