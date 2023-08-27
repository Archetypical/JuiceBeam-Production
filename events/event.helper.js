const db = require("_helpers/db");


module.exports = {
    eventChecker,
};

//check the event Table for the next event
async function eventChecker() {
    let oldestEvent = await db.Event.findAll({
      limit: 1,
      order: [["createdAt", "ASC"]],
    });
  
    if (oldestEvent.length == 0) return "off";
    
    oldestEvent = oldestEvent[0];
    oldestEvent = await getEventById(oldestEvent.event_id);
  
    //return event name and the event's owner name if it has been turned on
    if (oldestEvent.isRunning == 'on') {
      return {name: oldestEvent.username, event: oldestEvent.eventname};
    }
    return "off";
  }

  async function getEventById(event_id) {
    const event = await db.Event.findByPk(event_id);
    if (!event) throw "Event not found";
    return event;
  }