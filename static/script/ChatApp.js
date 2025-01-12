const { useState, useEffect } = React;

const CHAT_REFRESH_INTERVAL = 200;

function ChatApp(props) {

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [newMessage, setNewMessage] = useState(new Message("", "", Date.now(), "", ""));
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isUserLogged, setIsUserLogged] = useState(props.isUserLogged || false);
  const [userId, setUserId] = useState("");

  // Carica lo UserId e verifica che l'utente sia loggato
  useEffect(() => {
   
    const verifyLogin = async () => {
      try {
        const isLoggedIn = await checkUserLogin();
        if (!isLoggedIn) {
          window.location.href = window.loginUrl;
          return;
        }
        setIsUserLogged(true);
        const currentUserId = await getCurrentUserId();
        if (currentUserId == "") throw new Error('Failed to get user ID');
        setUserId(currentUserId);
      } catch (error) {
        console.error('Error verifying login:', error);
        window.location.href = window.loginUrl;
      }
      
    };

    const initialize = async () => {
      await verifyLogin();
    };


    initialize();
  }, []);

  // Carica Chat e Messaggi la prima volta
  useEffect(() => {

    if (userId) {
      loadChats();
    }
  }, [userId]);

  // Codice per aggiornare la notifica nella chat selezionata
  useEffect(() => {
    
    if (!selectedChat) return;

    selectedChat.hasNotify = false;
    scrollToChatBottom();
    
  }, [selectedChat]);

  // Codice per aggiornare la chat (polling)
  useEffect(() => {
    setTimeout(async () => { 
      
      // Carica le chat dal backend
      let newChat = await loadChats();
      
      // Se loadChats restituisce una lista vuota significa che le chat non sono cambiate (o che sono vuote)
      if (newChat != undefined && newChat.length > 0) {

        // Questa variabile ci servirà in seguito per capire se scrollare o no
        let willScroll = false;

        // Trova le chat con messaggi non letti
        newChat.map(chat => {
              
          // Prendi la chat "vecchia" corrispondente a chat dalla lista non aggiornato chats
          let oldChat = chats.find(c => c.id == chat.id);

          // Se la chat vecchia non esiste, esci
          if (!oldChat) {
            return;
          }

          // Se la chat ha la notifica attiva, aggiorna la chat mantenendo la notifica e non è selezionata
          if (oldChat.hasNotify && chat.id != selectedChatId) {
            chat.hasNotify = true;
            return;
          }

          // Prendi l'ultimo messaggio della chat vecchia e di quella nuova
          let oldChatLastMessage = oldChat.messages.at(-1);
          let newChatLastMessage = chat.messages.at(-1);

          // Se l'ultimo messaggio arrivato è diverso da quello in chat, imposta la chat come modificata
          if (chat.messages.length > 0 && (!oldChatLastMessage || oldChatLastMessage.id != newChatLastMessage.id)) {
            // Se la chat non è selezionata e l'ultimo messaggio mandato non è dell'utente, impostala come modificata
            if (chat.id != selectedChatId && newChatLastMessage.userId != userId) chat.hasNotify = true;
            // Se la chat è selezionata, scrollToChatBottom
            else willScroll = true;
          }
        });

        // Ordina le chat in base al timestamp dell'ultimo messaggio,
        let orderedChats = sortChats(newChat);
                
        // Aggiorna chats con le nuove chat
        setChats(orderedChats);

        // Se è stata modificata la chat selezionata, scrollToChatBottom
        if (willScroll) scrollToChatBottom();

      }

      // Inizia il prossimo ciclo di polling modificando il refreshCounter
      setRefreshCounter(prev => prev + 1);

    }, CHAT_REFRESH_INTERVAL);
  }, [refreshCounter]);


  const sortChats = (unorderedChats) => {

    return [...unorderedChats].sort((chat1, chat2) => {

      const lastMsg1 = chat1.messages.at(-1);
      const lastMsg2 = chat2.messages.at(-1);
      
      // Se non ci sono messaggi, metti la chat vuota in fondo
      if (!lastMsg1) return 1;
      if (!lastMsg2) return -1;
      
      // Convertiamo le date in timestamp e confrontiamo
      return new Date(lastMsg2.timestamp) - new Date(lastMsg1.timestamp);
    });
  }


  const loadChatMessages = async (chatId) => {
    try {
      const response = await sendHttpRequest(`/chat/${chatId}`);
      if (response.success) {
        const messageList = response.messages.map(msg => 
          new Message(msg.id, msg.content, msg.sendDateTime, msg.userId, msg.chatId)
        );
        return messageList;
      } else {
        throw new Error(response.message || 'Failed to load chat messages');
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];  // o throw error, dipende da come vuoi gestire gli errori
    }
  };

  const loadChats = async () => {

    if (!userId) return;

    try {

      const response = await sendHttpRequest('/userChat/' + userId);
      if (response.success) {          
        const chatsWithMessages = await Promise.all(
          response.chats.map(async chat => {
            const messages = await loadChatMessages(chat.id);
            return new Chat(chat.id, chat.name, messages, false);
          })
        );

        // Se le chat non sono cambiate, ritorna un array vuoto
        if (JSON.stringify(chats) == JSON.stringify(chatsWithMessages)) return [];
        else return chatsWithMessages;

      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const clearInputText = () => {
    document.getElementById("textInput").value = "";
  };

  const scrollToChatBottom = () => {
    setTimeout(() => {
      const chatContent = document.getElementById("chatContent");
      chatContent.scrollTop = chatContent.scrollHeight;
    }, 10);
  };

  const addMessageToChat = (chatId, newMessage) => {
    // Aggiungi il messaggio alla chat selezionata
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId ? new Chat(chat.id, chat.name, [...chat.messages, newMessage], false) : chat
      )
    );

    setChatOnTop(chatId);

    scrollToChatBottom();
  };

  const setChatOnTop = (chatId) => {
    // Sposta la chat in cima alla lista
    setChats((prevChats) => {
      const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);
      const chat = prevChats.splice(chatIndex, 1)[0];
      return [chat, ...prevChats];
    });
  };

  const sendMessage = (message) => {
    try {
      sendHttpRequest('/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          content: message.content,
          sendDateTime: message.timestamp,
          senderId: userId,
          chatId: message.chatId
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.content.trim() && selectedChatId !== null) {
      sendMessage(newMessage);
      //addMessageToChat(selectedChatId, newMessage);
      setNewMessage(new Message("", "", Date.now(), "", ""));    
      clearInputText();
    }
  };

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleSearchUser = async (username) => {

      // fai la richiesta GET per ottenere il profilo dell'utente
      let userResponse = await getUserProfile(username);
      
      // se l'utente non esiste, non fare nulla
      if (userResponse == null) {

          // Aggiungi classe CSS per animazione di shake alla barra di ricerca
          let submitBtn = document.getElementById("userSearchBar");
          submitBtn.classList.add("shakeElement");
          setTimeout(() => {  submitBtn.classList.remove("shakeElement"); }, 1000); 

          // Mostra messaggio di errore
          let errorMessage = document.getElementById("userSearchBarError");
          errorMessage.innerText = "Utente non trovato";
          setTimeout(() => {  errorMessage.innerText = "" }, 1000); 
          return;
      }
      // se l'utente esiste, prendi la chat corrispondente e aggiungila alla lista delle chat
      else {
          // richiedi la chat tra l'utente corrente e quello trovato, se non esiste, creala
          let chatId = await getChat(userId, userResponse.id);
          
          // se chatId è null, c'è stato un errore
          if (chatId == null) {
              console.error('Errore durante la creazione della chat');
              return;
          }
          setChats((prevChats) => [...prevChats, new Chat(chatId, userResponse.username, [], false)]);

          // seleziona automaticamente la chat appena aggiunta
          setSelectedChatId(chatId);
      }
  }


  const searchUser = () => {

    // Ottieni l'username dall'input
    let username = document.getElementById("user-search-input").value;

    // Se l'input è vuoto, esci
    if (username == "") return;

    // Se l'utente cerca una chat già presente nella chatlist, selezionala
    if (chats.find(chat => chat.name === username)) {
      setSelectedChatId(chats.find(chat => chat.name === username).id);
      return;
    }

    // pulisci l'input
    document.getElementById("user-search-input").value = "";

    // Cerca l'utente
    handleSearchUser(username);
  };

  return (
    <div id="root">
      <Header isUserLogged={isUserLogged}/>
      {/* Lista delle chat */}
      <div id="chatList">
        <div id="userSearchBarContainer">
          <div id="userSearchBar">
            <div className="input-group">
              <div className="input-group input-button-container">
                <input 
                  className="user-search-input" 
                  type="text" defaultValue="" 
                  placeholder="Cerca un utente..." 
                  id="user-search-input" onKeyDown={(e) => { if (e.key === 'Enter') searchUser(); }} 
                />
                <button className="btn search-button" type="button" onClick={searchUser}>
                    <i className="bi bi-search user-search-icon"></i>
                </button>
              </div>
            </div>
          </div>
          <div id="userSearchBarError"></div>
        </div>
        {chats.map((chat) => (
          <ChatElem
            key={chat.id}
            chat={chat}
            isSelected={chat.id === selectedChatId}
            hasNotify={chat.hasNotify}
            onClick={() => { setSelectedChatId(chat.id); scrollToChatBottom(); }}
          />
        ))}
      </div>

      {/* Chat selezionata */}
      <div id="selectedChatDiv">
        <div id="chatContent">
          {selectedChat ? (
            selectedChat.messages.map((msg, index) => (
              <MessageDiv
                key={index}
                message={msg.content}
                isSentByUser={msg.userId === userId}
                timestamp={msg.timestamp}
              />
            ))
          ) : (
            <p style={{ textAlign: "center", color: "gray" }}>
              Seleziona una chat per iniziare
            </p>
          )}
        </div>
        {/* Bottom Div */}
          {selectedChat ? (
            <div id="bottomDiv">
              <input
                id="textInput"
                type="text"
                value={newMessage.content}
                onChange={(e) => setNewMessage(new Message("", e.target.value, Date.now(), userId, selectedChatId))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Scrivi un messaggio..."
              />
              <button id="sendButton" onClick={handleSendMessage}>
                Invia
              </button>
            </div>
            ) : <div id="bottomDiv"></div>
          }
      </div>
    </div>
  );
}