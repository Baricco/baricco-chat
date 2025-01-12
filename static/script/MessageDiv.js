class MessageDiv extends React.Component {
  
  render() {
    const { message, isSentByUser, timestamp } = this.props;

    const formattedDate = new Date(timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');


    return (
      <div className={`message-${isSentByUser ? "sent" : "received"}`}>
        <div className="messageContentDiv">{message}</div>
        <div className="messageTimeDiv">{formattedDate}</div>
      </div>
    );
  }
}
