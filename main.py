import requests
import json
import os
import pandas as pd
from datetime import datetime
import praw

# Reddit API Authentication (Read-Only Mode)
reddit_read_only = praw.Reddit(
    client_id="-ww1acs3VYKuE9N0xF2kdw",
    client_secret="b5aE_g02RAef0GVI5Lb6lW5cxH1HWQ",
    user_agent="android:com.example.myredditapp:v1.2.3 (by u/kdowdy)"
)

reddit_read_only.read_only = True


subreddit = reddit_read_only.subreddit("Battlefield")

# Scraping the top posts of all time
posts = reddit_read_only.subreddit("Battlefield").search("", time_filter="all", syntax="plain")


# posts_dict = {"Title": [], "Post Text": [],
#               "ID": [], "Score": [], "Upvote Ratio": [],
#               "Total Comments": [],"Created On":[], "Post URL": [],
#               "Original Content": []
#               }
#
start_date = '01-01-20 00:00:00'
# start_date = datetime.strptime(start_date, '%d-%m-%y %H:%M:%S').timestamp()
#
for n, post in enumerate(posts, start=1):
    formatted_time = datetime.utcfromtimestamp(post.created_utc).strftime('%Y-%m-%d %H:%M:%S')

    print(f"Post #{n}:")
    print(f"Created At: {formatted_time}")  # Formatted Date-Time
    print(f"Title: {post.title}\n")  # Optionally print the title
    # Date of each posts' creation'

    # date = post.created_utc
    # if date > start_date:
    #     # Title of each post
    #     posts_dict["Title"].append(post.title)
    #
    #     # Text inside a post
    #     posts_dict["Post Text"].append(post.selftext)
    #
    #     # Unique ID of each post
    #     posts_dict["ID"].append(post.id)
    #
    #     # The score of a post
    #     posts_dict["Score"].append(post.score)
    #
    #     # Upvote Ratio of a post
    #     posts_dict["Upvote Ratio"].append(post.upvote_ratio)
    #
    #     # Total number of comments inside the post
    #     posts_dict["Total Comments"].append(post.num_comments)
    #
    #     # Date the post was Created
    #     posts_dict["Created On"].append(post.created_utc)
    #
    #     # URL of each post
    #     posts_dict["Post URL"].append(post.url)
    #
    #     # Flair of each post
    #     posts_dict["Original Content"].append(post.is_original_content)
#
# # Saving the data in a pandas dataframe
# all_posts = pd.DataFrame(posts_dict)
# all_posts['Created On'] = pd.to_datetime(all_posts['Created On'],  unit='s')
# all_posts
#
# def fetch_reddit_posts(subreddit, limit=1000):
#     """Fetch hot posts from a given subreddit."""
#     url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
#     headers = {"User-Agent": "Mozilla/5.0"}
#     response = requests.get(url, headers=headers)
#
#     if response.status_code == 200:
#         data = response.json()
#         posts = [
#             {
#                 "title": post["data"]["title"],
#                 "score": post["data"]["score"],
#                 "url": post["data"]["url"],
#                 "created_utc": datetime.utcfromtimestamp(post["data"]["created_utc"]).strftime('%Y-%m-%d %H:%M:%S')
#             }
#             for post in data["data"]["children"]
#         ]
#         return posts
#     else:
#         print(f"Error: Unable to fetch data, Status Code: {response.status_code}")
#         return []
#
# def save_to_csv(posts, filename="reddit_posts.csv"):
#     """Save Reddit post data to a CSV file."""
#     df = pd.DataFrame(posts)
#     df.to_csv(filename, index=False)
#     print(f"Data saved to {filename}")
#
# def main():
#     subreddit = "Battlefield"  # Change this to any subreddit you want
#     posts = fetch_reddit_posts(subreddit)
#
#     if posts:
#         save_to_csv(posts)
#         print("Reddit post data retrieved and saved successfully!")
#     else:
#         print("No data retrieved.")
#
# if __name__ == "__main__":
#     main()
