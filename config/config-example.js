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
