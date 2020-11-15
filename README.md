# RandomMusic
A Discord bot that outputs random links, the list is unique to each Discord user ID.

# Warning
The links and data used by this bot are stored locally on the server running the bot.  
This means DON'T use it for sensitive or important information. 

All data is stored in plain text, in an SQLite3 database.  

# Actions that can be performed
These are the actions that the Random Music bot can perform  
**Clear**  
Clears all songs assigned to a keyword  
Usage: ~clear <keyword>  

**Help**  
Displays all the commands  
Usage: ~help  

**Keywords**  
Displays all keywords you have assigned songs to  
Usage: ~keywords  

**List**  
Displays all songs and IDs assigned to a keyword  
Usage: ~list <keyword>  

**Ping**  
Returns a message to test for connectivity  
Usage: ~ping  

**Play**  
Returns a singular, random, options assigned to a keyword  
There will be options for Rythm and Groovy bot commands for ease of use  
Usage: ~play <keyword>  

**Store**  
Saves a song against a keyword  
Usage: ~store <keyword> <url>  

**Remove**
Removes a song  
Usage: ~remove <id>  
The ID can be obtained from List  
