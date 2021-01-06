# Unreal Tournament Server Query Discord Bot
A discord bot that communicates with Unreal Tournament, and Unreal servers and displays their responses into a text channel.


# Update 6th January 2021
- Fixed .servers and .active not displaying anything if server list is large and exceeds 1024 characters, now the bot splits the messages into blocks to get around the limit.
- Enabled Discord cache management to reduce RAM usage.
- Server ping info starts straight away instead of waiting for first tick.
- Bot no longer deletes non bot messages in the auto query channel.

# Unreal support added on the 23rd September 2020

# Requirments
- Node.js Version 12 or later

# Installing
- Place the contents of the archive into a folder.
- Open the command prompt in the same directory.
- Run the command **npm install** to install all dependencies.
- Run the command **node install** to install the database.
- Now open the file **/api/config.json**.
- Now set the Discord token **token** to connect the bot to the server.[How to add a Discord bot](https://discordpy.readthedocs.io/en/latest/discord.html)
- Now set **defaultAdminRole** to a role name that is in your Discord server, do not add a common role name as it gives those users access to admin commands.
- Install process is now completed.

# Running the bot
- In the installed directory open the command prompt.
- Run the command **node app** to start the bot.
- You should now see the bot in your server. If you do not see it, makes sure your Discord Bot Token is correct.

# Commands
## User Commands 
- **.servers** Lists all servers added to the database.
- **.active** Lists all servers added to the database that have at least one player.
- **.q ip:port** Query a Unreal Tournament server, if no port is specified 7777 is used. Domain names can also be used instead of an ip.
- **.q serverID** Query a Unreal Tournament server by just using the server's id instead of it's ip and port. Use the .servers command to find a server's id.
- **.ip serverID** Displays the specified server's name with a clickable link.
- **.players serverID** Displays extended information about players on the server.
- **.players ip:port** Displays extended information about players on the server, domain address also work, if no port specified 7777 is used.
- **.extended serverID** Displays extended information about the server.
- **.help** Shows this command.

## Admin Commands 
- **.allowchannel** Enables the bot to be used in the current channel.
- **.blockchannel** Disables the bot in the current channel.
- **.listchannels** Displays a list of channels the bot can be used in.
- **.allowrole role** Allows users with specified role to use admin bot commands.
- **.removerole role** Stops users with specified role being able to use admin bot commands.
- **.listroles** Displays a list of roles that can use the bots admin commands.
- **.addserver alias ip:port** Adds the specified server details into the database.
- **.removeserver serverID** Removes the specified server from the database.
- **.setauto** Sets the current channel as the auto query and display channel where the posts are updated in regualr intervals with the latest information from the server. **Do not enable in an existing channel, non autoquery messages are deleted by default.**
- **.stopauto** Disables autoquery channel from updating.
- **.editserver id type value** Edit selected server's value type. Types:(alias,ip,country,port)


# Config
```javascript
{
    "udpPort": "19999", //port for standard queries
    "udpPortAuto": "19998", //port for auto queries
    "token": "", //discord bot token
    "defaultAdminRole": "Toilet Brush", //super admin role
    "commandPrefix": ".", //what character you want the bot to respond to
    "databaseFile": "./db/data.db",
    "serverTimeout": 2, //how many seconds until the bot will display a server timeout
    "embedColor": "#ff0000", //the border color of discord embeds
    "serverInfoPingInterval": 5, //how often you want the bot to ping all servers for basic info(for .servers and .active)
    "failIcon": ":no_entry:",
    "passIcon": ":white_check_mark:",
    "autoQueryInterval": 30, //how often you want the bot to update autoquery posts in the auto query channel
    "bAutoQueryMessagesOnly": true, //delete any message in the auto query channel that's not a server query
    "bDisplayNotEnabledMessage": true //Change to false if you don't want the bot to post 'The bot is not enabled in this channel'
}
```

# Screenshots

![alt text](https://i.imgur.com/3f5XkaV.png "test")

![alt text](https://i.imgur.com/vQ5jNMw.png "test")

![alt text](https://i.imgur.com/od3eEHf.png "test")

