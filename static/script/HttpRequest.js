function sendHttpRequest(endpoint, options = {}) {

    // Costruzione dell'URL completo
    const baseUrl = window.baseUrl;
    const url = `${baseUrl}${endpoint}`;

    const defaultOptions = {
      method: 'GET',
      credentials: 'include',
    };
    
    // Se non stiamo inviando FormData, aggiungi l'header Content-Type
    if (!(options.body instanceof FormData)) {
      defaultOptions.headers = {
          'Content-Type': 'application/json'
      };
    }

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };
  
  
    // Gestione del Body per richieste POST, stringificando l'oggetto JSON solo se non è FormData
    if (requestOptions.body && typeof requestOptions.body === 'object' && !(requestOptions.body instanceof FormData)) {
      requestOptions.body = JSON.stringify(requestOptions.body);
  }
  
    return fetch(url, requestOptions)
        .then(response => {
            // Se la risposta non è ok, reject la promise
            if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
            });
            }
            
            // Controlla se la risposta è JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
            return response.json();
            }
            
            return response.text();
        })
        .catch(error => {
            console.error('Request failed:', error);
            throw error;
        });
}


async function checkUserLogin() {
  try {
      const response = await sendHttpRequest('/checkLogin');
      return response.isLoggedIn;
  } catch (error) {
      console.error('Error checking login status:', error);
      return false;
  }
}

async function getCurrentUserId() {
  try {
      const response = await sendHttpRequest('/getCurrentUserId');
      return response.userId;
  } catch (error) {
      console.error('Error checking userId:', error);
      return "";
  }
}

async function getUserProfile(username="") {

  let requestUrl = '/userProfile';
  
  if (username) {
      requestUrl += `/${username}`;
  }

  try {
      const response = await sendHttpRequest(requestUrl);
      if (response.success) {
          return response.user;
      } else {
          throw new Error(response.message || 'Failed to load user profile');
      }
  } catch (error) {
      if (username) console.log('User: ' + username + ' doesn\'t exist');
      else console.error('Error loading user profile:', error);
      return null;
  }
};

async function getChat(userId1, userId2) {
  try {
      const response = await sendHttpRequest(`/chat/${userId1}/${userId2}`);
      if (response.success) {
          return response.chatId;
      } else {
          throw new Error(response.message || 'Failed to load chat');
      }
  } catch (error) {
      console.error('Error loading chat:', error);
      return null;
  }
}