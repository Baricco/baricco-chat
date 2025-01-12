class Chat {

    constructor(id, name, messages, hasNotify) {
        this.id = id;
        this.name = name;
        this.messages = messages;
        this.hasNotify = hasNotify;
    }

    addMessage(newMessage) { 
        if (!newMessage) return;
        this.messages.push(newMessage);
    } 

    lastMessage() { 
        return this.messages.length > 0 ? this.messages.at(-1).content : "";
    } 

}