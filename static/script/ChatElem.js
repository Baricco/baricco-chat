// Nel componente ChatElem
class ChatElem extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
          chat: props.chat,
          isSelected: props.isSelected || false,
      }
  }

  selectChat() { this.setState({ isSelected: true }); }
  deselectChat() { this.setState({ isSelected: false }); }

  formatMessage(msg) {
    if (msg.length > 50) return msg.slice(0, 50) + "...";
    return msg;
  }

  render() {
      const { chat, isSelected, onClick, onSelect, onDeselect, hasNotify } = this.props;
      return (
          <div
              className={`chat-elem${isSelected ? "-selected" : ""}`}
              onClick={() => {
                  onClick();
                  if (!isSelected) {
                      this.selectChat();
                      onSelect && onSelect();
                  } else {
                      this.deselectChat();
                      onDeselect && onDeselect();
                  }
              }}
          >
            <div className="chat-elem-content">
                <img
                    src={window.chatPicBaseUrl + chat.id}
                    alt="Foto profilo"
                    className="img-fluid mb-3 profile-image"
                    style={{ width: "7vh", height: "7vh", objectFit: "cover", margin: "-1vh 2vh" }}
                />
                <div style={{ display:"flex", flexDirection:"column" }}>
                    <strong>{chat.name}</strong>
                    <p className="chat-elem-last-message">{this.formatMessage(chat.lastMessage())}</p>
                </div>
            </div>
            <div 
                id="notify-icon" 
                className={hasNotify ? "hasNotify" : ""}
                style={{  }}
            ></div>
          </div>
      );
  }
}