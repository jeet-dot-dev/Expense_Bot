// index.js - Main bot file
require('dotenv').config();
const { Client, GatewayIntentBits, Events, InteractionType } = require('discord.js');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const path = require('path');
const { registerCommands, generateSummary, generateHelpMessage } = require('./enhanceFeatures');

// Initialize Discord client with proper intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Google Sheets Configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Initialize Google Sheets API
async function initSheetsAPI() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: SCOPES,
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
}

let sheetsAPI;

// Expense regex patterns - supports multiple formats
const expensePatterns = [
  // Format: $50 groceries
  /^\$?(\d+(?:\.\d+)?)\s+(.+)$/i,
  
  // Format: spent $30 on lunch
  /spent\s+\$?(\d+(?:\.\d+)?)\s+(?:on|for)\s+(.+)/i,
  
  // Format: 45.50 taxi
  /^(\d+(?:\.\d+)?)\s+(.+)$/i,
  
  // Format: food $25.99
  /^(.+)\s+\$?(\d+(?:\.\d+)?)$/i
];

// Parse expense message
function parseExpense(content) {
  for (const pattern of expensePatterns) {
    const match = content.match(pattern);
    if (match) {
      // Different patterns have amount and description in different capture groups
      if (pattern === expensePatterns[3]) {
        // Format: category $amount
        return {
          amount: parseFloat(match[2]),
          description: match[1].trim()
        };
      } else {
        // Other formats: amount description
        return {
          amount: parseFloat(match[1]),
          description: match[2].trim()
        };
      }
    }
  }
  return null;
}

// Extract category from description (optional)
function extractCategory(description) {
  // Common expense categories
  const categories = ["food", "groceries", "transport", "rent", "utilities", "entertainment", "shopping", "travel", "health", "other"];
  
  const lowerDesc = description.toLowerCase();
  
  // Check if any category is mentioned in the description
  for (const category of categories) {
    if (lowerDesc.includes(category)) {
      return category;
    }
  }
  
  // If no category found in description, try to intelligently categorize
  if (lowerDesc.includes("restaurant") || lowerDesc.includes("lunch") || lowerDesc.includes("dinner") || lowerDesc.includes("breakfast")) {
    return "food";
  } else if (lowerDesc.includes("uber") || lowerDesc.includes("taxi") || lowerDesc.includes("bus") || lowerDesc.includes("train")) {
    return "transport";
  } else if (lowerDesc.includes("movie") || lowerDesc.includes("game") || lowerDesc.includes("netflix")) {
    return "entertainment";
  }
  
  return "other";
}

// Add expense to Google Sheet
async function addExpenseToSheet(expense) {
  try {
    const date = new Date().toLocaleDateString();
    const category = extractCategory(expense.description);
    
    // Prepare row data
    const values = [[date, expense.amount, category, expense.description]];
    
    // Append to sheet
    const response = await sheetsAPI.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:D', // Assuming headers are in row 1
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding expense to sheet:', error);
    throw error;
  }
}

// Handle incoming Discord messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  try {
    // Check if message is in DM or starts with !expense
    const isDM = message.channel.type === 'DM';
    const isCommand = message.content.startsWith('!expense');
    
    if (isDM || isCommand) {
      let content = message.content;
      
      // If it's a command, remove the command prefix
      if (isCommand) {
        content = content.substring('!expense'.length).trim();
      }
      
      // Parse expense from message
      const expense = parseExpense(content);
      
      if (expense) {
        // Add expense to Google Sheet
        await addExpenseToSheet(expense);
        
        // Confirm to user
        await message.reply(`✅ Expense recorded: $${expense.amount} for ${expense.description}`);
      } else {
        // If message doesn't match expense pattern
        await message.reply("I couldn't understand that expense. Please use formats like:\n- `$50 groceries`\n- `spent $30 on lunch`\n- `45.50 taxi`\n- `food $25.99`");
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await message.reply('Sorry, there was an error processing your expense. Please try again later.');
  }
});

// Slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    switch (commandName) {
      case 'addexpense': {
        const amount = interaction.options.getNumber('amount');
        const description = interaction.options.getString('description');
        let category = interaction.options.getString('category');
        
        if (!category) {
          category = extractCategory(description);
        }
        
        const date = new Date().toLocaleDateString();
        
        // Add to sheet
        await sheetsAPI.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: 'Sheet1!A:D',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [[date, amount, category, description]] },
        });
        
        await interaction.reply({
          content: `✅ Expense recorded: ${amount} for ${description} (Category: ${category})`,
          ephemeral: true
        });
        break;
      }
      
      case 'summary': {
        await interaction.deferReply({ ephemeral: true });
        
        const period = interaction.options.getString('period') || 'all';
        const summary = await generateSummary(sheetsAPI, SHEET_ID, period);
        
        await interaction.editReply(summary.message);
        break;
      }
      
      case 'help': {
        await interaction.reply({
          content: generateHelpMessage(),
          ephemeral: true
        });
        break;
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('There was an error processing your request.');
    } else {
      await interaction.reply({
        content: 'There was an error processing your request.',
        ephemeral: true
      });
    }
  }
});

// Bot ready event
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  try {
    // Initialize Google Sheets API
    sheetsAPI = await initSheetsAPI();
    console.log('Google Sheets API initialized successfully!');
    
    // Register slash commands
    await registerCommands(client);
  } catch (error) {
    console.error('Failed during initialization:', error);
    process.exit(1);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);