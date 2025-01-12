class Message {

    constructor(id, content, timestamp, userId, chatId) {
        this.id = id;
        this.content = content;
        this.timestamp = timestamp === undefined ? Date.now() : timestamp;
        this.userId = userId;
        this.chatId = chatId;
    }

}