# Unreal Tournament Server Query Discord Bot
A discord bot that communicates with Unreal Tournament, and Unreal servers and displays their responses into a text channel.

# Requirements
- Node.js v22.12.0 or later

# Installing
- Place the contents of the archive into a folder.
- Open the command prompt in the same directory.
- Run the command **npm install** to install all dependencies.
- Run the command **node install** to install the database.
- Copy **config/config-example.js** to **config/config.js**.
- Edit **config.js**
    - Now set the Discord token **token** to connect the bot to the server. [How to add a Discord bot](https://discordjs.guide/legacy/preparations/app-setup)
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
- **.ip serverID** Displays the specified server's name and address
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


# Config.js
```javascript
export const udpPort = 19999;
export const udpPortAuto = 19998;
//discord token
export const token = "";
// make sure you set this to a role that exists
// Make sure it's not a general role otherwise everyone in that group can use admin commands.
export const defaultAdminRole = "Toilet Brush";
//The character the bot will look for at the start of messages
export const commandPrefix = ".";
export const databaseFile = "./db/data.db";
//how long to wait until giving up and showing server timed out message
export const serverTimeout = 2;
//                          R,G,B
export const embedColor = [255,0,0];
//how often the bot pings(in seconds) all servers to get basic info like player count and map
export const serverInfoPingInterval = 20;
export const failIcon = ":no_entry:";
export const passIcon = ":white_check_mark:";
//how often the bot will update the posts in the auto query channel if enabled.(seconds)
export const autoQueryInterval = 30;
//set to false to make the bot stop posting the not enabled message.
export const bDisplayNotEnabledMessage = true;
//max amount of servers to list in each discord embed
export const maxServersPerBlock = 10;
//Only display admin help commands to admins
export const bSkipAdminHelpToNonAdmins = true;
```

# Screenshots
![alt text](https://i.imgur.com/3f5XkaV.png "test")
![alt text](https://i.imgur.com/vQ5jNMw.png "test")
![alt text](https://i.imgur.com/od3eEHf.png "test")

# Release Log
## 2026-xx-xx
- **Breaking Change:** config file is now a .js file instead of a json file.
- Added bSkipAdminHelpToNonAdmins to config.js, setting this value to false will hide the admin help commands to users that don’t have admin roles.
- Removed the now unsupported clickable like in .ip commands.
- Help commands now use discord embeds.
- Fixed pingAllServers skipping the next servers in the list if there is an error.
- Replaced sqlite3 with nodejs native sqlite support.
- Fetch discord message for autoquery at start of loop instead of on every edit to prevent exceeding discord rate limit.
- ServerResponses now handle their own timeouts instead of ut99query.
- Only edit one autoquery message per second to prevent discord rate limit issues, instead of all at once.

## 2026-05-03
- Upgrade all packages to their latest.
- Removed promise dependency.
- Changed ready event to clientReady(DeprecationWarning)
## 2023-03-31
- Upgrade all packages to their latest. Major change *DiscordJs v14 (~~v12~~)**
- Making repository git compataible
- Added Debug configurations. *Visual Studio Code* users can now run **Debug** [Default: F5]
- Created config example file, located at `/config/config-example.json`
- Moved */api/config.json* to */config/config.json*
- Changed more minor stuff
## 2021-01-06
- Fixed .servers and .active not displaying anything if server list is large and exceeds 1024 characters, now the bot splits the messages into blocks to get around the limit.
- Enabled Discord cache management to reduce RAM usage.
- Fixed memory leaks
- Server ping info starts straight away instead of waiting for first tick.
- Bot no longer deletes non bot messages in the auto query channel.
## 2020-09-23
- Initial