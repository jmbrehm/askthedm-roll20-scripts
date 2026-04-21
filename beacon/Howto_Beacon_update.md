 How to Update Mod Scripts (API) for D&D 2024/Beacon
March 19, 2026 at 11:04 AM

Given the differences between the legacy sheet infrastructure & Beacon sheet infrastructure not all existing Mod Scripts are compatible out of the box. Luckily, we've pulled together the below documentation to help you to upgrade your scripts so they can work with Beacon sheets (e.g. D&D 2024). We've also gone in and updated the top scripts so there are examples available and scripts ready to use with your games! Scripts that have been updated:

    GroupInitiative
    TokenMod
    GroupCheck
    StatusInfo

For many scripts, updating them to be compatible with the 2024 sheet boils down to changing two things: how you get and set attributes and how you parse roll templates/chat messages. This document will walk you through both, as well as troubleshoot some common problems so you can update any script to be compatible with both the D&D2014 sheet and the D&D2024 sheet.

When your script is updated in this way, in games with Beacon sheets such as D&D2024, the GMs will need to use the Experimental API server to use all the latest features. The Experimental server has all the same functionality as the Default server, so it shouldn’t break any other scripts to make this switch, but you may want to call it out in the description of the script so your users know. If there is no Beacon sheet, the Default server will still work with these functions, as it will fall back to the legacy getting and setting attribute functions.
Updating Setting/Getting

The major change between accessing data for the 2014 sheet and the 2024 sheet, code-wise, is how you get and set attributes. There’s now a new set of asynchronous functions called getSheetItem and setSheetItem. Here’s an example of using the new functions:

 

const getDeathSaveSuccess = async (id) => {
  const firstSuccess = await getSheetItem(characterId, "deathsave_succ1");
  log(`First success is ${firstSuccess}`)
}

 

If you’d like to get the maximum value of an attribute (if a maximum exists), you can pass in the property max, like getSheetItem(characterId, "deathsave_succ1", “max”);. 

You’ll notice in the code above, getDeathSaveSuccess is marked as async. Every function that uses getSheetItem will either have to use this async/await pattern, or use promises. Here’s the same function above, rewritten as a promise:

 

const getDeathSaveSuccess = (id) => {
  getSheetItem(characterId, "deathsave_succ1").then((firstSuccess) => {
    log(`First success is ${firstSuccess}`);
  });
}

 

If you’re trying to get multiple values at once or one after the other and the rest of your code relies on having that data, you can either await each value individually, or use Promise.all to resolve every promise at once and get the final value. If you don’t do this, then the value you’ll get back will just be a pending promise, not the actual value of the attribute.

 

const getSuccesses = (id) => {
  const promises = [];
  promises.push(getSheetItem(characterId, "deathsave_succ1"));
  promises.push(getSheetItem(characterId, "deathsave_succ2"));
  promises.push(getSheetItem(characterId, "deathsave_succ3"));
  Promise.all(promises).then((results) => {
    log(`First success is ${results[0]}, second success is ${results[1]}, third success is ${results[2]}`);
  }
}

 

Asynchronous code can have a lot of ramifications on the way you write a script, depending on how you’ve structured it. For example, if there’s a script currently using getAttrByName inside a replace or map, it will need to be broken out into a more async-friendly loop, because those functions will not wait for a value to come back before continuing.

Let’s rewind to when I wrote “If you’re trying to get multiple values at once or one after the other and the rest of your code relies on having that data”. The rest of your code doesn’t always rely on having that value. Most of the time, it will rely on that value if you’re using getSheetItem, because you’re going to want to do something with whatever attribute you’re getting. However, oftentimes for the reverse, setSheetItem, you don’t need to wait on it to finish at all. In that case, you can ignore the ramifications of these functions being asynchronous, and just call them as normal. The attribute will update in the background while your script moves on.

 

The setSheetItem function works the same as getSheetItem, but includes an extra argument to determine what to set the attribute to.

setSheetItem(characterId, "hp", 10);
setSheetItem(characterId, "hp", 20, "max");

 
Custom Attributes

If you're getting or setting an attribute that was added via the API and doesn't actually exist on the sheet, you must prepend that attribute with user.. For example:

setSheetItem(characterId, "user.myCustomAttribute", "my custom value")
getSheetItem(characterId, "user.myCustomAttribute")

 
Updating Roll Parsing

The other thing that a lot of 5e scripts do that needs to be updated is parsing rolls. The rolls that are sent to chat are formatted completely differently, and will need to be parsed differently to get results or learn details about the content. The dev team has added some data attributes to the HTML that will minimize the need for extensive HTML parsing, but if you need more complex data you still may need to parse it out of the message sent to chat. We’ve outlined some common needs below to help get you started.

To get the result of a roll in our standard roll template:

const rollResultMatch = msg.content.match(/data-result="(.+?)"/);

To check what kind of roll it is based on the title:

const deathSaveMatch = msgContent.match(/header__title">Insert Header Here<\/div>/);

To check the subtitle of the roll to find out things like spell level or damage type:

const spellLevelMatch = msgContent.match(/header__subtitle">Level (.+?) /);

Because the 2024 sheet is still in active development, there’s a possibility that things will change with the roll templates that will require further updates to your scripts. We can’t make any promises that string parsing the HTML will stay stable forever, but we’re working towards more standardized templates as we develop the sheet further. The above examples are somewhat rigid in their regex for simplicity, but we recommend using fuzzy matching and wildcards to make your matching more robust while the roll templates are still in flux.
 
Common Problems

"Error: No attribute or sheet field found for character_id (YOUR ID HERE) named (YOUR ATTRIBUTE HERE)"

Likely cause: You are probably on the Default API instead of the Experimental API and are trying to access a Beacon computed property. When you click “Restart Server”, make sure that the API restart message includes the word EXPERIMENTAL and not DEFAULT. If the dropdown is set to Experimental but the restart logs say DEFAULT, switch back to Default, restart, and then switch back to Experimental and restart again. This is a known issue with swapping between Default and Experimental that we’re currently investigating.

Result of getSheetItem is logging an empty object instead of a value

Likely cause: not awaiting or using .then on the getSheetItem function. You have to wait for the value to return before moving forward with the code.