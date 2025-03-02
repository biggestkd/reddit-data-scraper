import requests
import json
import os
import pandas as pd
from datetime import datetime
import praw


# UPDATE: Path to data
DATA_PATH = "/Users/kevindowdy/Library/CloudStorage/OneDrive-EY/Desktop/Software Applications/reddit-data-scraper/r_Battlefield_posts.jsonl"


# Load Reddit data
def load_reddit_data(path_to_data):
    # Open and read the JSONL file
    df = pd.read_json(path_to_data, lines=True)
    print("Data loaded successfully." + str(df.shape) + " rows")
    return df


# Extract only submissions by reddit name
def filter_submissions_by_subreddit(subreddit_name, reddit_data):
    filtered_data = []
    for post in reddit_data:
        if post.get("subreddit") == subreddit_name:
            filtered_data.append(post)
    return filtered_data


# Identify the number of posts per month
def generate_count_posts_per_month(posts):
    monthly_counts = {}
    for post in posts:
        date = datetime.fromtimestamp(post["created_utc"])
        month_year = date.strftime("%Y-%m")
        if month_year not in monthly_counts:
            monthly_counts[month_year] = 0
        monthly_counts[month_year] += 1
    return monthly_counts


# Save data to CSV
def save_to_csv(posts, filename="reddit_posts.csv"):
    """Save Reddit post data to a CSV file."""
    df = pd.DataFrame(posts)
    df.to_csv(filename, index=False)
    print(f"Data saved to {filename}")


def main():
    # Load Reddit data
    all_reddit_data = load_reddit_data(DATA_PATH)

    print(all_reddit_data.head())

    # Change this to any subreddit you want
    # data_by_subreddit = filter_submissions_by_subreddit("Battlefield", all_reddit_data)

    print("Calculating posts per month...")
    monthly_counts = generate_count_posts_per_month(all_reddit_data)

    save_to_csv(monthly_counts, filename="reddit_counts_per_month.csv")


if __name__ == "__main__":
    main()
