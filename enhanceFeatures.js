// enhancedFeatures.js - Additional bot features
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Export functions to be used in main index.js
module.exports = {
  // Register slash commands with Discord API
  async registerCommands(client) {
    const commands = [
      new SlashCommandBuilder()
        .setName('addexpense')
        .setDescription('Add a new expense')
        .addNumberOption(option => 
          option.setName('amount')
            .setDescription('Amount spent')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('description')
            .setDescription('Description of expense')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('category')
            .setDescription('Expense category')
            .setRequired(false)
            .addChoices(
              { name: 'Food', value: 'food' },
              { name: 'Transport', value: 'transport' },
              { name: 'Entertainment', value: 'entertainment' },
              { name: 'Shopping', value: 'shopping' },
              { name: 'Utilities', value: 'utilities' },
              { name: 'Health', value: 'health' },
              { name: 'Travel', value: 'travel' },
              { name: 'Other', value: 'other' }
            )),
      new SlashCommandBuilder()
        .setName('summary')
        .setDescription('Get expense summary')
        .addStringOption(option => 
          option.setName('period')
            .setDescription('Time period')
            .setRequired(false)
            .addChoices(
              { name: 'Today', value: 'today' },
              { name: 'This Week', value: 'week' },
              { name: 'This Month', value: 'month' },
              { name: 'All Time', value: 'all' }
            )),
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information about the expense tracker bot'),
    ].map(command => command.toJSON());

    try {
      const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
      
      console.log('Started refreshing application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands },
      );
      
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error registering slash commands:', error);
    }
  },

  // Generate expense summary from Google Sheet
  async generateSummary(sheetsAPI, sheetId, period = 'all') {
    try {
      // Get all expenses from sheet
      const response = await sheetsAPI.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:D', // Skip header row
      });
      
      const rows = response.data.values || [];
      if (rows.length === 0) {
        return { total: 0, byCategory: {}, message: "No expenses recorded yet." };
      }

      // Filter by period
      const now = new Date();
      const filteredRows = rows.filter(row => {
        const expenseDate = new Date(row[0]);
        
        switch (period) {
          case 'today':
            return expenseDate.toDateString() === now.toDateString();
          case 'week': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            return expenseDate >= weekStart;
          }
          case 'month': {
            return expenseDate.getMonth() === now.getMonth() && 
                  expenseDate.getFullYear() === now.getFullYear();
          }
          default:
            return true; // All time
        }
      });

      // Calculate totals
      let total = 0;
      const byCategory = {};
      
      filteredRows.forEach(row => {
        const amount = parseFloat(row[1]);
        const category = row[2];
        
        total += amount;
        byCategory[category] = (byCategory[category] || 0) + amount;
      });

      // Create period label
      let periodLabel;
      switch (period) {
        case 'today': periodLabel = 'Today'; break;
        case 'week': periodLabel = 'This Week'; break;
        case 'month': periodLabel = 'This Month'; break;
        default: periodLabel = 'All Time';
      }

      // Format response message
      let message = `📊 **${periodLabel} Expense Summary**\n\n`;
      message += `**Total:** $${total.toFixed(2)}\n\n`;
      message += '**By Category:**\n';
      
      Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1]) // Sort by amount descending
        .forEach(([category, amount]) => {
          const percentage = ((amount / total) * 100).toFixed(1);
          message += `- ${category}: $${amount.toFixed(2)} (${percentage}%)\n`;
        });

      return { total, byCategory, message };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  },

  // Generate help message
  generateHelpMessage() {
    return `
**🤖 Expense Tracker Bot Help**

This bot helps you track your expenses in a Google Sheet. Here's how to use it:

**Direct Messages:**
Simply send your expense in any of these formats:
- \`$50 groceries\`
- \`spent $30 on lunch\`
- \`45.50 taxi\`
- \`food $25.99\`

**In Server Channels:**
Use the \`!expense\` command followed by your expense:
- \`!expense $50 groceries\`

**Slash Commands:**
- \`/addexpense\` - Add a new expense with optional category
- \`/summary\` - View expense summary for different time periods
- \`/help\` - Show this help message

The bot will automatically categorize your expenses when possible!
`;
  }
};
