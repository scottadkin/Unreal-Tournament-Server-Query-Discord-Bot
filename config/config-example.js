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
export const failIcon = ":no_entry:";
export const passIcon = ":white_check_mark:";
//how often the bot will update the posts in the auto query channel if enabled.(seconds)
//this will be the minimum amount of time between an edit loop, 
//if you have many servers in your list the edits to existing posts may take longer and will skip a ping cycle until all post are edited
export const autoQueryInterval = 30;
//set to false to make the bot stop posting the not enabled message.
export const bDisplayNotEnabledMessage = true;
//Only display admin help commands to admins
export const bSkipAdminHelpToNonAdmins = true;
