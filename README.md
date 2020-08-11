# Unreal Tournament Server Query Discord Bot
 A discord bot that communicates with Unreal Tournament servers and displays their responses into a text channel.


# Requirments
- Node.js Version 12 or later


# Config
```javascript
{
    "udpPort": "19999", //port for standard queries
    "udpPortAuto": "19998", //port for auto queries
    "token": "NzIwOTU0OTkyOTA2OTkzNzI2.Xuzm5Q.0IYiOCUNUX6hUAubp4YUltQuje0", //discord bot token
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
![alt text](https://i.imgur.com/AQPDJjA.png "test")

![alt text](https://i.imgur.com/3f5XkaV.png "test")

![alt text](https://i.imgur.com/vQ5jNMw.png "test")

![alt text](https://i.imgur.com/od3eEHf.png "test")