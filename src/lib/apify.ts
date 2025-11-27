import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
});

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  author: {
    userName: string;
    name: string;
    profilePicture: string;
  };
}

// 특정 유저의 최근 트윗 가져오기
export async function fetchUserTweets(
  twitterHandle: string,
  maxTweets: number = 10
): Promise<Tweet[]> {
  try {
    const run = await apifyClient.actor('apidojo/tweet-scraper').call({
      startUrls: [{ url: `https://twitter.com/${twitterHandle}` }],
      maxTweets,
      addUserInfo: true,
      scrapeTweetReplies: false,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    return items.map((item) => ({
      id: item.id as string,
      text: item.text as string,
      createdAt: item.createdAt as string,
      url: item.url as string,
      author: {
        userName: (item.author as { userName: string }).userName,
        name: (item.author as { name: string }).name,
        profilePicture: (item.author as { profilePicture: string }).profilePicture,
      },
    }));
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }
}

// 여러 유저의 트윗을 한번에 가져오기
export async function fetchMultipleUsersTweets(
  handles: string[],
  maxTweetsPerUser: number = 5
): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];

  for (const handle of handles) {
    const tweets = await fetchUserTweets(handle, maxTweetsPerUser);
    allTweets.push(...tweets);
  }

  return allTweets;
}
