# Discord Expense Tracker Bot

A Discord bot that tracks expenses in Google Sheets. Send expense messages in Discord, and they'll be automatically saved to your Google Sheet!

## Features

- **Multiple Input Formats**: Supports various expense input formats
  - `$50 groceries`
  - `spent $30 on lunch`
  - `45.50 taxi`
  - `food $25.99`

- **Automatic Categorization**: Bot intelligently categorizes expenses based on description
- **DM & Channel Support**: Use in direct messages or with `!expense` command in channels
- **Slash Commands**: Modern Discord slash commands for better user experience
- **Expense Summaries**: View summaries by day, week, month, or all time
- **Detailed Responses**: Clear confirmations and error handling

## Setup Instructions

### Prerequisites

- Node.js v16 or newer
- A Discord account with a server where you have admin permissions
- A Google account

### Step 1: Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" tab and create a bot
4. Enable "Message Content Intent", "Server Members Intent", and "Presence Intent"
5. Copy your bot token for later use
6. Use the OAuth2 URL Generator to create an invite link with the following permissions:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Read Messages/View Channels`
7. Invite the bot to your server using the generated link

### Step 2: Google Sheets Setup

1. Create a new Google Sheet
2. Set up headers in row 1: `Date`, `Amount`, `Category`, `Description`
3. Go to [Google Cloud Console](https://console.cloud.google.com/)
4. Create a new project
5. Enable the Google Sheets API
6. Create a Service Account with appropriate permissions
7. Download the JSON key file
8. Rename the key file to `credentials.json` and place it in your project folder
9. Share your Google Sheet with the service account email (with Editor access)
10. Copy your Spreadsheet ID from the URL

### Step 3: Bot Installation

1. Clone this repository or download the code
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Discord token and Google Sheet ID:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   GOOGLE_SHEET_ID=your_spreadsheet_id_here
   ```
4. Start the bot:
   ```bash
   npm start
   ```

## Usage

### Direct Messages
Simply send your expense directly to the bot:
```
$50 groceries
```

### In Server Channels
Use the `!expense` command:
```
!expense $50 groceries
```

### Slash Commands
- `/addexpense amount:50 description:groceries category:food` - Add an expense with optional category
- `/summary period:week` - Get a summary of expenses (today/week/month/all)
- `/help` - Display help information

## Demo

[View Demo Video](https://youtu.be/your-demo-video-link)

## License

MIT License